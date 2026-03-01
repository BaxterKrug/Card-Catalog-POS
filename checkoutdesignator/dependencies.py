from collections.abc import Iterator

from sqlmodel import Session

from .database import get_session


def db_session() -> Iterator[Session]:
    yield from get_session()
