import pytest
from sqlmodel import Session, SQLModel, create_engine

from checkoutdesignator.database import get_settings


def build_test_engine():
    settings = get_settings()
    database_url = "sqlite://"
    connect_args = {"check_same_thread": False}
    return create_engine(database_url, connect_args=connect_args)


@pytest.fixture()
def session():
    engine = build_test_engine()
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session