from fastapi import APIRouter, Depends
from sqlmodel import Session, select, desc
from pydantic import ConfigDict

from ..auth import get_current_user, User
from ..database import get_session as db_session
from ..exceptions import ValidationError
from ..models import (
    BuylistTransaction,
    CashRegisterSession,
    CashRegisterTransaction,
    CashRegisterTransactionType,
    PaymentMethod,
    StoreCreditTransactionType,
    utcnow,
)
from ..services import store_credit as store_credit_service

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
    model_config = ConfigDict(use_enum_values=True)
    
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
    payload: BuylistTransactionCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(db_session)
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

    # If payment is store credit, automatically add to customer's balance
    if payload.payment_method == PaymentMethod.STORE_CREDIT:
        store_credit_service.add_store_credit(
            session=session,
            customer_id=payload.customer_id,
            amount_cents=payload.amount_cents,
            transaction_type=StoreCreditTransactionType.BUYLIST_PAYOUT,
            user_id=current_user.id or 1,
            reference_type="buylist",
            reference_id=transaction.id or 0,
            notes=payload.notes or f"Buylist payout",
        )

    # If payment is cash, record it in the cash register (negative for money going out)
    elif payload.payment_method == PaymentMethod.CASH:
        statement = select(CashRegisterSession).where(
            CashRegisterSession.is_active == True
        ).order_by(desc(CashRegisterSession.opened_at))
        active_session = session.exec(statement).first()
        
        if active_session:
            # Create a transaction record for the buylist payout (negative amount)
            cash_txn = CashRegisterTransaction(
                session_id=active_session.id or 0,
                transaction_type=CashRegisterTransactionType.BUYLIST_PAYOUT,
                amount_cents=-payload.amount_cents,  # Negative because money is going out
                description=f"Buylist payout to customer {payload.customer_id}",
                reference_type="buylist",
                reference_id=transaction.id or 0,
                created_by_user_id=current_user.id or 1,
                notes=payload.notes,
            )
            session.add(cash_txn)
            
            # Update the session balance (subtract the payout)
            active_session.current_balance_cents -= payload.amount_cents
            session.add(active_session)
            session.commit()

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
    current_user: User = Depends(get_current_user),
    session: Session = Depends(db_session),
) -> BuylistTransactionRead:
    """Update a buylist transaction and adjust store credit or cash register accordingly"""
    transaction = session.get(BuylistTransaction, transaction_id)
    if not transaction:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Store original values to determine what adjustments are needed
    old_amount = transaction.amount_cents
    old_payment_method = transaction.payment_method
    old_customer_id = transaction.customer_id
    
    # Update fields if provided
    new_customer_id = payload.customer_id if payload.customer_id is not None else transaction.customer_id
    new_amount = payload.amount_cents if payload.amount_cents is not None else transaction.amount_cents
    new_payment_method = payload.payment_method if payload.payment_method is not None else transaction.payment_method
    
    # Handle store credit adjustments if payment method is/was store credit
    if old_payment_method == PaymentMethod.STORE_CREDIT:
        if new_payment_method == PaymentMethod.STORE_CREDIT:
            # Both old and new are store credit - adjust the difference
            if new_customer_id == old_customer_id and new_amount != old_amount:
                # Same customer, different amount - adjust by the difference
                adjustment = new_amount - old_amount
                if adjustment != 0:
                    store_credit_service.adjust_store_credit(
                        session=session,
                        customer_id=old_customer_id,
                        amount_cents=adjustment,
                        user_id=current_user.id or 1,
                        notes=f"Adjustment for buylist transaction #{transaction_id}: ${old_amount/100:.2f} -> ${new_amount/100:.2f}",
                    )
            elif new_customer_id != old_customer_id:
                # Customer changed - remove from old, add to new
                try:
                    store_credit_service.adjust_store_credit(
                        session=session,
                        customer_id=old_customer_id,
                        amount_cents=-old_amount,
                        user_id=current_user.id or 1,
                        notes=f"Removed due to buylist transaction #{transaction_id} transfer to another customer",
                    )
                except ValidationError:
                    pass  # Allow even if insufficient balance
                
                store_credit_service.add_store_credit(
                    session=session,
                    customer_id=new_customer_id,
                    amount_cents=new_amount,
                    transaction_type=StoreCreditTransactionType.BUYLIST_PAYOUT,
                    user_id=current_user.id or 1,
                    reference_type="buylist",
                    reference_id=transaction_id,
                    notes=f"Buylist payout (transferred from customer {old_customer_id})",
                )
        else:
            # Changed from store credit to cash - remove store credit
            try:
                store_credit_service.adjust_store_credit(
                    session=session,
                    customer_id=old_customer_id,
                    amount_cents=-old_amount,
                    user_id=current_user.id or 1,
                    notes=f"Removed due to buylist transaction #{transaction_id} payment method change to cash",
                )
            except ValidationError:
                pass  # Allow even if insufficient balance
            
            # Add cash register transaction
            statement = select(CashRegisterSession).where(
                CashRegisterSession.is_active == True
            ).order_by(desc(CashRegisterSession.opened_at))
            active_session = session.exec(statement).first()
            
            if active_session:
                cash_txn = CashRegisterTransaction(
                    session_id=active_session.id or 0,
                    transaction_type=CashRegisterTransactionType.BUYLIST_PAYOUT,
                    amount_cents=-new_amount,
                    description=f"Buylist payout to customer {new_customer_id} (converted from store credit)",
                    reference_type="buylist",
                    reference_id=transaction_id,
                    created_by_user_id=current_user.id or 1,
                    notes=payload.notes,
                )
                session.add(cash_txn)
                active_session.current_balance_cents -= new_amount
                session.add(active_session)
    
    elif old_payment_method == PaymentMethod.CASH:
        if new_payment_method == PaymentMethod.STORE_CREDIT:
            # Changed from cash to store credit - remove cash transaction and add store credit
            statement = select(CashRegisterTransaction).where(
                CashRegisterTransaction.reference_type == "buylist",
                CashRegisterTransaction.reference_id == transaction_id
            )
            cash_txn = session.exec(statement).first()
            
            if cash_txn:
                # Reverse the cash transaction
                cash_session = session.get(CashRegisterSession, cash_txn.session_id)
                if cash_session:
                    cash_session.current_balance_cents += old_amount
                    session.add(cash_session)
                session.delete(cash_txn)
            
            # Add store credit
            store_credit_service.add_store_credit(
                session=session,
                customer_id=new_customer_id,
                amount_cents=new_amount,
                transaction_type=StoreCreditTransactionType.BUYLIST_PAYOUT,
                user_id=current_user.id or 1,
                reference_type="buylist",
                reference_id=transaction_id,
                notes=f"Buylist payout (converted from cash)",
            )
        else:
            # Both old and new are cash - adjust cash register
            if new_amount != old_amount:
                statement = select(CashRegisterTransaction).where(
                    CashRegisterTransaction.reference_type == "buylist",
                    CashRegisterTransaction.reference_id == transaction_id
                )
                cash_txn = session.exec(statement).first()
                
                if cash_txn:
                    adjustment = new_amount - old_amount
                    # Update the original session balance
                    cash_session = session.get(CashRegisterSession, cash_txn.session_id)
                    if cash_session:
                        cash_session.current_balance_cents -= adjustment
                        session.add(cash_session)
                    
                    # Update the cash transaction amount
                    cash_txn.amount_cents = -new_amount
                    cash_txn.description = f"Buylist payout to customer {new_customer_id} (adjusted from ${old_amount/100:.2f})"
                    session.add(cash_txn)
    
    # Update the buylist transaction
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


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(db_session),
) -> None:
    """Delete a buylist transaction and reverse cash register or store credit entry if applicable"""
    from fastapi import HTTPException
    
    transaction = session.get(BuylistTransaction, transaction_id)
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # If payment was store credit, deduct it back from the customer's balance
    if transaction.payment_method == PaymentMethod.STORE_CREDIT:
        try:
            store_credit_service.adjust_store_credit(
                session=session,
                customer_id=transaction.customer_id,
                amount_cents=-transaction.amount_cents,  # Negative to remove credit
                user_id=current_user.id or 1,
                notes=f"Reversal of buylist transaction #{transaction_id}",
            )
        except ValidationError as e:
            # If customer doesn't have enough balance, we still allow deletion but note it
            # This could happen if they already spent the credit
            pass
    
    # If payment was cash, reverse the cash register transaction
    elif transaction.payment_method == PaymentMethod.CASH:
        # Find the cash register transaction linked to this buylist
        statement = select(CashRegisterTransaction).where(
            CashRegisterTransaction.reference_type == "buylist",
            CashRegisterTransaction.reference_id == transaction_id
        )
        cash_txn = session.exec(statement).first()
        
        if cash_txn:
            # Get the session this transaction belonged to
            cash_session = session.get(CashRegisterSession, cash_txn.session_id)
            if cash_session:
                # Reverse the transaction: add money back (since original was negative)
                cash_session.current_balance_cents += transaction.amount_cents
                session.add(cash_session)
            
            # Create a reversal transaction for audit trail
            statement = select(CashRegisterSession).where(
                CashRegisterSession.is_active == True
            ).order_by(desc(CashRegisterSession.opened_at))
            active_session = session.exec(statement).first()
            
            if active_session:
                reversal_txn = CashRegisterTransaction(
                    session_id=active_session.id or 0,
                    transaction_type=CashRegisterTransactionType.ADJUSTMENT,
                    amount_cents=transaction.amount_cents,  # Positive to add money back
                    description=f"Reversal of buylist transaction #{transaction_id}",
                    reference_type="buylist_reversal",
                    reference_id=transaction_id,
                    created_by_user_id=current_user.id or 1,
                    notes=f"Deleted buylist transaction",
                )
                session.add(reversal_txn)
            
            # Delete the original cash register transaction
            session.delete(cash_txn)
    
    # Delete the buylist transaction
    session.delete(transaction)
    session.commit()
