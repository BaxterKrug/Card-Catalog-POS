from __future__ import annotations

import csv
from io import StringIO
from typing import Dict, Iterable, Tuple, Optional

from sqlalchemy import func
from sqlmodel import Session, select

from ..exceptions import NotFoundError, ValidationError
from ..models import (
    AdjustmentReason,
    InventoryAdjustment,
    InventoryItem,
    Order,
    OrderItem,
    OrderStatus,
    PreorderClaim,
    PreorderClaimStatus,
    PreorderItem,
    InventorySource,
    ProductCategory,
    utcnow,
)
from ..schemas import InventoryBulkItem, InventoryCreate, InventoryAdjustmentRequest, ReceiveInventoryRequest, BulkReceiveInventoryRequest


def _resolved_source(category: ProductCategory, explicit: InventorySource | None) -> InventorySource:
    if explicit is not None:
        return explicit
    return InventorySource.PLAYER if category == ProductCategory.SINGLE else InventorySource.SUPPLIER


def list_items(session: Session) -> list[InventoryItem]:
    """
    List all inventory items in the catalog.
    Items with 0 stock are included - frontend can filter them if needed.
    """
    statement = select(InventoryItem).order_by(getattr(InventoryItem, "sku"))
    return list(session.exec(statement).all())


def get_item_or_raise(session: Session, item_id: int) -> InventoryItem:
    item = session.get(InventoryItem, item_id)
    if not item:
        raise NotFoundError(f"Inventory item {item_id} was not found")
    return item


def delete_item(session: Session, item_id: int) -> None:
    """
    Delete an inventory item.
    Raises NotFoundError if the item doesn't exist.
    Raises ValidationError if the item has associated orders or preorders.
    """
    item = get_item_or_raise(session, item_id)
    
    # Check if item has associated order items
    order_items_statement = select(OrderItem).where(OrderItem.inventory_item_id == item_id)
    order_items = session.exec(order_items_statement).first()
    if order_items:
        raise ValidationError(f"Cannot delete item '{item.name}' - it has associated orders")
    
    # Check if item has associated preorder items
    preorder_items_statement = select(PreorderItem).where(PreorderItem.inventory_item_id == item_id)
    preorder_items = session.exec(preorder_items_statement).first()
    if preorder_items:
        raise ValidationError(f"Cannot delete item '{item.name}' - it has associated preorders")
    
    # Delete associated inventory adjustments first
    adjustments_statement = select(InventoryAdjustment).where(InventoryAdjustment.inventory_item_id == item_id)
    adjustments = session.exec(adjustments_statement).all()
    for adjustment in adjustments:
        session.delete(adjustment)
    
    # Flush to ensure adjustments are deleted before the item
    session.flush()
    
    session.delete(item)
    session.commit()


def upsert_item(session: Session, payload: InventoryCreate) -> InventoryItem:
    statement = select(InventoryItem).where(InventoryItem.sku == payload.sku)
    existing = session.exec(statement).one_or_none()
    data = payload.model_dump()
    data["source"] = _resolved_source(payload.category, payload.source)

    if existing:
        for field, value in data.items():
            setattr(existing, field, value)
        existing.updated_at = utcnow()
        session.add(existing)
        session.flush()
        return existing

    item = InventoryItem(**data)
    session.add(item)
    session.flush()
    return item


def bulk_import_items(session: Session, rows: Iterable[InventoryBulkItem]) -> Tuple[int, int]:
    created = 0
    updated = 0
    for row in rows:
        statement = select(InventoryItem).where(InventoryItem.sku == row.sku)
        existing = session.exec(statement).one_or_none()
        data = row.model_dump()
        data["source"] = _resolved_source(row.category, row.source)
        if existing:
            for field, value in data.items():
                setattr(existing, field, value)
            existing.updated_at = utcnow()
            updated += 1
        else:
            session.add(InventoryItem(**data))
            created += 1
    session.flush()
    return created, updated


def parse_bulk_csv(csv_text: str) -> Iterable[InventoryBulkItem]:
    reader = csv.DictReader(StringIO(csv_text.strip()))
    for raw in reader:
        raw_category = (raw.get("category") or ProductCategory.SINGLE.value).lower()
        try:
            category = ProductCategory(raw_category)
        except ValueError:
            category = ProductCategory.SINGLE
        raw_source = (raw.get("source") or InventorySource.SUPPLIER.value).lower()
        try:
            source = InventorySource(raw_source)
        except ValueError:
            source = InventorySource.SUPPLIER
        yield InventoryBulkItem(
            sku=raw["sku"],
            name=raw.get("name", "Unnamed SKU"),
            category=category,
            source=source,
            set_code=raw.get("set_code"),
            printing=raw.get("printing"),
            condition=raw.get("condition"),
            game_title=raw.get("game_title"),
            acquisition_reference=raw.get("acquisition_reference"),
            msrp_cents=_safe_int(raw.get("msrp_cents")),
            acquisition_cost_cents=_safe_int(raw.get("acquisition_cost_cents")),
            unit_price_cents=int(raw.get("unit_price_cents", "0") or 0),
            physical_quantity=int(raw.get("physical_quantity", "0") or 0),
        )


def _safe_int(value: str | None) -> Optional[int]:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except ValueError:
        return None


def adjust_stock(
    session: Session,
    item_id: int,
    request: InventoryAdjustmentRequest,
) -> InventoryItem:
    item = get_item_or_raise(session, item_id)
    new_physical = item.physical_quantity + request.delta
    if new_physical < 0:
        raise ValidationError("Physical inventory cannot go negative")

    item.physical_quantity = new_physical
    item.updated_at = utcnow()
    session.add(
        InventoryAdjustment(
            inventory_item_id=item.id,
            delta=request.delta,
            reason=request.reason,
            note=request.note,
            actor=request.actor,
        )
    )
    session.add(item)
    session.flush()
    if request.reason == AdjustmentReason.RECEIVE and request.delta > 0:
        auto_allocate_preorders(session, item)
    return item


def receive_inventory(session: Session, item_id: int, request: ReceiveInventoryRequest) -> InventoryItem:
    adjustment = InventoryAdjustmentRequest(
        delta=request.quantity,
        reason=AdjustmentReason.RECEIVE,
        note=request.note,
        actor=request.actor,
    )
    return adjust_stock(session, item_id, adjustment)


def bulk_receive_inventory(session: Session, request: BulkReceiveInventoryRequest) -> list[InventoryItem]:
    """Receive multiple inventory items in a single operation."""
    updated_items = []
    
    for item_data in request.items:
        item_request = ReceiveInventoryRequest(
            quantity=item_data.quantity,
            note=request.note,
            actor=request.actor,
        )
        updated_item = receive_inventory(session, item_data.inventory_item_id, item_request)
        updated_items.append(updated_item)
    
    session.flush()
    return updated_items


def reserve_units(
    session: Session,
    item_id: int,
    quantity: int,
    *,
    allow_negative_available: bool = False,
) -> InventoryItem:
    if quantity <= 0:
        raise ValidationError("Quantity to reserve must be positive")
    item = get_item_or_raise(session, item_id)
    projected_available = item.physical_quantity - (item.allocated_quantity + quantity)
    if not allow_negative_available and projected_available < 0:
        raise ValidationError(
            f"Insufficient available inventory for {item.sku}; requested {quantity}, available {item.available_quantity}"
        )
    item.allocated_quantity += quantity
    item.updated_at = utcnow()
    session.add(item)
    session.flush()
    return item


def release_units(session: Session, item_id: int, quantity: int) -> InventoryItem:
    if quantity <= 0:
        raise ValidationError("Quantity to release must be positive")
    item = get_item_or_raise(session, item_id)
    new_allocated = item.allocated_quantity - quantity
    if new_allocated < 0:
        raise ValidationError("Allocated inventory cannot drop below zero")
    item.allocated_quantity = new_allocated
    item.updated_at = utcnow()
    session.add(item)
    session.flush()
    return item


def auto_allocate_preorders(session: Session, item: InventoryItem) -> None:
    if item.id is None:
        session.flush()
    if item.id is None:
        raise ValidationError("Cannot auto-allocate inventory that lacks a primary key")
    unassigned = calculate_unassigned_physical(session, item.id)
    if unassigned <= 0:
        return

    statement = (
        select(PreorderClaim)
        .join(PreorderItem)
        .where(PreorderItem.inventory_item_id == item.id)
        .where(PreorderClaim.status == PreorderClaimStatus.WAITING)
        .order_by(PreorderClaim.created_at)
    )
    claims = list(session.exec(statement).all())

    for claim in claims:
        need = claim.quantity_requested - claim.quantity_allocated
        if need <= 0:
            claim.status = PreorderClaimStatus.ALLOCATED
            claim.updated_at = utcnow()
            continue
        if unassigned <= 0:
            break
        granted = min(need, unassigned)
        claim.quantity_allocated += granted
        claim.updated_at = utcnow()
        if claim.quantity_allocated >= claim.quantity_requested:
            claim.status = PreorderClaimStatus.ALLOCATED
        session.add(claim)
        unassigned -= granted
    session.flush()


def calculate_unassigned_physical(session: Session, item_id: int) -> int:
    item = get_item_or_raise(session, item_id)
    reserved_for_orders = _sum_for_orders(session, item_id)
    assigned_claim_units = _sum_assigned_preorders(session, item_id)
    return item.physical_quantity - reserved_for_orders - assigned_claim_units


def _sum_for_orders(session: Session, item_id: int) -> int:
    status_column = getattr(Order, "status")
    stmt = (
        select(func.coalesce(func.sum(OrderItem.quantity), 0))
        .join(Order, Order.id == OrderItem.order_id)
        .where(OrderItem.inventory_item_id == item_id)
        .where(status_column.in_([OrderStatus.OPEN, OrderStatus.READY]))
    )
    result = session.exec(stmt).one()
    return int(result or 0)


def _sum_assigned_preorders(session: Session, item_id: int) -> int:
    stmt = (
        select(func.coalesce(func.sum(PreorderClaim.quantity_allocated), 0))
    .join(PreorderItem, PreorderItem.id == PreorderClaim.preorder_item_id)  # type: ignore[arg-type]
        .where(PreorderItem.inventory_item_id == item_id)
    )
    result = session.exec(stmt).one()
    return int(result or 0)


def import_csv_text(session: Session, csv_text: str) -> Dict[str, int]:
    rows = list(parse_bulk_csv(csv_text))
    created, updated = bulk_import_items(session, rows)
    return {"created": created, "updated": updated}
