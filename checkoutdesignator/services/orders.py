from __future__ import annotations

from sqlmodel import Session, select

from ..exceptions import NotFoundError, ValidationError
from ..models import (
    AdjustmentReason,
    CashRegisterSession,
    CashRegisterTransaction,
    CashRegisterTransactionType,
    InventoryAdjustment,
    InventoryItem,
    Order,
    OrderItem,
    OrderPayment,
    OrderStatus,
    PaymentMethod,
    utcnow,
)
from ..schemas import OrderCreate, OrderItemCreate, OrderPaymentCreate
from .customers import get_customer_or_raise
from .inventory import get_item_or_raise, release_units, reserve_units


def create_order(session: Session, payload: OrderCreate) -> Order:
    get_customer_or_raise(session, payload.customer_id)
    order = Order(**payload.model_dump())
    session.add(order)
    session.flush()
    return order


def get_order_or_raise(session: Session, order_id: int) -> Order:
    order = session.get(Order, order_id)
    if not order:
        raise NotFoundError(f"Order {order_id} not found")
    return order


def list_orders(session: Session) -> list[Order]:
    statement = select(Order).order_by(getattr(Order, "created_at").desc())
    orders = list(session.exec(statement).all())
    # Explicitly load items and payments for each order
    for order in orders:
        _ = order.items
        _ = order.payments
    return orders


def add_order_item(session: Session, order_id: int, payload: OrderItemCreate) -> OrderItem:
    order = get_order_or_raise(session, order_id)
    if order.status != OrderStatus.DRAFT:
        raise ValidationError("Only draft orders can be edited")
    inventory_item = get_item_or_raise(session, payload.inventory_item_id)
    if order.id is None:
        raise ValidationError("Order must be persisted before adding items")
    if inventory_item.id is None:
        raise ValidationError("Inventory item must be persisted before being added to an order")
    unit_price = payload.unit_price_cents or inventory_item.unit_price_cents
    if unit_price < 0:
        raise ValidationError("Unit price must be >= 0")

    order_item = OrderItem(
        order_id=order.id,
        inventory_item_id=inventory_item.id,
        quantity=payload.quantity,
        unit_price_cents=unit_price,
    )
    session.add(order_item)
    session.flush()
    
    # Recalculate order totals after adding item
    items = _fetch_order_items(session, order.id)
    calculate_order_totals(order, items)
    session.add(order)
    session.flush()
    
    return order_item


def submit_order(session: Session, order_id: int) -> Order:
    order = get_order_or_raise(session, order_id)
    if order.status != OrderStatus.DRAFT:
        raise ValidationError("Only draft orders can be submitted")
    items = _fetch_order_items(session, order_id)
    if not items:
        raise ValidationError("Cannot submit an empty order")

    for item in items:
        reserve_units(session, item.inventory_item_id, item.quantity)

    order.status = OrderStatus.OPEN
    order.updated_at = utcnow()
    session.add(order)
    session.flush()
    # Load items for response
    _ = order.items
    return order


def update_order_status(session: Session, order_id: int, new_status: OrderStatus) -> Order:
    order = get_order_or_raise(session, order_id)
    current = order.status

    if new_status == OrderStatus.OPEN:
        raise ValidationError("Use submit endpoint to move into OPEN status")
    if current == OrderStatus.DRAFT and new_status not in {OrderStatus.CANCELLED}:
        raise ValidationError("Draft orders must be submitted before further transitions")

    if new_status == OrderStatus.CANCELLED:
        _release_allocations_for_order(session, order)
    elif new_status == OrderStatus.READY:
        if current not in {OrderStatus.OPEN}:
            raise ValidationError("Only open orders can move to ready")
    elif new_status == OrderStatus.PICKED_UP:
        if current not in {OrderStatus.OPEN, OrderStatus.READY}:
            raise ValidationError("Order must be open or ready before pickup")
        _finalize_pickup(session, order)

    order.status = new_status
    order.updated_at = utcnow()
    session.add(order)
    session.flush()
    # Load items for response
    _ = order.items
    return order


def _fetch_order_items(session: Session, order_id: int) -> list[OrderItem]:
    statement = select(OrderItem).where(OrderItem.order_id == order_id)
    return list(session.exec(statement).all())


def _release_allocations_for_order(session: Session, order: Order) -> None:
    if order.status not in {OrderStatus.OPEN, OrderStatus.READY}:
        return
    if order.id is None:
        raise ValidationError("Order must be persisted before releasing allocations")
    for item in _fetch_order_items(session, order.id):
        release_units(session, item.inventory_item_id, item.quantity)


def _finalize_pickup(session: Session, order: Order) -> None:
    if order.id is None:
        raise ValidationError("Order must be persisted before pickup")
    items = _fetch_order_items(session, order.id)
    for item in items:
        inventory_item = get_item_or_raise(session, item.inventory_item_id)
        if inventory_item.allocated_quantity < item.quantity:
            raise ValidationError("Allocated quantity mismatch during pickup")
        if inventory_item.physical_quantity < item.quantity:
            raise ValidationError("Physical stock too low to pick up order")
        if inventory_item.id is None:
            raise ValidationError("Inventory item must be persisted before pickup")
        release_units(session, inventory_item.id, item.quantity)
        inventory_item.physical_quantity -= item.quantity
        inventory_item.updated_at = utcnow()
        session.add(
            InventoryAdjustment(
                inventory_item_id=inventory_item.id,
                delta=-item.quantity,
                reason=AdjustmentReason.SALE,
                note=f"Order {order.id} pickup",
                actor="pos",
            )
        )
        session.add(inventory_item)


def calculate_order_totals(order: Order, items: list[OrderItem]) -> None:
    """Calculate and update order totals including tax and fees.
    
    Calculation order:
    1. Subtotal = sum of all items
    2. Discount = subtotal * discount_percent / 100
    3. After discount = subtotal - discount
    4. Tax = (subtotal - discount) * tax_rate_percent / 100
    5. Total = subtotal - discount + tax
    """
    # Calculate subtotal from items
    subtotal_cents = sum(item.quantity * item.unit_price_cents for item in items)
    order.subtotal_cents = subtotal_cents
    
    # Calculate discount
    discount_amount_cents = int(subtotal_cents * order.discount_percent / 100)
    order.discount_amount_cents = discount_amount_cents
    
    # Calculate after discount
    after_discount_cents = subtotal_cents - discount_amount_cents
    
    # Calculate tax on discounted amount
    tax_amount_cents = int(after_discount_cents * order.tax_rate_percent / 100)
    order.tax_amount_cents = tax_amount_cents
    
    # Calculate final total
    order.total_cents = after_discount_cents + tax_amount_cents
    order.updated_at = utcnow()


def recalculate_order(session: Session, order_id: int) -> Order:
    """Recalculate order totals based on current items and settings."""
    order = get_order_or_raise(session, order_id)
    items = _fetch_order_items(session, order_id)
    calculate_order_totals(order, items)
    session.add(order)
    session.flush()
    return order


def add_order_payment(session: Session, order_id: int, payload: OrderPaymentCreate, user_id: int = 1) -> OrderPayment:
    """Add a payment to an order."""
    order = get_order_or_raise(session, order_id)
    if order.id is None:
        raise ValidationError("Order must be persisted before adding payments")
    
    payment = OrderPayment(
        order_id=order.id,
        payment_method=payload.payment_method,
        amount_cents=payload.amount_cents,
        notes=payload.notes,
    )
    session.add(payment)
    session.flush()
    
    # If payment is cash, record it in the cash register
    if payload.payment_method == PaymentMethod.CASH:
        # Get the active cash register session
        statement = select(CashRegisterSession).where(
            CashRegisterSession.is_active == True
        ).order_by(CashRegisterSession.opened_at.desc())
        active_session = session.exec(statement).first()
        
        if active_session:
            # Create a transaction record for the sale
            transaction = CashRegisterTransaction(
                session_id=active_session.id or 0,
                transaction_type=CashRegisterTransactionType.SALE,
                amount_cents=payload.amount_cents,
                description=f"Order #{order_id} payment",
                reference_type="order",
                reference_id=order_id,
                created_by_user_id=user_id,
                notes=payload.notes,
            )
            session.add(transaction)
            
            # Update the session balance
            active_session.current_balance_cents += payload.amount_cents
            session.add(active_session)
            session.flush()
    
    # Recalculate totals
    items = _fetch_order_items(session, order_id)
    _ = order.payments  # Ensure payments are loaded
    calculate_order_totals(order, items)
    session.add(order)
    session.flush()
    
    return payment


def get_order_payments(session: Session, order_id: int) -> list[OrderPayment]:
    """Get all payments for an order."""
    statement = select(OrderPayment).where(OrderPayment.order_id == order_id)
    return list(session.exec(statement).all())


def get_order_payment_total(session: Session, order_id: int) -> int:
    """Calculate total amount paid for an order."""
    payments = get_order_payments(session, order_id)
    return sum(p.amount_cents for p in payments)


def refund_order(session: Session, order_id: int) -> Order:
    """
    Refund an order by marking it as REFUNDED.
    This releases allocations (if not already picked up) and returns items to inventory.
    """
    order = get_order_or_raise(session, order_id)
    
    # Can only refund orders that are OPEN, READY, or PICKED_UP
    if order.status not in {OrderStatus.OPEN, OrderStatus.READY, OrderStatus.PICKED_UP}:
        raise ValidationError(f"Cannot refund order with status {order.status}")
    
    items = _fetch_order_items(session, order_id)
    
    # If order was picked up, we need to return items to physical inventory
    if order.status == OrderStatus.PICKED_UP:
        for item in items:
            inv_item = get_item_or_raise(session, item.inventory_item_id)
            # Return to both physical and allocated
            inv_item.physical_quantity += item.quantity
            inv_item.allocated_quantity += item.quantity
            inv_item.updated_at = utcnow()
            session.add(inv_item)
            # Record the adjustment
            if inv_item.id is not None:
                session.add(
                    InventoryAdjustment(
                        inventory_item_id=inv_item.id,
                        delta=item.quantity,
                        reason=AdjustmentReason.RETURN,
                        note=f"Refund for order #{order_id}",
                        actor="system"
                    )
                )
    else:
        # If not picked up yet, just release allocations
        _release_allocations_for_order(session, order)
    
    # Mark order as refunded
    order.status = OrderStatus.REFUNDED
    order.updated_at = utcnow()
    session.add(order)
    session.flush()
    
    return order
