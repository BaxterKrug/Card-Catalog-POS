#!/usr/bin/env python3
"""
Seed script to create a special EVENTS inventory item for event entries.
This item acts as a placeholder in orders when ringing up event entries with varying prices.
"""

from sqlmodel import Session, select
from checkoutdesignator.database import engine
from checkoutdesignator.models import InventoryItem, InventorySource, ProductCategory


def seed_events_item():
    with Session(engine) as session:
        # Check if EVENTS item already exists
        statement = select(InventoryItem).where(InventoryItem.sku == "EVENTS")
        existing = session.exec(statement).first()
        
        if existing:
            print("✓ EVENTS inventory item already exists")
            print(f"  ID: {existing.id}")
            print(f"  Name: {existing.name}")
            return
        
        # Create the EVENTS item
        events_item = InventoryItem(
            sku="EVENTS",
            name="Event Entry (Custom Price)",
            category=ProductCategory.OTHER,
            source=InventorySource.SUPPLIER,
            unit_price_cents=0,  # Price will be set at checkout
            physical_quantity=999999,  # Effectively unlimited
            allocated_quantity=0,
            game_title=None,
            set_code=None,
            printing=None,
            condition=None,
            acquisition_reference="Generic event entry placeholder"
        )
        
        session.add(events_item)
        session.commit()
        session.refresh(events_item)
        
        print("✓ Created EVENTS inventory item")
        print(f"  ID: {events_item.id}")
        print(f"  SKU: {events_item.sku}")
        print(f"  Name: {events_item.name}")
        print("\nThis item can be used in orders to ring up event entries with custom prices.")


if __name__ == "__main__":
    seed_events_item()
