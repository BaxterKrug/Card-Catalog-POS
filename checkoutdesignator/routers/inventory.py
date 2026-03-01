from fastapi import APIRouter, Depends
from sqlmodel import Session

from ..api import raise_http_error
from ..dependencies import db_session
from ..exceptions import CardPosError
from ..models import InventoryItem
from ..schemas import (
    BulkCSVUpload,
    BulkReceiveInventoryRequest,
    InventoryAdjustmentRequest,
    InventoryCreate,
    InventoryItemRead,
    PriceSuggestion,
    ReceiveInventoryRequest,
)
from ..services import inventory as inventory_service
from ..services import pricing as pricing_service

router = APIRouter(prefix="/inventory", tags=["inventory"])


def _serialize_item(item: InventoryItem) -> InventoryItemRead:
    return InventoryItemRead.model_validate(item)


@router.get("/", response_model=list[InventoryItemRead])
def list_inventory(session: Session = Depends(db_session)) -> list[InventoryItemRead]:
    items = inventory_service.list_items(session)
    return [_serialize_item(item) for item in items]


@router.post("/", response_model=InventoryItemRead, status_code=201)
def upsert_inventory(payload: InventoryCreate, session: Session = Depends(db_session)) -> InventoryItemRead:
    try:
        item = inventory_service.upsert_item(session, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return _serialize_item(item)


@router.post("/bulk", response_model=dict)
def bulk_import(payload: BulkCSVUpload, session: Session = Depends(db_session)) -> dict:
    summary = inventory_service.import_csv_text(session, payload.csv_data)
    return summary


@router.post("/{item_id}/adjust", response_model=InventoryItemRead)
def adjust_item(
    item_id: int, payload: InventoryAdjustmentRequest, session: Session = Depends(db_session)
) -> InventoryItemRead:
    try:
        item = inventory_service.adjust_stock(session, item_id, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return _serialize_item(item)


@router.post("/receive-bulk", response_model=list[InventoryItemRead])
def receive_bulk(
    payload: BulkReceiveInventoryRequest, session: Session = Depends(db_session)
) -> list[InventoryItemRead]:
    """Receive multiple inventory items in a single operation."""
    try:
        items = inventory_service.bulk_receive_inventory(session, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return [_serialize_item(item) for item in items]


@router.post("/{item_id}/receive", response_model=InventoryItemRead)
def receive_item(
    item_id: int, payload: ReceiveInventoryRequest, session: Session = Depends(db_session)
) -> InventoryItemRead:
    try:
        item = inventory_service.receive_inventory(session, item_id, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return _serialize_item(item)


@router.get("/pricing/suggestions", response_model=PriceSuggestion)
def price_suggestion(name: str, set_code: str | None = None) -> PriceSuggestion:
    return pricing_service.fetch_price_suggestion(name=name, set_code=set_code)


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, session: Session = Depends(db_session)) -> None:
    try:
        inventory_service.delete_item(session, item_id)
    except CardPosError as exc:
        raise_http_error(exc)

