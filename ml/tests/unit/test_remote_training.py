"""HTTP-контракт между лёгким сервисом выдачи и отдельным обучением."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from threading import Thread
from urllib.error import URLError

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, text

from app.config import Settings
from app.main import create_app
from sqlite_pool import sqlite_store


@pytest.fixture
def remote_client(tmp_path):
    state = {'code': 202, 'body': {'status': 'ok'}, 'calls': []}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            state['calls'].append((self.command, self.path))
            body = json.dumps(state['body']).encode()
            self.send_response(state['code'])
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body) + (10 if state.get('truncated') else 0)))
            self.end_headers()
            self.wfile.write(body)

        do_POST = do_GET

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    engine = create_engine(f'sqlite:///{tmp_path / "remote.db"}')
    with engine.begin() as connection:
        connection.execute(text('CREATE TABLE recommendations (user_id BIGINT, anime_id BIGINT, relevance REAL)'))
        connection.execute(text('INSERT INTO recommendations VALUES (1, 42, 1.0)'))
    config = Settings(_env_file=None, ml_training_url=f'http://127.0.0.1:{server.server_port}')
    try:
        with TestClient(create_app(config, store=sqlite_store(engine.url.database))) as client:
            yield client, state
    finally:
        engine.dispose()
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()


def test_remote_submission_conflict_and_status(remote_client):
    client, state = remote_client
    response = client.post('/internal/v1/train')
    assert response.status_code == 202
    assert response.json() == {'status': 'ok'}
    state.update(code=409, body={'error': {'code': 'TRAIN_ALREADY_RUNNING'}})
    assert client.post('/internal/v1/train').status_code == 409
    state.update(code=200, body={'status': 'succeeded', 'result': {'published': True}})
    response = client.get('/internal/v1/train/status')
    assert response.status_code == 200
    assert response.json() == state['body']
    assert state['calls'] == [
        ('POST', '/internal/v1/train'), ('POST', '/internal/v1/train'),
        ('GET', '/internal/v1/train/status'),
    ]


@pytest.mark.parametrize('code, body', [
    (500, {'error': 'secret database details'}), (200, {'status': 'ok'}),
    (202, []), (202, {'status': 'wrong'}), (409, {'error': None}),
])
def test_remote_failure_does_not_retry_or_disable_reads(remote_client, code, body):
    client, state = remote_client
    state.update(code=code, body=body)
    response = client.post('/internal/v1/train')
    assert response.status_code == 503
    assert response.json()['error']['code'] == 'TRAINING_UNAVAILABLE'
    assert 'secret' not in response.text
    assert state['calls'] == [('POST', '/internal/v1/train')]
    assert client.get('/health/readiness').status_code == 200
    assert client.get('/internal/v1/recommendations/1').json() == [{'anime_id': 42, 'relevance': 1.0}]


@pytest.mark.parametrize('body', [{'status': []}, {'status': 'unknown'}, None])
def test_invalid_remote_status_is_503(remote_client, body):
    client, state = remote_client
    state.update(code=200, body=body)
    response = client.get('/internal/v1/train/status')
    assert response.status_code == 503
    assert response.json()['error']['code'] == 'TRAINING_UNAVAILABLE'


def test_remote_network_error_is_503_without_retry(remote_client, monkeypatch):
    client, state = remote_client
    attempts = []

    def unavailable(*args, **kwargs):
        attempts.append(1)
        raise URLError('private connection details')

    monkeypatch.setattr(client.app.state.training.opener, 'open', unavailable)
    response = client.post('/internal/v1/train')
    assert response.status_code == 503
    assert 'private' not in response.text
    assert len(attempts) == 1
    assert client.get('/health').status_code == 200


@pytest.mark.parametrize('method, path, code, body', [
    ('POST', '/internal/v1/train', 202, {'status': 'ok'}),
    ('GET', '/internal/v1/train/status', 200, {'status': 'idle'}),
])
def test_truncated_remote_response_is_503_without_retry(remote_client, method, path, code, body):
    client, state = remote_client
    state.update(code=code, body=body, truncated=True)
    response = client.request(method, path)
    assert response.status_code == 503
    assert response.json()['error']['code'] == 'TRAINING_UNAVAILABLE'
    assert state['calls'] == [(method, path)]
    assert client.get('/health/readiness').status_code == 200


def test_startup_logs_separate_initialization_from_readiness(tmp_path, caplog):
    engine = create_engine(f'sqlite:///{tmp_path / "logs.db"}')
    with engine.begin() as connection:
        connection.execute(text('CREATE TABLE recommendations (user_id BIGINT, anime_id BIGINT, relevance REAL)'))
    caplog.set_level('INFO', logger='app.main')
    try:
        with TestClient(create_app(Settings(_env_file=None), store=sqlite_store(engine.url.database), trainer=lambda: {})) as client:
            assert 'imports=' in caplog.text and 'pool=' in caplog.text and 'lifespan=' in caplog.text
            assert 'database readiness not checked yet' in caplog.text
            assert 'first database readiness succeeded' not in caplog.text
            assert client.get('/health/readiness').status_code == 200
            assert client.get('/health/readiness').status_code == 200
            assert caplog.text.count('first database readiness succeeded') == 1
    finally:
        engine.dispose()
