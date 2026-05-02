"""Service layer for store credit operations."""
from __future__ import annotations

from typing import Optional
from sqlmodel import Session, select, desc

from ..exceptions import NotFoundError, ValidationError
from ..models import (
    Customer,
    StoreCreditTransaction,
    StoreCreditTransactionType,
    utcnow,
)


def get_credit_balance(session: Session, customer_id: int) -> int:
    """Get current store credit balance for a customer in cents."""
    customer = session.get(Customer, customer_id)
    if not customer:
        raise NotFoundError(f"Customer {customer_id} not found")
    return customer.store_credit_balance_cents


def get_credit_history(
    session: Session, customer_id: int, limit: Optional[int] = None
) -> list[StoreCreditTransaction]:
    """Get store credit transaction history for a customer."""
    customer = session.get(Customer, customer_id)
    if not customer:
        raise NotFoundError(f"Customer {customer_id} not found")
    
    statement = select(StoreCreditTransaction).where(
        StoreCreditTransaction.customer_id == customer_id
    ).order_by(desc(StoreCreditTransaction.created_at))
    
    if limit:
        statement = statement.limit(limit)
    
    return list(session.exec(statement).all())


def add_store_credit(
    session: Session,
    customer_id: int,
    amount_cents: int,
    transaction_type: StoreCreditTransactionType,
    user_id: int,
    reference_type: Optional[str] = None,
    reference_id: Optional[int] = None,
    notes: Optional[str] = None,
) -> StoreCreditTransaction:
    """
    Add store credit to a customer's account.
    
    Args:
        session: Database session
        customer_id: Customer ID
        amount_cents: Amount to add (must be positive)
        transaction_type: Type of transaction (REFUND, BUYLIST_PAYOUT, etc.)
        user_id: User ID of staff member making the change
        reference_type: Optional reference type (e.g., "order", "buylist")
        reference_id: Optional reference ID
        notes: Optional notes about the transaction
        
    Returns:
        Created StoreCreditTransaction
    """
    if amount_cents <= 0:
        raise ValidationError("Amount must be positive")
    
    # Verify customer exists
    customer = session.get(Customer, customer_id)
    if not customer:
        raise NotFoundError(f"Customer {customer_id} not found")
    
    # Create transaction record
    transaction = StoreCreditTransaction(
        customer_id=customer_id,
        transaction_type=transaction_type,
        amount_cents=amount_cents,  # Positive for additions
        reference_type=reference_type,
        reference_id=reference_id,
        created_by_user_id=user_id,
        notes=notes,
    )
    session.add(transaction)
    
    # Update customer balance
    customer.store_credit_balance_cents += amount_cents
    customer.updated_at = utcnow()
    session.add(customer)
    
    session.flush()
    return transaction


def deduct_store_credit(
    session: Session,
    customer_id: int,
    amount_cents: int,
    user_id: int,
    reference_type: Optional[str] = None,
    reference_id: Optional[int] = None,
    notes: Optional[str] = None,
) -> StoreCreditTransaction:
    """
    Deduct store credit from a customer's account (used for payments).
    
    Args:
        session: Database session
        customer_id: Customer ID
        amount_cents: Amount to deduct (must be positive)
        user_id: User ID of staff member making the change
        reference_type: Optional reference type (e.g., "order", "preorder")
        reference_id: Optional reference ID
        notes: Optional notes about the transaction
        
    Returns:
        Created StoreCreditTransaction
        
    Raises:
        ValidationError: If insufficient balance or invalid amount
    """
    if amount_cents <= 0:
        raise ValidationError("Amount must be positive")
    
    # Verify customer exists and has sufficient balance
    customer = session.get(Customer, customer_id)
    if not customer:
        raise NotFoundError(f"Customer {customer_id} not found")
    
    if customer.store_credit_balance_cents < amount_cents:
        balance_dollars = customer.store_credit_balance_cents / 100
        requested_dollars = amount_cents / 100
        raise ValidationError(
            f"Insufficient store credit balance. "
            f"Available: ${balance_dollars:.2f}, Requested: ${requested_dollars:.2f}"
        )
    
    # Create transaction record (negative amount for deduction)
    transaction = StoreCreditTransaction(
        customer_id=customer_id,
        transaction_type=StoreCreditTransactionType.PAYMENT_DEDUCTION,
        amount_cents=-amount_cents,  # Negative for deductions
        reference_type=reference_type,
        reference_id=reference_id,
        created_by_user_id=user_id,
        notes=notes,
    )
    session.add(transaction)
    
    # Update customer balance
    customer.store_credit_balance_cents -= amount_cents
    customer.updated_at = utcnow()
    session.add(customer)
    
    session.flush()
    return transaction


def adjust_store_credit(
    session: Session,
    customer_id: int,
    amount_cents: int,
    user_id: int,
    notes: Optional[str] = None,
) -> StoreCreditTransaction:
    """
    Manually adjust store credit (can be positive or negative).
    Staff use only - for corrections or manual additions.
    
    Args:
        session: Database session
        customer_id: Customer ID
        amount_cents: Amount to adjust (positive to add, negative to remove)
        user_id: User ID of staff member making the adjustment
        notes: Notes explaining the adjustment
        
    Returns:
        Created StoreCreditTransaction
    """
    if amount_cents == 0:
        raise ValidationError("Adjustment amount cannot be zero")
    
    # Verify customer exists
    customer = session.get(Customer, customer_id)
    if not customer:
        raise NotFoundError(f"Customer {customer_id} not found")
    
    # If negative adjustment, verify sufficient balance
    if amount_cents < 0:
        if customer.store_credit_balance_cents < abs(amount_cents):
            balance_dollars = customer.store_credit_balance_cents / 100
            requested_dollars = abs(amount_cents) / 100
            raise ValidationError(
                f"Insufficient store credit balance for negative adjustment. "
                f"Available: ${balance_dollars:.2f}, Requested: ${requested_dollars:.2f}"
            )
    
    # Create transaction record
    transaction = StoreCreditTransaction(
        customer_id=customer_id,
        transaction_type=StoreCreditTransactionType.MANUAL_ADJUSTMENT,
        amount_cents=amount_cents,
        reference_type=None,
        reference_id=None,
        created_by_user_id=user_id,
        notes=notes,
    )
    session.add(transaction)
    
    # Update customer balance
    customer.store_credit_balance_cents += amount_cents
    customer.updated_at = utcnow()
    session.add(customer)
    
    session.flush()
    return transaction
