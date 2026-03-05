from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..api import raise_http_error
from ..auth import get_current_user, User
from ..dependencies import db_session
from ..exceptions import CardPosError
from ..models import Order, OrderItem, OrderPayment
from ..schemas import OrderCreate, OrderItemCreate, OrderStatusUpdate, OrderRead, OrderPaymentCreate, OrderPaymentRead
from ..services import orders as order_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/", response_model=list[OrderRead])
def list_orders(session: Session = Depends(db_session)) -> list[Order]:
    return order_service.list_orders(session)


@router.post("/", response_model=OrderRead, status_code=201)
def create_order(payload: OrderCreate, session: Session = Depends(db_session)) -> Order:
    try:
        order = order_service.create_order(session, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return order


@router.post("/{order_id}/items", response_model=OrderItem, status_code=201)
def add_item(order_id: int, payload: OrderItemCreate, session: Session = Depends(db_session)) -> OrderItem:
    try:
        item = order_service.add_order_item(session, order_id, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return item


@router.post("/{order_id}/submit", response_model=OrderRead)
def submit_order(order_id: int, session: Session = Depends(db_session)) -> Order:
    try:
        order = order_service.submit_order(session, order_id)
    except CardPosError as exc:
        raise_http_error(exc)
    return order


@router.post("/{order_id}/status", response_model=OrderRead)
def update_status(order_id: int, payload: OrderStatusUpdate, session: Session = Depends(db_session)) -> Order:
    try:
        order = order_service.update_order_status(session, order_id, payload.status)
    except CardPosError as exc:
        raise_http_error(exc)
    return order


@router.post("/{order_id}/payments", response_model=OrderPaymentRead, status_code=201)
def add_payment(
    order_id: int,
    payload: OrderPaymentCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(db_session)
) -> OrderPayment:
    try:
        payment = order_service.add_order_payment(session, order_id, payload, current_user.id or 1)
    except CardPosError as exc:
        raise_http_error(exc)
    return payment


@router.get("/{order_id}/payments", response_model=list[OrderPaymentRead])
def list_payments(order_id: int, session: Session = Depends(db_session)) -> list[OrderPayment]:
    try:
        payments = order_service.get_order_payments(session, order_id)
    except CardPosError as exc:
        raise_http_error(exc)
    return payments


@router.post("/{order_id}/recalculate", response_model=OrderRead)
def recalculate(order_id: int, session: Session = Depends(db_session)) -> Order:
    try:
        order = order_service.recalculate_order(session, order_id)
    except CardPosError as exc:
        raise_http_error(exc)
    return order


@router.post("/{order_id}/refund", response_model=OrderRead)
def refund_order(order_id: int, session: Session = Depends(db_session)) -> Order:
    try:
        order = order_service.refund_order(session, order_id)
    except CardPosError as exc:
        raise_http_error(exc)
    return order
