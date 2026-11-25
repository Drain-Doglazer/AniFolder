from contextlib import contextmanager

from fastapi.testclient import TestClient
from psycopg.conninfo import conninfo_to_dict
from psycopg_pool import PoolClosed, PoolTimeout
import pytest

from app.config import Settings
from app.db import RecommendationStore, postgres_conninfo
from app.main import create_app


@pytest.mark.parametrize('driver', ['postgresql', 'postgres', 'postgresql+asyncpg', 'postgresql+psycopg'])
def test_serving_url_preserves_credentials_and_parameters(driver):
    parsed = conninfo_to_dict(postgres_conninfo(
        f'{driver}://user:p%2Basyncpg%3A%40@localhost/db?application_name=ml&sslmode=require'))
    assert parsed['password'] == 'p+asyncpg:@'
    assert parsed['dbname'] == 'db'
    assert parsed['application_name'] == 'ml'
    assert parsed['sslmode'] == 'require'


@pytest.mark.parametrize('error', [PoolTimeout, PoolClosed])
def test_pool_unavailability_is_503_without_details(error):
    class UnavailablePool:
        @contextmanager
        def connection(self):
            raise error('private database details')
            yield

    store = RecommendationStore('postgresql://test', pool=UnavailablePool())
    with TestClient(create_app(Settings(_env_file=None), store=store, trainer=lambda: {})) as client:
        for path in ['/health/readiness', '/internal/v1/recommendations/1']:
            response = client.get(path)
            assert response.status_code == 503
            assert response.json()['error']['code'] == 'DATABASE_UNAVAILABLE'
            assert 'private' not in response.text
        assert client.get('/health').status_code == 200
