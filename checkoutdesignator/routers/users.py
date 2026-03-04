from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..api import raise_http_error
from ..auth import create_access_token, get_current_user
from ..dependencies import db_session
from ..exceptions import CardPosError, ValidationError
from ..models import User, UserRole
from ..schemas import LoginRequest, LoginResponse, PasswordChangeRequest, UserCreate, UserRead, UserUpdate
from ..services import users as user_service

router = APIRouter(prefix="/users", tags=["users"])


def _serialize_user(user) -> UserRead:
    return UserRead.model_validate(user)


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, session: Session = Depends(db_session)) -> LoginResponse:
    user = user_service.authenticate_user(session, payload.username, payload.password)
    if not user:
        raise ValidationError("Invalid username or password")
    token = create_access_token(data={"sub": user.username, "user_id": user.id, "role": user.role.value})
    return LoginResponse(user=_serialize_user(user), token=token)


@router.get("/", response_model=list[UserRead])
def list_users(session: Session = Depends(db_session)) -> list[UserRead]:
    rows = user_service.list_users(session)
    return [_serialize_user(row) for row in rows]


@router.post("/", response_model=UserRead, status_code=201)
def create_user(payload: UserCreate, session: Session = Depends(db_session)) -> UserRead:
    try:
        user = user_service.create_user(session, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return _serialize_user(user)


@router.patch("/{user_id}/password", response_model=UserRead)
def change_user_password(
    user_id: int,
    payload: PasswordChangeRequest,
    session: Session = Depends(db_session),
    current_user: User = Depends(get_current_user)
) -> UserRead:
    # Only owners can change passwords
    if current_user.role != UserRole.OWNER:
        raise ValidationError("Only owners can change user passwords")
    
    try:
        user = user_service.change_user_password(session, user_id, payload.new_password)
    except CardPosError as exc:
        raise_http_error(exc)
    return _serialize_user(user)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    session: Session = Depends(db_session),
    current_user: User = Depends(get_current_user)
) -> UserRead:
    # Only owners can update users
    if current_user.role != UserRole.OWNER:
        raise ValidationError("Only owners can update user information")
    
    try:
        user = user_service.update_user(session, user_id, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return _serialize_user(user)
