"""Проверка access-токенов: допуск по времени против скачков системных часов.

Флака в полном сьюте: свежевыпущенный JWT иногда отклонялся с
INVALID_TOKEN, потому что iat с точностью до секунды оказывался «в
будущем», когда часы хоста между выдачей и проверкой дёргались назад
(NTP на VM). Регрессионные тесты фиксируют допуск и не-regression
по истёкшим токенам.
"""

from datetime import datetime, timedelta, timezone

import jwt
import pytest

from app.core import errors
from app.core.config import settings
from app.core.security import create_access_token, decode_access_token


def test_freshly_issued_token_decodes() -> None:
    assert decode_access_token(create_access_token(42)) == 42


def test_slightly_future_iat_still_decodes() -> None:
    """Часы хоста прыгнули назад на пару секунд: токен «из будущего» принимаем."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "7",
        "type": "access",
        "iat": now + timedelta(seconds=2),
        "exp": now + timedelta(seconds=900),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    assert decode_access_token(token) == 7


def test_expired_token_still_rejected() -> None:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "7",
        "type": "access",
        "iat": now - timedelta(seconds=1200),
        "exp": now - timedelta(seconds=60),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    with pytest.raises(errors.AppError) as exc_info:
        decode_access_token(token)
    assert exc_info.value.code == errors.TOKEN_EXPIRED


def test_leeway_does_not_resurrect_long_expired_token() -> None:
    """Допуск — секунды, не минуты: просроченный дольше leeway токен мёртв."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "7",
        "type": "access",
        "iat": now - timedelta(seconds=900),
        "exp": now - timedelta(seconds=60),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    with pytest.raises(errors.AppError) as exc_info:
        decode_access_token(token)
    assert exc_info.value.code == errors.TOKEN_EXPIRED
