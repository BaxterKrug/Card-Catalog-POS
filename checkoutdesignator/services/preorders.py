from __future__ import annotations

from datetime import datetime
from sqlalchemy import func, desc
from sqlmodel import Session, select

from ..exceptions import NotFoundError, ValidationError
from ..models import (
    AdjustmentReason,
    CashRegisterSession,
    CashRegisterTransaction,
    CashRegisterTransactionType,
    InventoryAdjustment,
    InventoryItem,
    PaymentMethod,
    PreorderClaim,
    PreorderClaimStatus,
    PreorderItem,
    PreorderOrder,
    utcnow,
)
from ..schemas import (
    PreorderClaimCreate,
    PreorderClaimFulfillRequest,
    PreorderClaimPaymentUpdate,
    PreorderClaimUpdate,
    PreorderItemCreate,
    PreorderItemCreateWithProduct,
    PreorderItemUpdate,
    PreorderReleaseRequest,
    PreorderSetCreate,
)
from .customers import get_customer_or_raise
from .inventory import reserve_units, release_units


def create_preorder_item(session: Session, payload: PreorderItemCreate) -> PreorderItem:
    inventory_item = session.get(InventoryItem, payload.inventory_item_id)
    if not inventory_item:
        raise NotFoundError(f"Inventory item {payload.inventory_item_id} not found")
    
    # Create preorder with separate inventory tracking
    preorder = PreorderItem(**payload.model_dump())
    session.add(preorder)
    session.flush()
    return preorder


def create_preorder_with_product(session: Session, payload: PreorderItemCreateWithProduct) -> PreorderItem:
    """Create a new preorder item along with its inventory item for unreleased products."""
    
    # First, create the inventory item for this unreleased product
    inventory_item = InventoryItem(
        sku=payload.sku,
        name=payload.product_name,
        game_title=payload.game_title,
        category=payload.category,
        msrp_cents=payload.msrp_cents,
        unit_price_cents=payload.msrp_cents or 0,  # Default to MSRP
        physical_quantity=0,  # No physical stock yet (unreleased)
        allocated_quantity=0,
    )
    session.add(inventory_item)
    session.flush()
    
    if not inventory_item.id:
        raise ValidationError("Failed to create inventory item")
    
    # Now create the preorder item linked to this inventory
    preorder = PreorderItem(
        inventory_item_id=inventory_item.id,
        release_date=payload.release_date,
        preorder_quantity=payload.preorder_quantity,
        notes=payload.notes,
    )
    session.add(preorder)
    session.flush()
    return preorder


def create_preorder_set(session: Session, payload: PreorderSetCreate) -> list[PreorderItem]:
    """Create multiple preorder items with shared game and release date.
    
    This is useful for setting up an entire product release at once (e.g., a new set release).
    """
    created_preorders = []
    
    for product in payload.products:
        # Create inventory item for each product
        inventory_item = InventoryItem(
            sku=product.sku,
            name=product.product_name,
            game_title=payload.game_title,  # Shared
            set_code=payload.set_code,  # Shared - set/series name
            category=payload.category,  # Shared
            msrp_cents=product.msrp_cents,
            unit_price_cents=product.msrp_cents or 0,
            physical_quantity=0,  # No physical stock yet
            allocated_quantity=0,
        )
        session.add(inventory_item)
        session.flush()
        
        if not inventory_item.id:
            raise ValidationError(f"Failed to create inventory item for {product.product_name}")
        
        # Create preorder item
        preorder = PreorderItem(
            inventory_item_id=inventory_item.id,
            release_date=payload.release_date,  # Shared
            preorder_quantity=product.preorder_quantity,
            notes=payload.notes,  # Shared
        )
        session.add(preorder)
        session.flush()
        created_preorders.append(preorder)
    
    return created_preorders


def update_preorder_item(session: Session, preorder_id: int, payload: PreorderItemUpdate) -> PreorderItem:
    """Update a preorder item's details."""
    preorder = session.get(PreorderItem, preorder_id)
    if not preorder:
        raise NotFoundError(f"Preorder item {preorder_id} not found")
    
    # Update preorder item fields
    update_data = payload.model_dump(exclude_unset=True, exclude={'msrp_cents', 'set_code'})
    for key, value in update_data.items():
        setattr(preorder, key, value)
    
    # Update inventory item fields if provided
    inventory_item = session.get(InventoryItem, preorder.inventory_item_id)
    if inventory_item:
        if payload.msrp_cents is not None:
            inventory_item.msrp_cents = payload.msrp_cents
            inventory_item.unit_price_cents = payload.msrp_cents  # Update unit price to match MSRP
        if payload.set_code is not None:
            inventory_item.set_code = payload.set_code
        session.add(inventory_item)
    
    preorder.updated_at = utcnow()
    session.add(preorder)
    session.flush()
    return preorder


def list_preorder_items(session: Session) -> list[PreorderItem]:
    statement = select(PreorderItem).order_by(getattr(PreorderItem, "created_at").desc())
    return list(session.exec(statement).all())


def list_preorder_claims(session: Session, is_paid: bool | None = None) -> list[PreorderClaim]:
    statement = select(PreorderClaim).order_by(getattr(PreorderClaim, "created_at").desc())
    
    # Filter by payment status if specified
    if is_paid is not None:
        statement = statement.where(PreorderClaim.is_paid == is_paid)
    
    return list(session.exec(statement).all())


def list_preorder_orders(session: Session) -> list[PreorderOrder]:
    """List all preorder orders with their associated claims."""
    statement = select(PreorderOrder).order_by(getattr(PreorderOrder, "created_at").desc())
    return list(session.exec(statement).all())


def _claimed_quantity(session: Session, preorder_item_id: int) -> int:
    """Get total quantity claimed across all customers for a preorder item."""
    stmt = (
        select(func.coalesce(func.sum(PreorderClaim.quantity_requested), 0))
        .where(PreorderClaim.preorder_item_id == preorder_item_id)
        .where(PreorderClaim.status != PreorderClaimStatus.CANCELLED)
    )
    result = session.exec(stmt).one()
    total = result[0] if isinstance(result, tuple) else result
    return int(total or 0)


def _customer_claimed_quantity(session: Session, preorder_item_id: int, customer_id: int) -> int:
    """Get total quantity claimed by a specific customer for a preorder item (across all orders)."""
    stmt = (
        select(func.coalesce(func.sum(PreorderClaim.quantity_requested), 0))
        .where(PreorderClaim.preorder_item_id == preorder_item_id)
        .where(PreorderClaim.customer_id == customer_id)
    )
    result = session.exec(stmt).one()
    total = result[0] if isinstance(result, tuple) else result
    return int(total or 0)


def create_preorder_claim(session: Session, payload: PreorderClaimCreate) -> PreorderClaim:
    preorder_item = session.get(PreorderItem, payload.preorder_item_id)
    if not preorder_item:
        raise NotFoundError("Preorder item not found")
    if preorder_item.id is None:
        raise ValidationError("Preorder item must be persisted before claiming")
    get_customer_or_raise(session, payload.customer_id)

    # Find or create PreorderOrder for this customer
    # Always reuse the customer's first order to keep all their preorders together
    preorder_order = session.exec(
        select(PreorderOrder)
        .where(PreorderOrder.customer_id == payload.customer_id)
        .limit(1)
    ).first()
    if not preorder_order:
        preorder_order = PreorderOrder(
            customer_id=payload.customer_id,
            status=PreorderClaimStatus.WAITING,
            notes=None
        )
        session.add(preorder_order)
        session.flush()
    
    if preorder_order.id is None:
        raise ValidationError("PreorderOrder must have an ID after flush")

    # Enforce limit: 1 unit per customer per product
    customer_claimed = _customer_claimed_quantity(session, preorder_item.id, payload.customer_id)
    if customer_claimed > 0:
        raise ValidationError(
            f"Customer has already ordered this product. Limit is 1 unit per customer per product."
        )
    
    # Force quantity to 1
    if payload.quantity_requested != 1:
        raise ValidationError("Customers can only order 1 unit per product.")

    # Check if enough preorder inventory is available
    if preorder_item.preorder_quantity > 0:
        available = preorder_item.preorder_quantity - preorder_item.preorder_quantity_allocated
        if payload.quantity_requested > available:
            raise ValidationError(f"Not enough preorder inventory available. Available: {available}, Requested: {payload.quantity_requested}")
    
    # Allocate from preorder inventory ONLY (do NOT touch main inventory)
    preorder_item.preorder_quantity_allocated += payload.quantity_requested
    preorder_item.updated_at = utcnow()
    session.add(preorder_item)

    claim = PreorderClaim(
        **payload.model_dump(), 
        preorder_order_id=preorder_order.id,
        quantity_allocated=payload.quantity_requested  # Auto-allocate since preorder is confirmed
    )
    session.add(claim)
    session.flush()
    return claim


def update_preorder_claim(session: Session, claim_id: int, payload: PreorderClaimUpdate) -> PreorderClaim:
    """Update a preorder claim."""
    claim = session.get(PreorderClaim, claim_id)
    if not claim:
        raise NotFoundError(f"Preorder claim {claim_id} not found")
    
    if claim.status == PreorderClaimStatus.FULFILLED:
        raise ValidationError("Cannot update fulfilled claims")
    
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(claim, key, value)
    
    claim.updated_at = utcnow()
    session.add(claim)
    session.flush()
    return claim


def cancel_preorder_claim(session: Session, claim_id: int) -> PreorderClaim:
    claim = session.get(PreorderClaim, claim_id)
    if not claim:
        raise NotFoundError("Preorder claim not found")
    if claim.status == PreorderClaimStatus.FULFILLED:
        raise ValidationError("Fulfilled claims cannot be cancelled")
    
    preorder_item = session.get(PreorderItem, claim.preorder_item_id)
    if not preorder_item:
        raise NotFoundError("Preorder item missing for claim")
    
    # If the claim was paid in cash, refund to cash register
    if claim.is_paid and claim.payment_method == PaymentMethod.CASH:
        # Find the current active cash register session
        stmt = (
            select(CashRegisterSession)
            .where(CashRegisterSession.is_active == True)
            .order_by(CashRegisterSession.opened_at.desc())
        )
        cash_session = session.exec(stmt).first()
        
        if cash_session and claim.payment_amount_cents:
            # Create an ADJUSTMENT transaction (negative amount subtracts from register)
            refund_txn = CashRegisterTransaction(
                session_id=cash_session.id,
                transaction_type=CashRegisterTransactionType.ADJUSTMENT,
                amount_cents=-claim.payment_amount_cents,  # Negative because money goes out
                description=f"Refund for cancelled preorder claim #{claim_id}",
                created_by_user_id=1,  # System user for automated refunds
            )
            session.add(refund_txn)
            
            # Update session balance (subtract the refund)
            cash_session.current_balance_cents -= claim.payment_amount_cents
            session.add(cash_session)
    
    # Release from preorder inventory allocation ONLY (do NOT touch main inventory)
    preorder_item.preorder_quantity_allocated -= claim.quantity_requested
    preorder_item.updated_at = utcnow()
    session.add(preorder_item)
    
    # Delete the claim instead of marking it as cancelled
    session.delete(claim)
    session.flush()
    
    # Return the claim data before deletion (for the response)
    return claim


def fulfill_preorder_claim(session: Session, claim_id: int, payload: PreorderClaimFulfillRequest) -> PreorderClaim:
    claim = session.get(PreorderClaim, claim_id)
    if not claim:
        raise NotFoundError("Preorder claim not found")
    preorder_item = session.get(PreorderItem, claim.preorder_item_id)
    if not preorder_item:
        raise NotFoundError("Preorder parent missing")

    if claim.quantity_allocated < claim.quantity_requested:
        raise ValidationError("Cannot fulfill claim that does not have enough allocated stock")

    # Simply mark the claim as fulfilled (picked up) - no inventory changes
    # Inventory reconciliation happens when the preorder phase is completed:
    # remaining inventory = allocation - fulfilled claims
    claim.status = PreorderClaimStatus.FULFILLED if payload.mark_picked_up else PreorderClaimStatus.ALLOCATED
    claim.updated_at = utcnow()
    session.add(claim)
    session.flush()
    return claim


def unfulfill_preorder_claim(session: Session, claim_id: int) -> PreorderClaim:
    """Unmark a preorder claim as picked up (revert from FULFILLED to ALLOCATED)."""
    claim = session.get(PreorderClaim, claim_id)
    if not claim:
        raise NotFoundError("Preorder claim not found")
    
    if claim.status != PreorderClaimStatus.FULFILLED:
        raise ValidationError("Claim is not marked as picked up")
    
    claim.status = PreorderClaimStatus.ALLOCATED
    claim.updated_at = utcnow()
    session.add(claim)
    session.flush()
    return claim


def record_preorder_payment(session: Session, claim_id: int, payload: PreorderClaimPaymentUpdate, user_id: int = 1) -> PreorderClaim:
    """Record payment for a preorder claim. Payment data is stored in perpetuity."""
    claim = session.get(PreorderClaim, claim_id)
    if not claim:
        raise NotFoundError(f"Preorder claim {claim_id} not found")
    
    if claim.status == PreorderClaimStatus.CANCELLED:
        raise ValidationError("Cannot record payment for cancelled claims")
    
    # Validate payment amount is reasonable
    if payload.payment_amount_cents < 0:
        raise ValidationError("Payment amount cannot be negative")
    
    # Record payment details (stored in perpetuity)
    claim.is_paid = payload.is_paid
    claim.payment_amount_cents = payload.payment_amount_cents
    claim.payment_method = payload.payment_method
    claim.payment_date = utcnow()
    claim.payment_notes = payload.payment_notes
    claim.updated_at = utcnow()
    
    session.add(claim)
    session.flush()
    
    # If payment is cash and is_paid is True, record it in the cash register
    if payload.is_paid and payload.payment_method == PaymentMethod.CASH and payload.payment_amount_cents > 0:
        # Get the active cash register session
        statement = select(CashRegisterSession).where(
            CashRegisterSession.is_active == True
        ).order_by(CashRegisterSession.opened_at.desc())
        active_session = session.exec(statement).first()
        
        if active_session:
            # Create a transaction record for the preorder sale
            transaction = CashRegisterTransaction(
                session_id=active_session.id or 0,
                transaction_type=CashRegisterTransactionType.SALE,
                amount_cents=payload.payment_amount_cents,
                description=f"Preorder claim #{claim_id} payment",
                reference_type="preorder",
                reference_id=claim_id,
                created_by_user_id=user_id,
                notes=payload.payment_notes,
            )
            session.add(transaction)
            
            # Update the session balance
            active_session.current_balance_cents += payload.payment_amount_cents
            session.add(active_session)
            session.flush()
    
    return claim


def release_preorder_to_inventory(session: Session, preorder_id: int, payload: PreorderReleaseRequest) -> PreorderItem:
    """
    Release preorder inventory to main inventory after release date.
    This moves remaining preorder stock (not yet claimed/allocated) to physical inventory.
    """
    preorder_item = session.get(PreorderItem, preorder_id)
    if not preorder_item:
        raise NotFoundError(f"Preorder item {preorder_id} not found")
    
    inventory_item = session.get(InventoryItem, preorder_item.inventory_item_id)
    if not inventory_item:
        raise NotFoundError("Inventory item not found for preorder")
    if inventory_item.id is None:
        raise ValidationError("Inventory item must be persisted")
    
    # Calculate how much preorder stock is available (not claimed)
    available_preorder = preorder_item.preorder_quantity - preorder_item.preorder_quantity_allocated
    
    if available_preorder <= 0:
        raise ValidationError("No available preorder inventory to release")
    
    # Move preorder stock to physical inventory
    inventory_item.physical_quantity += available_preorder
    inventory_item.updated_at = utcnow()
    
    # Record the adjustment
    session.add(
        InventoryAdjustment(
            inventory_item_id=inventory_item.id,
            delta=available_preorder,
            reason=AdjustmentReason.RECEIVE,
            note=payload.note or f"Released {available_preorder} units from preorder to main inventory",
            actor="pos",
        )
    )
    
    # Update preorder quantities (keep allocated the same, but move available to zero)
    preorder_item.preorder_quantity = preorder_item.preorder_quantity_allocated
    preorder_item.updated_at = utcnow()
    
    session.add(inventory_item)
    session.add(preorder_item)
    session.flush()
    return preorder_item


def release_expired_preorders(session: Session, as_of_date: datetime | None = None) -> list[PreorderItem]:
    """
    Automatically move preorder inventory to main inventory for items past their release date.
    This should be run periodically (e.g., daily) to transition pre-order stock to live catalog.
    
    For preorders with customer claims, the inventory is moved to main inventory so customers
    can pick up their orders from regular stock.
    """
    if as_of_date is None:
        as_of_date = utcnow()
    
    # Find preorder items past their release date that still have inventory
    statement = (
        select(PreorderItem)
        .where(PreorderItem.release_date != None)  # noqa: E711
        .where(PreorderItem.preorder_quantity > 0)
    )
    expired_preorders = list(session.exec(statement).all())
    
    # Filter by date in Python since SQLModel date comparison can be tricky
    expired_preorders = [
        p for p in expired_preorders 
        if p.release_date and p.release_date <= as_of_date.date()
    ]
    
    released_items = []
    for preorder in expired_preorders:
        inventory_item = session.get(InventoryItem, preorder.inventory_item_id)
        if not inventory_item or inventory_item.id is None:
            continue
        
        # Move ALL preorder stock (both claimed and unclaimed) to main inventory
        total_preorder_stock = preorder.preorder_quantity
        
        if total_preorder_stock > 0:
            # Add to main inventory physical quantity
            inventory_item.physical_quantity += total_preorder_stock
            inventory_item.updated_at = utcnow()
            session.add(inventory_item)
            
            # Record the inventory adjustment
            session.add(
                InventoryAdjustment(
                    inventory_item_id=inventory_item.id,
                    delta=total_preorder_stock,
                    reason=AdjustmentReason.RECEIVE,
                    note=f"Released {total_preorder_stock} units from expired preorder to main inventory",
                    actor="system",
                )
            )
            
            # Zero out preorder inventory (it's now in main inventory)
            preorder.preorder_quantity = 0
            preorder.preorder_quantity_allocated = 0
            preorder.updated_at = utcnow()
            session.add(preorder)
            
            released_items.append(preorder)
    
    session.flush()
    return released_items
