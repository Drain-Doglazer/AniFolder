"""Передача команд одному внутреннему обучающему сервису без повторов POST."""

from http.client import HTTPException
import json
from urllib.error import HTTPError, URLError
from urllib.request import ProxyHandler, Request, build_opener


class TrainingUnavailable(RuntimeError):
    pass


class RemoteTraining:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        # Внутренний трафик Compose не направляем через HTTP_PROXY машины.
        self.opener = build_opener(ProxyHandler({}))

    def _request(self, path: str, method: str):
        request = Request(self.base_url + '/internal/v1/train' + path, method=method)
        try:
            try:
                response = self.opener.open(request, timeout=5)
            except HTTPError as exc:
                response = exc
            with response:
                code = response.code
                if code not in (200, 202, 409):
                    raise TrainingUnavailable()
                data = json.load(response)
            if not isinstance(data, dict):
                raise TrainingUnavailable()
            return code, data
        except (OSError, URLError, HTTPException, ValueError) as exc:
            # Тело ошибки/URL удалённого сервиса не попадает в публичную ошибку.
            raise TrainingUnavailable() from exc

    def submit(self):
        code, data = self._request('', 'POST')
        if code == 202 and data == {'status': 'ok'}:
            return True
        error = data.get('error')
        if code == 409 and isinstance(error, dict) and error.get('code') == 'TRAIN_ALREADY_RUNNING':
            return False
        raise TrainingUnavailable()

    def status(self):
        code, data = self._request('/status', 'GET')
        status = data.get('status')
        if code != 200 or not isinstance(status, str) or status not in {'idle', 'running', 'succeeded', 'failed'}:
            raise TrainingUnavailable()
        return data

    def close(self):
        # Сервис выдачи не управляет жизненным циклом удалённого задания.
        pass
