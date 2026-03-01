from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from ..api import raise_http_error
from ..dependencies import db_session
from ..exceptions import CardPosError
from ..models import PreorderClaim, PreorderItem, PreorderOrder
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
from ..services import preorders as preorder_service

router = APIRouter(prefix="/preorders", tags=["preorders"])


@router.get("/items", response_model=list[PreorderItem])
def list_items(session: Session = Depends(db_session)) -> list[PreorderItem]:
    return preorder_service.list_preorder_items(session)


@router.get("/claims", response_model=list[PreorderClaim])
def list_claims(
    is_paid: Optional[bool] = Query(None, description="Filter by payment status"),
    session: Session = Depends(db_session),
) -> list[PreorderClaim]:
    return preorder_service.list_preorder_claims(session, is_paid=is_paid)


@router.get("/orders", response_model=list[PreorderOrder])
def list_orders(session: Session = Depends(db_session)) -> list[PreorderOrder]:
    """List all preorder orders (groups of claims by customer)."""
    return preorder_service.list_preorder_orders(session)


@router.post("/items", response_model=PreorderItem, status_code=201)
def create_preorder_item(payload: PreorderItemCreate, session: Session = Depends(db_session)) -> PreorderItem:
    try:
        preorder_item = preorder_service.create_preorder_item(session, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return preorder_item


@router.post("/items/with-product", response_model=PreorderItem, status_code=201)
def create_preorder_with_product(
    payload: PreorderItemCreateWithProduct,
    session: Session = Depends(db_session),
) -> PreorderItem:
    """Create a preorder item along with a new inventory item for unreleased products."""
    try:
        preorder_item = preorder_service.create_preorder_with_product(session, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return preorder_item


@router.post("/sets", response_model=list[PreorderItem], status_code=201)
def create_preorder_set(
    payload: PreorderSetCreate,
    session: Session = Depends(db_session),
) -> list[PreorderItem]:
    """Create multiple preorder items with shared game and release date.
    
    This is useful for setting up an entire product release at once.
    """
    try:
        preorder_items = preorder_service.create_preorder_set(session, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return preorder_items


@router.patch("/items/{item_id}", response_model=PreorderItem)
def update_preorder_item(
    item_id: int,
    payload: PreorderItemUpdate,
    session: Session = Depends(db_session),
) -> PreorderItem:
    try:
        preorder_item = preorder_service.update_preorder_item(session, item_id, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return preorder_item


@router.post("/items/{item_id}/release", response_model=PreorderItem)
def release_preorder_to_inventory(
    item_id: int,
    payload: PreorderReleaseRequest,
    session: Session = Depends(db_session),
) -> PreorderItem:
    """Release preorder inventory to main inventory after release date."""
    try:
        preorder_item = preorder_service.release_preorder_to_inventory(session, item_id, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return preorder_item


@router.post("/claims", response_model=PreorderClaim, status_code=201)
def create_preorder_claim(payload: PreorderClaimCreate, session: Session = Depends(db_session)) -> PreorderClaim:
    try:
        claim = preorder_service.create_preorder_claim(session, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return claim


@router.patch("/claims/{claim_id}", response_model=PreorderClaim)
def update_preorder_claim(
    claim_id: int,
    payload: PreorderClaimUpdate,
    session: Session = Depends(db_session),
) -> PreorderClaim:
    try:
        claim = preorder_service.update_preorder_claim(session, claim_id, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return claim


@router.post("/claims/{claim_id}/payment", response_model=PreorderClaim)
def record_preorder_payment(
    claim_id: int,
    payload: PreorderClaimPaymentUpdate,
    session: Session = Depends(db_session),
) -> PreorderClaim:
    """Record payment for a preorder claim. Payment data is stored permanently."""
    try:
        claim = preorder_service.record_preorder_payment(session, claim_id, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return claim


@router.post("/claims/{claim_id}/cancel", response_model=PreorderClaim)
def cancel_claim(claim_id: int, session: Session = Depends(db_session)) -> PreorderClaim:
    try:
        claim = preorder_service.cancel_preorder_claim(session, claim_id)
    except CardPosError as exc:
        raise_http_error(exc)
    return claim


@router.post("/claims/{claim_id}/fulfill", response_model=PreorderClaim)
def fulfill_claim(
    claim_id: int,
    payload: PreorderClaimFulfillRequest,
    session: Session = Depends(db_session),
) -> PreorderClaim:
    try:
        claim = preorder_service.fulfill_preorder_claim(session, claim_id, payload)
    except CardPosError as exc:
        raise_http_error(exc)
    return claim


@router.post("/release-expired", response_model=dict)
def release_expired_preorders(session: Session = Depends(db_session)) -> dict:
    """
    Release all preorder allocations for items past their release date.
    This moves allocated inventory to available inventory.
    Should be run periodically (e.g., daily).
    """
    try:
        released_items = preorder_service.release_expired_preorders(session)
    except CardPosError as exc:
        raise_http_error(exc)
    return {
        "released_count": len(released_items),
        "preorder_ids": [item.id for item in released_items],
    }
