#!/usr/bin/env python3
"""
Migration script to ensure acquisition_cost_cents is properly tracked.
The field already exists in the model, this script helps populate it for existing items.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select
from checkoutdesignator.database import engine
from checkoutdesignator.models import InventoryItem

def main():
    print("Checking inventory items for cost tracking...")
    
    with Session(engine) as session:
        # Get all inventory items
        items = session.exec(select(InventoryItem)).all()
        
        items_without_cost = [item for item in items if item.acquisition_cost_cents is None]
        
        print(f"\nTotal items: {len(items)}")
        print(f"Items with acquisition cost: {len(items) - len(items_without_cost)}")
        print(f"Items without acquisition cost: {len(items_without_cost)}")
        
        if items_without_cost:
            print("\n⚠️  Items without acquisition cost:")
            for item in items_without_cost[:10]:  # Show first 10
                print(f"  - {item.sku}: {item.name}")
            if len(items_without_cost) > 10:
                print(f"  ... and {len(items_without_cost) - 10} more")
            
            print("\n💡 Recommendation:")
            print("   Update inventory items with acquisition costs through the UI")
            print("   to enable profit tracking and COGS calculations.")
        else:
            print("\n✅ All items have acquisition costs set!")
        
        # Show items with cost info
        items_with_cost = [item for item in items if item.acquisition_cost_cents is not None]
        if items_with_cost:
            print(f"\n📊 Sample items with costs:")
            for item in items_with_cost[:5]:
                cost = (item.acquisition_cost_cents or 0) / 100
                price = item.unit_price_cents / 100
                margin = ((price - cost) / price * 100) if price > 0 else 0
                print(f"  - {item.sku}: Cost ${cost:.2f}, Price ${price:.2f}, Margin {margin:.1f}%")

if __name__ == "__main__":
    main()
