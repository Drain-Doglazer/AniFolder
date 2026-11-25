# Recommendation Service

Рабочий контур: данные сайта → ALS/cold-start → топ-50 в PostgreSQL → внутренний API
и `GET /api/v1/me/recommendations` backend. Backend добавляет карточки и исключает
актуальный список пользователя при каждом чтении. Frontend ещё использует свои
заглушки рекомендаций — переключение UI не входит в этот блок.

Исследовательские ноутбуки хранятся только локально в `ml/notebooks/` и не входят
в Git. Упоминания ноутбуков ниже относятся к локальным экспериментам; для запуска
сервиса и обучения они не нужны. Рабочий pipeline находится в `app/training/`,
параметры модели и ограничения исследования описаны ниже.

## Запуск рядом с backend

Минимальная версия Python — **3.12**, проверено на 3.12; Python 3.10 не поддерживается.
Нужен PostgreSQL со схемой backend. Инфраструктура, миграции и seed —
в `docs/database.md`. ML не создаёт схему и не импортирует каталог самостоятельно.
Из корня репозитория:

```bash
cd ml
python3.12 -m venv .venv  # если окружение ещё не создано
.venv/bin/python -m pip install -r requirements.txt
OPENBLAS_NUM_THREADS=1 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001 --workers 1 --log-config logging.json
```

Для venv без pip: `uv pip install --python .venv/bin/python -r requirements.txt`.
Для тестов/ноутбуков установите `requirements-dev.txt`. `requirements-service.txt`
фиксирует HTTP/DB-зависимости, но сам по себе недостаточен для обучения.
Backend запускается своим окружением на 8000: `uvicorn app.main:app --port 8000`.

Настройки: переменные окружения > `ml/.env` > `backend/.env` > dev-defaults.
Пути dotenv не зависят от cwd; пример — `ml/.env.example`.
`DATABASE_URL` backend с `postgresql+asyncpg` автоматически преобразуется в sync psycopg.

- `ML_ANILIST_DATA_DIR` — необязательный каталог parquet краулера. Если переменная
  не задана, обучение использует только сайт. Указанный отсутствующий каталог — ошибка.
- `ML_ARTIFACT_DIR` — отдельный каталог результатов, по умолчанию `ml/artifacts/service`.
- `ML_TRAINING_URL` — URL доверенного внутреннего обучающего сервиса. Если задан,
  POST train и GET статуса передаются ему; иначе обучение выполняется локально
  и нужны полные зависимости. В лёгком Docker-образе задан `http://ml-training:8001`.

```bash
curl http://127.0.0.1:8001/health/readiness
curl -X POST http://127.0.0.1:8001/internal/v1/train
curl http://127.0.0.1:8001/internal/v1/train/status
curl 'http://127.0.0.1:8001/internal/v1/recommendations/1?limit=20'
# Публичный маршрут: токен берётся из register/login backend.
curl -H "Authorization: Bearer $ACCESS_TOKEN" 'http://127.0.0.1:8000/api/v1/me/recommendations?limit=20'
```

## Обучение и публикация

`POST /internal/v1/train` реально запускает фоновое обучение и возвращает
`202 {"status":"ok"}` — это принятие задания, а не подтверждение его успеха.
Статус: `GET /internal/v1/train/status` → `idle`, `running`, `succeeded` (с результатом)
или `failed` (без SQL/DSN в ошибке). Повторный запрос во время работы → 409.
В режиме `ML_TRAINING_URL` адреса и форматы ответов сохраняются. Если обучающий
сервис выключен/недоступен или вернул некорректный ответ → 503 `TRAINING_UNAVAILABLE`.
Выдача рекомендаций и readiness от доступности обучения не зависят. POST не
повторяется автоматически: при сетевом сбое задание могло быть принято, поэтому
после восстановления связи сначала проверьте статус.

Один worker Uvicorn. Статус хранится в памяти до перезапуска, устойчивой очереди нет:
при аварийном завершении процесса задание нужно запустить заново. При штатном
завершении сервис дожидается текущего обучения. PostgreSQL advisory lock защищает
от одновременного обучения через CLI/другой процесс; такой конкурентный запуск
завершается ошибкой, а не вторым расчётом. Автоматическое расписание пока не настроено.

Стек обучения импортируется в рабочем потоке при первом `POST /internal/v1/train`.
Запуск HTTP, health/readiness и чтение рекомендаций не импортируют
pandas/numpy/scipy/implicit/pyarrow/SQLAlchemy и не читают датасеты или артефакт модели.
Первое задание включает стоимость импорта; следующие используют кэш модулей процесса.
Docker-цель `serving` содержит только `requirements-service.txt`; `training` — полный
`requirements.txt` и libgomp1. В Compose лёгкий сервис передаёт команды отдельному
обучающему контейнеру. Статус хранится в процессе обучения, а не в прокси выдачи.

Выдача использует psycopg и его пул: до 15 соединений, ожидание до 5 секунд,
не более 40 ожидающих запросов, проверка соединения перед использованием.
Соединения создаются по мере запросов и закрываются при завершении сервиса;
SELECT выполняются в autocommit, без оставленных открытых транзакций.
Ошибки PostgreSQL/закрытый или недоступный пул → 503 DATABASE_UNAVAILABLE.
Локальное обучение создаёт собственный SQLAlchemy engine только при запуске задания
и освобождает его после завершения, не занимая пул выдачи.

CLI из `ml/`:

```bash
# Обучение + файлы, без изменения recommendations:
OPENBLAS_NUM_THREADS=1 .venv/bin/python -m app.training.train
# Обучение + атомарная публикация в БД:
OPENBLAS_NUM_THREADS=1 .venv/bin/python -m app.training.train --write
```

1. Согласованный снимок сайта читается в PostgreSQL REPEATABLE READ: users,
   user_anime, anime/anime_stats, anime_genres. Далее read-транзакция закрывается.
2. При подключении AniList `anilist_id` переводится в `anime.id`; отсутствующие в
   каталоге тайтлы отбрасываются. Внешние user_id становятся отрицательными.
   В итоговом отчёте есть external_rows и matched_external_rows; при нулевом
   пересечении лог содержит предупреждение. Seed-каталог синтетический и с нашим
   реальным AniList-снимком не пересекается.
3. Фильтр 5/5, score_coef=0, planned=0.5, остальные веса прежние, оценки <5
   исключаются, без затухания. ALS: factors=64, alpha=5, regularization=0.1,
   iterations=20, seed=42, num_threads=4 — выбор по ноутбукам 04–08.
4. Без истории — all-time popularity. 1–4 записи или пользователь вне ALS —
   genre popularity за 28 дней, beta=1. Короткая выдача дополняется all-time,
   затем каталогом по anime_stats.in_lists_count (ничьи по anime.id). Это fallback
   для малых/пустых данных, отдельно от сравнения моделей в ноутбуках.
5. История на момент обучения исключается при формировании топ-50. Backend
   дополнительно исключает актуальную историю при чтении: это защищает от
   добавлений в список после обучения. Внутренний GET читает сохранённые строки.
6. Результаты рассчитываются для всех пользователей сайта, включая пользователей
   без списков. Внешним отрицательным user_id ничего не публикуется. Все замены
   проходят в одной транзакции: DELETE + INSERT; ошибка вставки откатывает DELETE.
   Удалённые во время обучения пользователи пропускаются, новые попадут в следующий запуск.

`relevance=1/rank` сохраняет порядок выдачи; это **не вероятность**.
`model_version=als-v1-<run id>` обозначает запуск общего ALS/cold-start pipeline.
Артефакты каждого запуска в отдельной папке: `als.npz` (если были данные для ALS),
`recommendations.json`, `summary.json`. ID тайтлов здесь принадлежат сайту; старый
`artifacts/final_evaluation/als_final.npz` с ID AniList напрямую в сервис не загружается.
Артефакты сохраняются до публикации; ошибка их создания не меняет БД. При сбое после
коммита БД её model_version — источник истины: manifest может остаться с published=false.
Ошибка обновления manifest отражается в результате как manifest_update_failed.

## HTTP-контракт

| Метод и путь | Результат |
|---|---|
| `GET /health` | 200 без обращения к БД |
| `GET /health/readiness` | 200 при доступной таблице рекомендаций, иначе 503 |
| `GET /internal/v1/recommendations/{user_id}?limit=20` | `[{"anime_id":42,"relevance":1.0}]` |
| `POST /internal/v1/train` | 202; параллельный запрос — 409; недоступное удалённое обучение — 503 |
| `GET /internal/v1/train/status` | Статус последнего задания в процессе обучения; недоступный удалённый сервис — 503 |
| Backend `GET /api/v1/me/recommendations?limit=20` | Массив `{anime_id,relevance,anime:AnimeCard}` по Bearer-токену |

user_id положительный bigint, limit 1..50 (default 20). Сортировка relevance DESC,
anime_id ASC; нет строк → `[]`. Внутренний GET не проверяет существование пользователя
отдельно. Ошибки параметров → 422; SQL-сбой ML → 503 DATABASE_UNAVAILABLE.
Публичный backend использует существующую авторизацию и общий формат ошибок.
Фильтрация текущего user_anime в SQL выполняется до LIMIT, без кэша устаревшей выдачи.

## Docker Compose

```bash
docker compose -f docker-compose.dev.yml -f docker-compose.ml.yml up -d --build ml
# Порт ML не опубликован: проверка из контейнера.
docker compose -f docker-compose.dev.yml -f docker-compose.ml.yml exec ml python -c \
  "import urllib.request; print(urllib.request.urlopen('http://localhost:8001/health/readiness').read().decode())"

# Для обучения явно поднимаем тяжёлый сервис (профиль training):
docker compose -f docker-compose.dev.yml -f docker-compose.ml.yml --profile training up -d --build ml ml-training
# Старый адрес POST /train на ml сохранён: он передаст команду ml-training.
docker compose -f docker-compose.dev.yml -f docker-compose.ml.yml exec ml python -c \
  "import urllib.request; print(urllib.request.urlopen(urllib.request.Request('http://localhost:8001/internal/v1/train', method='POST')).read().decode())"

# Альтернатива HTTP: одноразовый запуск CLI в обучающем образе (БД уже запущена).
docker compose -f docker-compose.dev.yml -f docker-compose.ml.yml --profile training run --rm --no-deps ml-training python -m app.training.train --write
```

Миграции/наполнение общей БД выполняются отдельно по docs/database.md.
Оба образа работают под непривилегированным пользователем. По умолчанию собирается
только лёгкий `serving`; контейнер обучения не является зависимостью выдачи.
Артефакты в named volume подключены только к `ml-training`. Он по умолчанию
обучается на данных сайта. Для внешнего датасета смонтируйте каталог read-only
в `ml-training` и задайте там ML_ANILIST_DATA_DIR. Само обучение не ускорялось;
его зависимости теперь устанавливаются только при сборке цели `training`.

**ML API предназначен только для доверенной внутренней сети.** Авторизации в нём
нет, в том числе на запуске обучения. В Compose порт доступен внутри сети,
без `ports` и внешнего маршрута nginx. Локальный запуск привязывайте к loopback.
При выносе за пределы доверенной сети сначала добавьте сервисную аутентификацию
и ограничение доступа; публиковать текущий API напрямую в Интернет нельзя.

## Проверки

Время старта измеряется снаружи процесса до ответа `/health/readiness`.
Это не время Docker-сборки или создания контейнера. Для поиска затрат импорта из `ml/`:
`OPENBLAS_NUM_THREADS=1 .venv/bin/python -X importtime -c 'from app.main import app'`.
Вторая колонка importtime включает вложенные импорты — их нельзя складывать повторно.
Создание пула само по себе не означает готовность БД;
readiness проверяет соединение и таблицу отдельным запросом.

В Docker включён `logging.json` (для локального Uvicorn используйте `--log-config`).
При старте выводятся `imports`, `pool`, `lifespan` в секундах и режим `training`.
Отдельная строка отмечает первую успешную проверку БД: время считается с начала
импорта приложения и включает задержку до probe. Это не время сборки образа
и не обещание готовности БД в момент создания пула. URL БД/обучения не логируются.

Из `ml/`: `OPENBLAS_NUM_THREADS=1 .venv/bin/python -m pytest -q`.
Автономные тесты API/pipeline используют временную SQLite: проверяют SQL-сортировку,
изоляцию пользователей, лимиты, cold/ALS, mapping, замену данных, откат ошибок и задания.

Публичный маршрут покрыт собираемыми pytest-тестами
`backend/tests/unit/test_recommendations.py`: авторизация, карточки, порядок,
лимиты и фильтрация всех статусов актуального списка до LIMIT без переобучения.
Из `backend/`: `python -m pytest tests/unit/test_recommendations.py -q`.
Используйте отдельный тестовый PostgreSQL: backend-фикстура пересоздаёт
`anifolder_test` на сервере из `DATABASE_URL`.

Полный PostgreSQL-тест — `tests/integration/recommendations_flow.py`. Нужна отдельная
**пустая** БД, имя заканчивается на `_ml_integration`, и два окружения Python 3.12
с ML/backend-зависимостями. Из корня:

```bash
TEST_DATABASE_URL=postgresql://anifolder:anifolder@localhost:5433/check_ml_integration \
OPENBLAS_NUM_THREADS=1 ml/.venv/bin/python tests/integration/recommendations_flow.py \
  --backend-python /absolute/path/to/backend/python
```

Для проверки пары Docker-сервисов добавьте `--ml-url http://127.0.0.1:<test-port>`.
Это должен быть выделенный тестовый `ml`, подключённый вместе с `ml-training`
к той же пустой БД `TEST_DATABASE_URL`. В этом режиме скрипт запускает только
backend, а оба ML-контейнера поднимаются и удаляются отдельно. Не используйте
URL общего стенда: сценарий запускает обучение и заменяет рекомендации.

Тест применяет настоящий Alembic и seed, запускает оба HTTP-сервиса, регистрирует
пользователей, вызывает train, проверяет авторизацию/выдачу/изменение списка,
PostgreSQL rollback и advisory lock. Сам БД не удаляет. Backend pytest/conftest,
который пересоздаёт anifolder_test, не используется.

## Отличия от раннего плана стыковки

Формат таблицы и ответов сохраняется. Cold-start выбран по реальным AniList-данным:
all-time без истории, genre28 beta=1 для короткой истории. Это отличается от
топ-3 жанров с оценками >=7 из S3; в PR нужно явно согласовать это с командой.
ALS уже исследована и сравнивалась по NDCG/recall/coverage, повторная разведка на
синтетическом seed не нужна. Качество на test имеет оговорку о ранее изученном EDA-периоде.
Исправления импорта каталога из PR #8 уже вошли в main: сопоставление AniList ID
с внутренними ID и сохранение курсора только после полного обхода. Сквозной тест
на seed проверяет интеграцию, а не качество рекомендаций на реальных пользователях;
полный импорт реального каталога в рамках этой ML-проверки не запускался.
