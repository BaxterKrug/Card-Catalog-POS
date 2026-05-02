"""API router for store credit endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlmodel import Session

from ..api import raise_http_error
from ..auth import get_current_user
from ..dependencies import db_session
from ..exceptions import CardPosError
from ..models import (
    StoreCreditTransaction,
    StoreCreditTransactionType,
    User,
    UserRole,
)
from ..services import store_credit as store_credit_service

router = APIRouter(prefix="/customers", tags=["store-credit"])


class StoreCreditBalanceResponse(BaseModel):
    """Store credit balance response."""
    customer_id: int
    balance_cents: int
    balance_dollars: float = Field(description="Balance in dollars for display")


class StoreCreditAddRequest(BaseModel):
    """Request to add store credit manually."""
    amount_cents: int = Field(gt=0, description="Amount to add in cents")
    transaction_type: StoreCreditTransactionType
    notes: Optional[str] = None


class StoreCreditAdjustRequest(BaseModel):
    """Request to adjust store credit (positive or negative)."""
    amount_cents: int = Field(description="Amount to adjust in cents (positive to add, negative to remove)")
    notes: str = Field(min_length=1, description="Required notes explaining the adjustment")


@router.get("/{customer_id}/store-credit/balance", response_model=StoreCreditBalanceResponse)
def get_store_credit_balance(
    customer_id: int,
    session: Session = Depends(db_session),
) -> StoreCreditBalanceResponse:
    """Get the current store credit balance for a customer."""
    try:
        balance_cents = store_credit_service.get_credit_balance(session, customer_id)
        return StoreCreditBalanceResponse(
            customer_id=customer_id,
            balance_cents=balance_cents,
            balance_dollars=balance_cents / 100.0,
        )
    except CardPosError as exc:
        raise_http_error(exc)
        raise  # Ensure we re-raise to satisfy type checker


@router.get("/{customer_id}/store-credit/history", response_model=list[StoreCreditTransaction])
def get_store_credit_history(
    customer_id: int,
    limit: Optional[int] = None,
    session: Session = Depends(db_session),
) -> list[StoreCreditTransaction]:
    """Get the store credit transaction history for a customer."""
    try:
        return store_credit_service.get_credit_history(session, customer_id, limit)
    except CardPosError as exc:
        raise_http_error(exc)
        raise  # Ensure we re-raise to satisfy type checker


@router.post("/{customer_id}/store-credit/add", response_model=StoreCreditTransaction, status_code=201)
def add_store_credit(
    customer_id: int,
    payload: StoreCreditAddRequest,
    session: Session = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> StoreCreditTransaction:
    """
    Add store credit to a customer's account.
    Requires authentication. Use for gift cards, promotions, or manual additions.
    """
    # Only managers and owners can manually add credit (not for refunds/buylist - those are automatic)
    if payload.transaction_type == StoreCreditTransactionType.MANUAL_ADJUSTMENT:
        if current_user.role not in {UserRole.MANAGER, UserRole.OWNER}:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Only managers and owners can make manual adjustments")
    
    try:
        transaction = store_credit_service.add_store_credit(
            session=session,
            customer_id=customer_id,
            amount_cents=payload.amount_cents,
            transaction_type=payload.transaction_type,
            user_id=current_user.id or 1,
            notes=payload.notes,
        )
        session.commit()
        return transaction
    except CardPosError as exc:
        raise_http_error(exc)
        raise  # Ensure we re-raise to satisfy type checker


@router.post("/{customer_id}/store-credit/adjust", response_model=StoreCreditTransaction, status_code=201)
def adjust_store_credit(
    customer_id: int,
    payload: StoreCreditAdjustRequest,
    session: Session = Depends(db_session),
    current_user: User = Depends(get_current_user),
) -> StoreCreditTransaction:
    """
    Manually adjust store credit (positive or negative).
    Requires manager or owner role and mandatory notes.
    """
    # Only managers and owners can make manual adjustments
    if current_user.role not in {UserRole.MANAGER, UserRole.OWNER}:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only managers and owners can make manual adjustments")
    
    try:
        transaction = store_credit_service.adjust_store_credit(
            session=session,
            customer_id=customer_id,
            amount_cents=payload.amount_cents,
            user_id=current_user.id or 1,
            notes=payload.notes,
        )
        session.commit()
        return transaction
    except CardPosError as exc:
        raise_http_error(exc)
        raise  # Ensure we re-raise to satisfy type checker
