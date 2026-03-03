from fastapi import APIRouter, Depends
from sqlmodel import Session, select, desc

from ..database import get_session as db_session
from ..models import BuylistTransaction, PaymentMethod, utcnow

router = APIRouter(prefix="/buylist", tags=["buylist"])


# Schemas
from pydantic import BaseModel


class BuylistTransactionCreate(BaseModel):
    customer_id: int
    amount_cents: int
    payment_method: PaymentMethod
    notes: str | None = None


class BuylistTransactionUpdate(BaseModel):
    customer_id: int | None = None
    amount_cents: int | None = None
    payment_method: PaymentMethod | None = None
    notes: str | None = None


class BuylistTransactionRead(BaseModel):
    id: int
    customer_id: int
    amount_cents: int
    payment_method: PaymentMethod
    notes: str | None
    created_at: str


@router.get("/", response_model=list[BuylistTransactionRead])
def list_transactions(session: Session = Depends(db_session)) -> list[BuylistTransactionRead]:
    """List all buylist transactions"""
    statement = select(BuylistTransaction).order_by(desc(BuylistTransaction.id))
    transactions = session.exec(statement).all()
    return [
        BuylistTransactionRead(
            id=txn.id or 0,
            customer_id=txn.customer_id,
            amount_cents=txn.amount_cents,
            payment_method=txn.payment_method,
            notes=txn.notes,
            created_at=txn.created_at.isoformat(),
        )
        for txn in transactions
    ]


@router.post("/", response_model=BuylistTransactionRead, status_code=201)
def create_transaction(
    payload: BuylistTransactionCreate, session: Session = Depends(db_session)
) -> BuylistTransactionRead:
    """Create a new buylist transaction"""
    transaction = BuylistTransaction(
        customer_id=payload.customer_id,
        amount_cents=payload.amount_cents,
        payment_method=payload.payment_method,
        notes=payload.notes,
    )
    session.add(transaction)
    session.commit()
    session.refresh(transaction)

    return BuylistTransactionRead(
        id=transaction.id or 0,
        customer_id=transaction.customer_id,
        amount_cents=transaction.amount_cents,
        payment_method=transaction.payment_method,
        notes=transaction.notes,
        created_at=transaction.created_at.isoformat(),
    )


@router.patch("/{transaction_id}", response_model=BuylistTransactionRead)
def update_transaction(
    transaction_id: int,
    payload: BuylistTransactionUpdate,
    session: Session = Depends(db_session),
) -> BuylistTransactionRead:
    """Update a buylist transaction"""
    transaction = session.get(BuylistTransaction, transaction_id)
    if not transaction:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update fields if provided
    if payload.customer_id is not None:
        transaction.customer_id = payload.customer_id
    if payload.amount_cents is not None:
        transaction.amount_cents = payload.amount_cents
    if payload.payment_method is not None:
        transaction.payment_method = payload.payment_method
    if payload.notes is not None:
        transaction.notes = payload.notes
    
    transaction.updated_at = utcnow()
    session.add(transaction)
    session.commit()
    session.refresh(transaction)
    
    return BuylistTransactionRead(
        id=transaction.id or 0,
        customer_id=transaction.customer_id,
        amount_cents=transaction.amount_cents,
        payment_method=transaction.payment_method,
        notes=transaction.notes,
        created_at=transaction.created_at.isoformat(),
    )
