import pytest

from checkoutdesignator.exceptions import ValidationError
from checkoutdesignator.models import InventorySource, PreorderClaimStatus, ProductCategory
from checkoutdesignator.schemas import (
    CustomerCreate,
    InventoryCreate,
    PreorderClaimCreate,
    PreorderItemCreate,
    ReceiveInventoryRequest,
)
from checkoutdesignator.services import customers, inventory, preorders


def test_reserve_blocks_oversell(session):
    item = inventory.upsert_item(
        session,
        InventoryCreate(
            sku="TEST-001",
            name="Test Card",
            category=ProductCategory.SINGLE,
            source=InventorySource.PLAYER,
            game_title="MTG",
            physical_quantity=5,
        ),
    )
    assert item.id is not None
    assert item.available_quantity == 5
    with pytest.raises(ValidationError):
        inventory.reserve_units(session, item.id, 6)


def test_receiving_auto_allocates_preorders(session):
    customer = customers.create_customer(session, CustomerCreate(name="Jess"))
    item = inventory.upsert_item(
        session,
        InventoryCreate(
            sku="FUTURE-001",
            name="Future Booster",
            category=ProductCategory.SEALED,
            source=InventorySource.SUPPLIER,
            physical_quantity=0,
        ),
    )
    assert item.id is not None
    preorder_item = preorders.create_preorder_item(
        session,
        PreorderItemCreate(inventory_item_id=item.id, quantity_cap=10),
    )
    assert preorder_item.id is not None
    assert customer.id is not None
    first_claim = preorders.create_preorder_claim(
        session,
        PreorderClaimCreate(
            preorder_item_id=preorder_item.id,
            customer_id=customer.id,
            quantity_requested=3,
        ),
    )
    second_claim = preorders.create_preorder_claim(
        session,
        PreorderClaimCreate(
            preorder_item_id=preorder_item.id,
            customer_id=customer.id,
            quantity_requested=2,
        ),
    )

    inventory.receive_inventory(session, item.id, ReceiveInventoryRequest(quantity=4, actor="test"))

    refreshed_first = session.get(type(first_claim), first_claim.id)
    refreshed_second = session.get(type(second_claim), second_claim.id)
    assert refreshed_first.quantity_allocated == 3
    assert refreshed_first.status == PreorderClaimStatus.ALLOCATED
    assert refreshed_second.quantity_allocated == 1
    assert refreshed_second.status == PreorderClaimStatus.WAITING


def test_inventory_tracks_source_metadata(session):
    single = inventory.upsert_item(
        session,
        InventoryCreate(
            sku="SNG-001",
            name="Chase Mythic",
            category=ProductCategory.SINGLE,
            source=InventorySource.PLAYER,
            game_title="Magic: The Gathering",
            acquisition_reference="Eli trade-in",
            physical_quantity=2,
        ),
    )
    sealed = inventory.upsert_item(
        session,
        InventoryCreate(
            sku="SUP-001",
            name="Sealed Box",
            category=ProductCategory.SEALED,
            source=InventorySource.SUPPLIER,
            acquisition_reference="Distributor PO",
            physical_quantity=10,
        ),
    )

    assert single.source == InventorySource.PLAYER
    assert single.game_title == "Magic: The Gathering"
    assert sealed.source == InventorySource.SUPPLIER
    assert sealed.acquisition_reference == "Distributor PO"
