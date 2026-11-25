"""Два запроса выдачи через psycopg; SQLAlchemy остаётся в обучающем контуре."""

from fastapi import Request
from psycopg import Error
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool


class DatabaseUnavailable(RuntimeError):
    pass


def postgres_conninfo(database_url: str) -> str:
    # Заменяем только схему: пароль и query-параметры остаются без изменений.
    scheme, separator, rest = database_url.partition('://')
    if not separator or scheme not in {'postgresql', 'postgres', 'postgresql+asyncpg', 'postgresql+psycopg'}:
        raise ValueError('DATABASE_URL must be a PostgreSQL URL')
    return 'postgresql://' + rest


class RecommendationStore:
    def __init__(self, database_url: str, *, pool=None):
        self.pool = pool if pool is not None else ConnectionPool(
            postgres_conninfo(database_url),
            min_size=0, max_size=15, max_waiting=40, timeout=5,
            kwargs={'autocommit': True, 'connect_timeout': 5, 'row_factory': dict_row},
            check=ConnectionPool.check_connection, open=True,
            name='recommendations',
        )

    def _fetch(self, query: str, params=None) -> list[dict]:
        try:
            with self.pool.connection() as connection:
                with connection.execute(query, params) as cursor:
                    return [dict(row) for row in cursor.fetchall()]
        except Error as exc:
            # PoolTimeout/PoolClosed тоже наследуют psycopg.Error.
            raise DatabaseUnavailable() from exc

    def check_ready(self) -> None:
        self._fetch('SELECT user_id, anime_id, relevance FROM recommendations LIMIT 0')

    def recommendations(self, user_id: int, limit: int) -> list[dict]:
        return self._fetch(
            'SELECT anime_id, relevance FROM recommendations WHERE user_id = %(user_id)s '
            'ORDER BY relevance DESC, anime_id ASC LIMIT %(limit)s',
            {'user_id': user_id, 'limit': limit},
        )

    def close(self):
        self.pool.close()


def get_store(request: Request) -> RecommendationStore:
    return request.app.state.store
