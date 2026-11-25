"""Проверки в чистом процессе: остальные тесты уже импортируют обучающий стек."""

import os
from pathlib import Path
import subprocess
import sys
import textwrap


def test_http_reads_do_not_import_training_stack(tmp_path):
    script = textwrap.dedent('''
        import importlib.abc
        import sys

        heavy = {'numpy', 'scipy', 'pandas', 'pyarrow', 'implicit', 'sqlalchemy'}

        class BlockTrainingImports(importlib.abc.MetaPathFinder):
            def find_spec(self, fullname, path=None, target=None):
                if fullname.split('.')[0] in heavy or fullname == 'app.training.train':
                    raise AssertionError(f'Unexpected training import: {fullname}')

        sys.meta_path.insert(0, BlockTrainingImports())
        import sqlite3
        from fastapi.testclient import TestClient
        from app.config import Settings
        from app.main import create_app
        sys.path.insert(0, 'tests/unit')
        from sqlite_pool import sqlite_store

        connection = sqlite3.connect(sys.argv[1])
        connection.execute('CREATE TABLE recommendations '
            '(user_id BIGINT, anime_id BIGINT, relevance REAL)')
        connection.execute('INSERT INTO recommendations VALUES (1, 42, 1.0)')
        connection.commit()

        # Без подмены trainer: проверяем настоящий путь инициализации приложения.
        with TestClient(create_app(Settings(_env_file=None), store=sqlite_store(sys.argv[1]))) as client:
            assert client.get('/health').status_code == 200
            assert client.get('/health/readiness').status_code == 200
            response = client.get('/internal/v1/recommendations/1')
            assert response.status_code == 200
            assert response.json() == [{'anime_id': 42, 'relevance': 1.0}]
            assert client.get('/internal/v1/train/status').json() == {'status': 'idle'}
            # Создание пула само не проверяет БД: readiness должна проверять.
            connection.execute('DROP TABLE recommendations')
            connection.commit()
            assert client.get('/health/readiness').status_code == 503
            assert client.get('/health').status_code == 200

        assert 'app.training.train' not in sys.modules
        assert not heavy.intersection(sys.modules)
        connection.close()
    ''')
    result = subprocess.run(
        [sys.executable, '-c', script, str(tmp_path / 'startup.db')],
        cwd=Path(__file__).resolve().parents[2],
        env={**os.environ, 'OPENBLAS_NUM_THREADS': '1'},
        capture_output=True, text=True, timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
