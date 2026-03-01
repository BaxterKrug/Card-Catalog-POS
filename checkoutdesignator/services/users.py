from __future__ import annotations

from sqlmodel import Session, select

from ..auth import hash_password, verify_password
from ..exceptions import ValidationError
from ..models import User, UserRole
from ..schemas import UserCreate

DEFAULT_USER_NAME = "Baxter Krug"
DEFAULT_USER_TITLE = "Developer"
DEFAULT_USER_ROLE = UserRole.OWNER


def list_users(session: Session) -> list[User]:
    statement = select(User).order_by(User.name)
    return list(session.exec(statement).all())


def get_user_by_username(session: Session, username: str) -> User | None:
    statement = select(User).where(User.username == username)
    return session.exec(statement).one_or_none()


def create_user(session: Session, payload: UserCreate) -> User:
    if not payload.name or not payload.name.strip():
        raise ValidationError("User name is required")
    if not payload.username or not payload.username.strip():
        raise ValidationError("Username is required")
    if not payload.password or len(payload.password) < 4:
        raise ValidationError("Password must be at least 4 characters")
    
    # Check if username already exists
    existing = get_user_by_username(session, payload.username.lower())
    if existing:
        raise ValidationError(f"Username '{payload.username}' is already taken")
    
    data = payload.model_dump(exclude={"password"})
    data["username"] = payload.username.lower()
    data["password_hash"] = hash_password(payload.password)
    user = User(**data)
    session.add(user)
    session.flush()
    return user


def authenticate_user(session: Session, username: str, password: str) -> User | None:
    user = get_user_by_username(session, username.lower())
    if not user or not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def ensure_default_user(session: Session) -> User:
    statement = select(User).where(User.username == DEFAULT_USER_NAME.lower().replace(" ", "."))
    existing = session.exec(statement).one_or_none()
    if existing:
        return existing
    payload = UserCreate(
        name=DEFAULT_USER_NAME,
        username=DEFAULT_USER_NAME.lower().replace(" ", "."),
        password="dev123",
        role=DEFAULT_USER_ROLE,
        title=DEFAULT_USER_TITLE,
        is_active=True
    )
    return create_user(session, payload)
