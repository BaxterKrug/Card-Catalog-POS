from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, desc
from pydantic import BaseModel

from ..database import get_session as db_session
from ..models import (
    CashRegisterSession,
    CashRegisterTransaction,
    CashRegisterTransactionType,
    utcnow,
)
from ..auth import get_current_user, User

router = APIRouter(prefix="/cash-register", tags=["cash_register"])


# Schemas
class CashRegisterSessionCreate(BaseModel):
    opening_balance_cents: int
    notes: str | None = None


class CashRegisterSessionRead(BaseModel):
    id: int
    opened_by_user_id: int
    opening_balance_cents: int
    current_balance_cents: int
    opened_at: str
    closed_at: str | None
    is_active: bool
    notes: str | None


class CashRegisterTransactionCreate(BaseModel):
    transaction_type: CashRegisterTransactionType
    amount_cents: int
    description: str
    reference_type: str | None = None
    reference_id: int | None = None
    notes: str | None = None


class CashRegisterTransactionRead(BaseModel):
    id: int
    session_id: int
    transaction_type: CashRegisterTransactionType
    amount_cents: int
    description: str
    reference_type: str | None
    reference_id: int | None
    created_by_user_id: int
    created_at: str
    notes: str | None


class CashRegisterDepositCreate(BaseModel):
    amount_cents: int
    notes: str | None = None


@router.get("/current-session", response_model=CashRegisterSessionRead | None)
def get_current_session(
    session: Session = Depends(db_session),
) -> CashRegisterSessionRead | None:
    """Get the currently active cash register session"""
    statement = select(CashRegisterSession).where(
        CashRegisterSession.is_active == True
    ).order_by(desc(CashRegisterSession.opened_at))
    
    active_session = session.exec(statement).first()
    
    if not active_session:
        return None
    
    return CashRegisterSessionRead(
        id=active_session.id or 0,
        opened_by_user_id=active_session.opened_by_user_id,
        opening_balance_cents=active_session.opening_balance_cents,
        current_balance_cents=active_session.current_balance_cents,
        opened_at=active_session.opened_at.isoformat(),
        closed_at=active_session.closed_at.isoformat() if active_session.closed_at else None,
        is_active=active_session.is_active,
        notes=active_session.notes,
    )


@router.post("/open-session", response_model=CashRegisterSessionRead, status_code=201)
def open_session(
    payload: CashRegisterSessionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(db_session),
) -> CashRegisterSessionRead:
    """Open a new cash register session"""
    # Check if there's already an active session
    statement = select(CashRegisterSession).where(
        CashRegisterSession.is_active == True
    )
    existing_session = session.exec(statement).first()
    
    if existing_session:
        raise HTTPException(
            status_code=400,
            detail="There is already an active cash register session. Close it before opening a new one."
        )
    
    # Create new session
    new_session = CashRegisterSession(
        opened_by_user_id=current_user.id or 0,
        opening_balance_cents=payload.opening_balance_cents,
        current_balance_cents=payload.opening_balance_cents,
        notes=payload.notes,
    )
    session.add(new_session)
    session.commit()
    session.refresh(new_session)
    
    # Create initial transaction for starting cash
    starting_transaction = CashRegisterTransaction(
        session_id=new_session.id or 0,
        transaction_type=CashRegisterTransactionType.STARTING_CASH,
        amount_cents=payload.opening_balance_cents,
        description="Opening balance",
        created_by_user_id=current_user.id or 0,
        notes=payload.notes,
    )
    session.add(starting_transaction)
    session.commit()
    
    return CashRegisterSessionRead(
        id=new_session.id or 0,
        opened_by_user_id=new_session.opened_by_user_id,
        opening_balance_cents=new_session.opening_balance_cents,
        current_balance_cents=new_session.current_balance_cents,
        opened_at=new_session.opened_at.isoformat(),
        closed_at=None,
        is_active=new_session.is_active,
        notes=new_session.notes,
    )


@router.post("/close-session", response_model=CashRegisterSessionRead)
def close_session(
    session: Session = Depends(db_session),
) -> CashRegisterSessionRead:
    """Close the current active cash register session"""
    statement = select(CashRegisterSession).where(
        CashRegisterSession.is_active == True
    )
    active_session = session.exec(statement).first()
    
    if not active_session:
        raise HTTPException(
            status_code=404,
            detail="No active cash register session found"
        )
    
    active_session.is_active = False
    active_session.closed_at = utcnow()
    session.add(active_session)
    session.commit()
    session.refresh(active_session)
    
    return CashRegisterSessionRead(
        id=active_session.id or 0,
        opened_by_user_id=active_session.opened_by_user_id,
        opening_balance_cents=active_session.opening_balance_cents,
        current_balance_cents=active_session.current_balance_cents,
        opened_at=active_session.opened_at.isoformat(),
        closed_at=active_session.closed_at.isoformat() if active_session.closed_at else None,
        is_active=active_session.is_active,
        notes=active_session.notes,
    )


@router.post("/deposit", response_model=CashRegisterTransactionRead, status_code=201)
def create_deposit(
    payload: CashRegisterDepositCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(db_session),
) -> CashRegisterTransactionRead:
    """Record a cash deposit (remove money from register to bank)"""
    # Get active session
    statement = select(CashRegisterSession).where(
        CashRegisterSession.is_active == True
    )
    active_session = session.exec(statement).first()
    
    if not active_session:
        raise HTTPException(
            status_code=404,
            detail="No active cash register session found. Please open a session first."
        )
    
    if payload.amount_cents > active_session.current_balance_cents:
        raise HTTPException(
            status_code=400,
            detail="Cannot deposit more than the current register balance"
        )
    
    # Create deposit transaction (negative amount)
    transaction = CashRegisterTransaction(
        session_id=active_session.id or 0,
        transaction_type=CashRegisterTransactionType.DEPOSIT,
        amount_cents=-payload.amount_cents,  # Negative because money is leaving
        description=f"Cash deposit to bank",
        created_by_user_id=current_user.id or 0,
        notes=payload.notes,
    )
    session.add(transaction)
    
    # Update session balance
    active_session.current_balance_cents -= payload.amount_cents
    session.add(active_session)
    
    session.commit()
    session.refresh(transaction)
    
    return CashRegisterTransactionRead(
        id=transaction.id or 0,
        session_id=transaction.session_id,
        transaction_type=transaction.transaction_type,
        amount_cents=transaction.amount_cents,
        description=transaction.description,
        reference_type=transaction.reference_type,
        reference_id=transaction.reference_id,
        created_by_user_id=transaction.created_by_user_id,
        created_at=transaction.created_at.isoformat(),
        notes=transaction.notes,
    )


@router.post("/transaction", response_model=CashRegisterTransactionRead, status_code=201)
def create_transaction(
    payload: CashRegisterTransactionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(db_session),
) -> CashRegisterTransactionRead:
    """Create a cash register transaction (for internal use)"""
    # Get active session
    statement = select(CashRegisterSession).where(
        CashRegisterSession.is_active == True
    )
    active_session = session.exec(statement).first()
    
    if not active_session:
        raise HTTPException(
            status_code=404,
            detail="No active cash register session found"
        )
    
    # Create transaction
    transaction = CashRegisterTransaction(
        session_id=active_session.id or 0,
        transaction_type=payload.transaction_type,
        amount_cents=payload.amount_cents,
        description=payload.description,
        reference_type=payload.reference_type,
        reference_id=payload.reference_id,
        created_by_user_id=current_user.id or 0,
        notes=payload.notes,
    )
    session.add(transaction)
    
    # Update session balance
    active_session.current_balance_cents += payload.amount_cents
    session.add(active_session)
    
    session.commit()
    session.refresh(transaction)
    
    return CashRegisterTransactionRead(
        id=transaction.id or 0,
        session_id=transaction.session_id,
        transaction_type=transaction.transaction_type,
        amount_cents=transaction.amount_cents,
        description=transaction.description,
        reference_type=transaction.reference_type,
        reference_id=transaction.reference_id,
        created_by_user_id=transaction.created_by_user_id,
        created_at=transaction.created_at.isoformat(),
        notes=transaction.notes,
    )


@router.get("/transactions", response_model=list[CashRegisterTransactionRead])
def get_transactions(
    session_id: int | None = None,
    session: Session = Depends(db_session),
) -> list[CashRegisterTransactionRead]:
    """Get cash register transactions"""
    statement = select(CashRegisterTransaction)
    
    if session_id:
        statement = statement.where(CashRegisterTransaction.session_id == session_id)
    
    statement = statement.order_by(desc(CashRegisterTransaction.created_at))
    transactions = session.exec(statement).all()
    
    return [
        CashRegisterTransactionRead(
            id=txn.id or 0,
            session_id=txn.session_id,
            transaction_type=txn.transaction_type,
            amount_cents=txn.amount_cents,
            description=txn.description,
            reference_type=txn.reference_type,
            reference_id=txn.reference_id,
            created_by_user_id=txn.created_by_user_id,
            created_at=txn.created_at.isoformat(),
            notes=txn.notes,
        )
        for txn in transactions
    ]
