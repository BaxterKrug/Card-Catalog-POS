"""Authentication utilities for CheckoutDesignator."""

from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib

import jwt

from .config import get_settings

settings = get_settings()

# JWT configuration
SECRET_KEY = "dev-secret-key-change-in-production"  # TODO: Move to env var
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours


def hash_password(password: str) -> str:
    """Hash a plaintext password using SHA-256 (dev-only, replace with bcrypt in production)."""
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a hash."""
    return hash_password(plain) == hashed


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
