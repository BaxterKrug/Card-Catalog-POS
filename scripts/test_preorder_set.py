#!/usr/bin/env python3
"""Test script for the preorder set functionality."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import date
from sqlmodel import Session, select
from checkoutdesignator.database import engine
from checkoutdesignator.models import PreorderItem, InventoryItem
from checkoutdesignator.schemas import PreorderSetCreate, PreorderSetProduct
from checkoutdesignator.services.preorders import create_preorder_set


def test_create_preorder_set():
    """Test creating a preorder set with multiple products."""
    print("\n=== Testing Preorder Set Creation ===\n")
    
    with Session(engine) as session:
        # Create a test preorder set for a new game release
        set_payload = PreorderSetCreate(
            game_title="Magic: The Gathering - Modern Horizons 4",
            release_date=date(2026, 6, 15),
            category="sealed",
            notes="Summer 2026 release - limited allocation",
            products=[
                PreorderSetProduct(
                    product_name="Modern Horizons 4 - Booster Box",
                    sku="MH4-BB-001",
                    msrp_cents=27999,  # $279.99
                    preorder_quantity=20,
                    quantity_cap=2,  # 2 boxes per customer
                ),
                PreorderSetProduct(
                    product_name="Modern Horizons 4 - Collector Booster Box",
                    sku="MH4-CBB-001",
                    msrp_cents=39999,  # $399.99
                    preorder_quantity=15,
                    quantity_cap=1,  # 1 collector box per customer
                ),
                PreorderSetProduct(
                    product_name="Modern Horizons 4 - Draft Booster Box",
                    sku="MH4-DBB-001",
                    msrp_cents=24999,  # $249.99
                    preorder_quantity=25,
                    quantity_cap=3,  # 3 draft boxes per customer
                ),
            ]
        )
        
        # Create the preorder set
        print(f"Creating preorder set for: {set_payload.game_title}")
        print(f"Release Date: {set_payload.release_date}")
        print(f"Number of products: {len(set_payload.products)}")
        print()
        
        preorder_items = create_preorder_set(session, set_payload)
        session.commit()
        
        print(f"✅ Successfully created {len(preorder_items)} preorder items!\n")
        
        # Display the created items
        for i, item in enumerate(preorder_items, 1):
            inv_item = session.get(InventoryItem, item.inventory_item_id)
            print(f"Product {i}: {inv_item.name}")
            print(f"  SKU: {inv_item.sku}")
            print(f"  Game: {inv_item.game_title}")
            print(f"  Category: {inv_item.category}")
            print(f"  MSRP: ${inv_item.msrp_cents / 100:.2f}")
            print(f"  Preorder Stock: {item.preorder_quantity} units")
            print(f"  Per Customer Limit: {item.quantity_cap} units")
            print(f"  Release Date: {item.release_date}")
            print(f"  Physical Stock: {inv_item.physical_quantity} (unreleased)")
            print(f"  Notes: {item.notes}")
            print()
        
        print("=== Verification ===\n")
        
        # Verify all items share the same game title
        game_titles = set()
        for item in preorder_items:
            inv_item = session.get(InventoryItem, item.inventory_item_id)
            game_titles.add(inv_item.game_title)
        
        if len(game_titles) == 1:
            print(f"✅ All products have the same game title: {list(game_titles)[0]}")
        else:
            print(f"❌ ERROR: Products have different game titles: {game_titles}")
        
        # Verify all items share the same release date
        release_dates = set(item.release_date for item in preorder_items)
        if len(release_dates) == 1:
            print(f"✅ All products have the same release date: {list(release_dates)[0]}")
        else:
            print(f"❌ ERROR: Products have different release dates: {release_dates}")
        
        # Verify physical stock is 0 for all (unreleased)
        physical_stocks = []
        for item in preorder_items:
            inv_item = session.get(InventoryItem, item.inventory_item_id)
            physical_stocks.append(inv_item.physical_quantity)
        
        if all(stock == 0 for stock in physical_stocks):
            print("✅ All products have 0 physical stock (unreleased)")
        else:
            print(f"❌ ERROR: Some products have physical stock: {physical_stocks}")
        
        # Verify all items have the shared notes
        notes_set = set(item.notes for item in preorder_items)
        if len(notes_set) == 1:
            print(f"✅ All products have the same notes: {list(notes_set)[0]}")
        else:
            print(f"❌ ERROR: Products have different notes: {notes_set}")
        
        print("\n=== Test Complete ===")
        print(f"\nYou can now view these preorder items at: http://localhost:5173")
        print("Navigate to the Preorders page to see the new set!")


if __name__ == "__main__":
    try:
        test_create_preorder_set()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
