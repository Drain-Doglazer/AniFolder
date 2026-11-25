"""Запуск из ml/: uvicorn app.main:app --port 8001."""

from time import perf_counter

_IMPORT_STARTED = perf_counter()

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.recommendations import router
from app.config import Settings
from app.db import DatabaseUnavailable, RecommendationStore, get_store
from app.training.jobs import TrainingJobs
from app.training.remote import RemoteTraining, TrainingUnavailable

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None, *, store: RecommendationStore | None = None, trainer=None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        startup_started = perf_counter()
        owned_store = store is None
        config = settings if settings is not None else Settings()
        pool_started = perf_counter()
        app.state.store = store if store is not None else RecommendationStore(
            config.database_url
        )
        pool_seconds = perf_counter() - pool_started

        def train_on_demand():
            # Выдача читает готовые строки БД. Тяжёлый стек нужен только при train;
            # импорт выполняется в рабочем потоке задания, не при старте HTTP.
            from app.training.train import run_training
            from app.training.db import make_engine

            training_engine = make_engine(config.database_url)
            try:
                return run_training(training_engine, config)
            finally:
                training_engine.dispose()

        if trainer is None and config.ml_training_url is not None:
            app.state.training = RemoteTraining(str(config.ml_training_url))
            training_mode = 'remote'
        else:
            app.state.training = TrainingJobs(trainer if trainer is not None else train_on_demand)
            training_mode = 'local'
        app.state.readiness_logged = False
        logger.info(
            'ML startup: imports=%.3fs pool=%.3fs lifespan=%.3fs training=%s; '
            'database readiness not checked yet',
            _IMPORT_SECONDS, pool_seconds, perf_counter() - startup_started, training_mode,
        )
        try:
            yield
        finally:
            app.state.training.close()
            if owned_store:
                app.state.store.close()

    app = FastAPI(title="AniFolder Recommendation Service", version="0.1.0", lifespan=lifespan)
    app.include_router(router)

    @app.exception_handler(TrainingUnavailable)
    async def training_unavailable(request: Request, exc: TrainingUnavailable) -> JSONResponse:
        logger.warning('Training service unavailable or returned an invalid response')
        return JSONResponse(status_code=503, content={'error': {
            'code': 'TRAINING_UNAVAILABLE',
            'message': 'Сервис обучения недоступен; проверьте статус перед повторным запуском',
        }})

    @app.exception_handler(DatabaseUnavailable)
    async def database_error(request: Request, exc: DatabaseUnavailable) -> JSONResponse:
        # Не включаем SQL, параметры и DSN в ответ или лог.
        logger.error("ML database operation failed: %s", type(exc.__cause__).__name__)
        return JSONResponse(status_code=503, content={
            "error": {"code": "DATABASE_UNAVAILABLE", "message": "База рекомендаций недоступна"},
        })

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"error": {
            "code": "VALIDATION_ERROR", "message": "Некорректные параметры запроса",
            "details": [{"type": e["type"], "loc": e["loc"], "msg": e["msg"]} for e in exc.errors()],
        }})

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/health/readiness")
    def readiness(request: Request, store: RecommendationStore = Depends(get_store)) -> dict[str, str]:
        # Проверяем и соединение, и наличие требуемой таблицы/колонок.
        store.check_ready()
        if not request.app.state.readiness_logged:
            request.app.state.readiness_logged = True
            logger.info('ML startup: first database readiness succeeded at %.3fs since app import '
                        '(includes probe delay)', perf_counter() - _IMPORT_STARTED)
        return {"status": "ok"}

    return app


app = create_app()
_IMPORT_SECONDS = perf_counter() - _IMPORT_STARTED
