#!/usr/bin/env python3
"""
Seed script to create a special SINGLES inventory item for custom-priced single cards.
This item acts as a placeholder in orders when ringing up singles with varying prices.
"""

from sqlmodel import Session, select
from checkoutdesignator.database import engine
from checkoutdesignator.models import InventoryItem, InventorySource, ProductCategory


def seed_singles_item():
    with Session(engine) as session:
        # Check if SINGLES item already exists
        statement = select(InventoryItem).where(InventoryItem.sku == "SINGLES")
        existing = session.exec(statement).first()
        
        if existing:
            print("✓ SINGLES inventory item already exists")
            print(f"  ID: {existing.id}")
            print(f"  Name: {existing.name}")
            return
        
        # Create the SINGLES item
        singles_item = InventoryItem(
            sku="SINGLES",
            name="Singles (Custom Price)",
            category=ProductCategory.SINGLE,
            source=InventorySource.PLAYER,
            unit_price_cents=0,  # Price will be set at checkout
            physical_quantity=999999,  # Effectively unlimited
            allocated_quantity=0,
            game_title="Magic: The Gathering",
            set_code=None,
            printing=None,
            condition=None,
            acquisition_reference="Generic singles placeholder"
        )
        
        session.add(singles_item)
        session.commit()
        session.refresh(singles_item)
        
        print("✓ Created SINGLES inventory item")
        print(f"  ID: {singles_item.id}")
        print(f"  SKU: {singles_item.sku}")
        print(f"  Name: {singles_item.name}")
        print("\nThis item can be used in orders to ring up single cards with custom prices.")


if __name__ == "__main__":
    seed_singles_item()
