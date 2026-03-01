from checkoutdesignator.models import User, UserRole
from checkoutdesignator.schemas import UserCreate
from checkoutdesignator.services import users


def test_create_user(session):
    payload = UserCreate(name="Test User", username="testuser", password="testpass123", role=UserRole.EMPLOYEE, title="Clerk", email="test@example.com")
    created = users.create_user(session, payload)

    assert created.id is not None
    stored = session.get(User, created.id)
    assert stored is not None
    assert stored.name == "Test User"
    assert stored.username == "testuser"
    assert stored.role == UserRole.EMPLOYEE
    assert stored.title == "Clerk"
    assert stored.email == "test@example.com"


def test_ensure_default_user_is_idempotent(session):
    first = users.ensure_default_user(session)
    second = users.ensure_default_user(session)

    assert first.id == second.id
    assert first.username == "baxter.krug"
    assert first.role == UserRole.OWNER
