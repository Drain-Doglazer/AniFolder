"""SQLAlchemy нужен только pipeline обучения, загружается вместе с ним."""

from sqlalchemy import Engine, create_engine
from sqlalchemy.engine import make_url


def make_engine(database_url: str) -> Engine:
    url = make_url(database_url)
    if url.drivername in {'postgres', 'postgresql', 'postgresql+asyncpg'}:
        url = url.set(drivername='postgresql+psycopg')
    return create_engine(url, pool_pre_ping=True, connect_args={'connect_timeout': 5})
