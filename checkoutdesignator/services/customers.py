from __future__ import annotations

from sqlmodel import Session, select

from ..exceptions import NotFoundError, ValidationError
from ..models import Customer, Order, PreorderOrder, PreorderClaim, BuylistTransaction, utcnow
from ..schemas import CustomerCreate, CustomerUpdate


def create_customer(session: Session, payload: CustomerCreate) -> Customer:
    customer = Customer(**payload.model_dump())
    session.add(customer)
    session.flush()
    return customer


def update_customer(session: Session, customer_id: int, payload: CustomerUpdate) -> Customer:
    customer = session.get(Customer, customer_id)
    if not customer:
        raise NotFoundError(f"Customer {customer_id} not found")
    for field, value in payload.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(customer, field, value)
    customer.updated_at = utcnow()
    session.add(customer)
    session.flush()
    return customer


def list_customers(session: Session) -> list[Customer]:
    created_column = getattr(Customer, "created_at")
    statement = select(Customer).order_by(created_column.desc())
    return list(session.exec(statement).all())


def get_customer_or_raise(session: Session, customer_id: int) -> Customer:
    customer = session.get(Customer, customer_id)
    if not customer:
        raise NotFoundError(f"Customer {customer_id} not found")
    return customer


def delete_customer(session: Session, customer_id: int) -> None:
    customer = session.get(Customer, customer_id)
    if not customer:
        raise NotFoundError(f"Customer {customer_id} not found")
    
    # Check for related records that would prevent deletion
    related_records = []
    
    # Check for orders
    orders_count = len(session.exec(select(Order).where(Order.customer_id == customer_id)).all())
    if orders_count > 0:
        related_records.append(f"{orders_count} order(s)")
    
    # Check for preorder orders
    preorder_orders_count = len(session.exec(select(PreorderOrder).where(PreorderOrder.customer_id == customer_id)).all())
    if preorder_orders_count > 0:
        related_records.append(f"{preorder_orders_count} preorder order(s)")
    
    # Check for preorder claims
    preorder_claims_count = len(session.exec(select(PreorderClaim).where(PreorderClaim.customer_id == customer_id)).all())
    if preorder_claims_count > 0:
        related_records.append(f"{preorder_claims_count} preorder claim(s)")
    
    # Check for buylist transactions
    buylist_count = len(session.exec(select(BuylistTransaction).where(BuylistTransaction.customer_id == customer_id)).all())
    if buylist_count > 0:
        related_records.append(f"{buylist_count} buylist transaction(s)")
    
    if related_records:
        records_str = ", ".join(related_records)
        raise ValidationError(
            f"Cannot delete customer '{customer.name}' because they have related records: {records_str}. "
            "Please delete or reassign these records first."
        )
    
    session.delete(customer)
    session.flush()


def transfer_customer_records(session: Session, source_customer_id: int, target_customer_id: int) -> dict:
    """Transfer all records from source customer to target customer."""
    source_customer = session.get(Customer, source_customer_id)
    if not source_customer:
        raise NotFoundError(f"Source customer {source_customer_id} not found")
    
    target_customer = session.get(Customer, target_customer_id)
    if not target_customer:
        raise NotFoundError(f"Target customer {target_customer_id} not found")
    
    if source_customer_id == target_customer_id:
        raise ValidationError("Cannot transfer records to the same customer")
    
    # Track what we're transferring
    transferred = {
        "orders": 0,
        "preorder_orders": 0,
        "preorder_claims": 0,
        "buylist_transactions": 0,
    }
    
    # Transfer orders
    orders = session.exec(select(Order).where(Order.customer_id == source_customer_id)).all()
    for order in orders:
        order.customer_id = target_customer_id
        session.add(order)
        transferred["orders"] += 1
    
    # Transfer preorder orders
    preorder_orders = session.exec(select(PreorderOrder).where(PreorderOrder.customer_id == source_customer_id)).all()
    for preorder_order in preorder_orders:
        preorder_order.customer_id = target_customer_id
        session.add(preorder_order)
        transferred["preorder_orders"] += 1
    
    # Transfer preorder claims
    preorder_claims = session.exec(select(PreorderClaim).where(PreorderClaim.customer_id == source_customer_id)).all()
    for preorder_claim in preorder_claims:
        preorder_claim.customer_id = target_customer_id
        session.add(preorder_claim)
        transferred["preorder_claims"] += 1
    
    # Transfer buylist transactions
    buylist_transactions = session.exec(select(BuylistTransaction).where(BuylistTransaction.customer_id == source_customer_id)).all()
    for buylist_transaction in buylist_transactions:
        buylist_transaction.customer_id = target_customer_id
        session.add(buylist_transaction)
        transferred["buylist_transactions"] += 1
    
    session.flush()
    return transferred
