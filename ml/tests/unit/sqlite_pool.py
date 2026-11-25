"""Тестовый адаптер DB-API: исполняет SQL выдачи в SQLite вместо PostgreSQL.

Сам RecommendationStore и его запросы настоящие; меняется только соединение.
Жизненный цикл и восстановление реального psycopg-пула проверяются на PostgreSQL.
"""

from contextlib import closing, contextmanager
import re
import sqlite3

import psycopg

from app.db import RecommendationStore


class SQLiteConnection:
    def __init__(self, connection):
        self.connection = connection

    @contextmanager
    def execute(self, query, params=None):
        query = re.sub(r'%\((\w+)\)s', r':\1', query)
        with closing(self.connection.execute(query, params or {})) as cursor:
            yield cursor


class SQLitePool:
    def __init__(self, path):
        self.path = path

    @contextmanager
    def connection(self):
        try:
            with closing(sqlite3.connect(self.path)) as connection:
                connection.row_factory = sqlite3.Row
                yield SQLiteConnection(connection)
        except sqlite3.Error as exc:
            raise psycopg.DatabaseError('SQLite test database unavailable') from exc

    def close(self):
        pass


def sqlite_store(path):
    return RecommendationStore('postgresql://test', pool=SQLitePool(path))
