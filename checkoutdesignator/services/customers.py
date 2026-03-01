from __future__ import annotations

from sqlmodel import Session, select

from ..exceptions import NotFoundError
from ..models import Customer, utcnow
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
