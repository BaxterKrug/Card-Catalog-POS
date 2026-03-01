"""Seed demo data for CheckoutDesignator."""

from checkoutdesignator.database import init_db, session_scope
from checkoutdesignator.models import InventorySource, ProductCategory
from checkoutdesignator.schemas import (
    CustomerCreate,
    InventoryCreate,
    PreorderClaimCreate,
    PreorderItemCreate,
)
from checkoutdesignator.services import customers, inventory, preorders, users


def seed() -> None:
    init_db()
    with session_scope() as session:
        users.ensure_default_user(session)
        alice = customers.create_customer(
            session, CustomerCreate(name="Alice Collector", email="alice@example.com")
        )
        bob = customers.create_customer(session, CustomerCreate(name="Bob Grinder", phone="555-0101"))

        lotus = inventory.upsert_item(
            session,
            InventoryCreate(
                sku="LTB-BLK-UL",
                name="Black Lotus (Unlimited)",
                category=ProductCategory.SINGLE,
                source=InventorySource.PLAYER,
                game_title="Magic: The Gathering",
                acquisition_reference="Alice trade binder",
                set_code="2ED",
                printing="Unlimited",
                physical_quantity=1,
                unit_price_cents=1200000,
            ),
        )
        boosters = inventory.upsert_item(
            session,
            InventoryCreate(
                sku="MTG-MH3-SET",
                name="Modern Horizons 3 Set Booster",
                set_code="MH3",
                category=ProductCategory.SEALED,
                source=InventorySource.SUPPLIER,
                acquisition_reference="Distributor PO-8841",
                physical_quantity=12,
                unit_price_cents=3299,
            ),
        )
        assert alice.id is not None
        assert bob.id is not None
        assert lotus.id is not None
        assert boosters.id is not None

        preorder_item = preorders.create_preorder_item(
            session,
            PreorderItemCreate(inventory_item_id=boosters.id, quantity_cap=24),
        )
        assert preorder_item.id is not None

        preorders.create_preorder_claim(
            session,
            PreorderClaimCreate(preorder_item_id=preorder_item.id, customer_id=alice.id, quantity_requested=4),
        )
        preorders.create_preorder_claim(
            session,
            PreorderClaimCreate(preorder_item_id=preorder_item.id, customer_id=bob.id, quantity_requested=6),
        )

        print("Seed data inserted: customers, inventory, preorder claims.")


if __name__ == "__main__":
    seed()
