from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..api import raise_http_error
from ..dependencies import db_session
from ..exceptions import CardPosError
from ..models import Customer
from ..schemas import CustomerCreate, CustomerUpdate
from ..services import customers as customer_service

router = APIRouter(prefix="/customers", tags=["customers"])


@router.post("/", response_model=Customer, status_code=201)
def create_customer(payload: CustomerCreate, session: Session = Depends(db_session)) -> Customer:
    try:
        customer = customer_service.create_customer(session, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return customer


@router.get("/", response_model=list[Customer])
def list_customers(session: Session = Depends(db_session)) -> list[Customer]:
    return customer_service.list_customers(session)


@router.get("/{customer_id}", response_model=Customer)
def get_customer(customer_id: int, session: Session = Depends(db_session)) -> Customer:
    try:
        customer = customer_service.get_customer_or_raise(session, customer_id)
    except CardPosError as exc:
        raise_http_error(exc)
    return customer


@router.patch("/{customer_id}", response_model=Customer)
def update_customer(customer_id: int, payload: CustomerUpdate, session: Session = Depends(db_session)) -> Customer:
    try:
        customer = customer_service.update_customer(session, customer_id, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return customer
