#!/usr/bin/env python3
"""Clear all preorder test data and sample products."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select
from checkoutdesignator.database import engine
from checkoutdesignator.models import PreorderItem, PreorderClaim, InventoryItem


def clear_preorder_data():
    """Remove all preorder items, claims, and their associated inventory items."""
    print("\n=== Clearing Preorder Data ===\n")
    
    with Session(engine) as session:
        # Get all preorder items first
        preorder_items = session.exec(select(PreorderItem)).all()
        print(f"Found {len(preorder_items)} preorder items")
        
        # Get all preorder claims
        preorder_claims = session.exec(select(PreorderClaim)).all()
        print(f"Found {len(preorder_claims)} preorder claims")
        
        # Delete all preorder claims first (foreign key to preorder items)
        if preorder_claims:
            print("\nDeleting preorder claims...")
            for claim in preorder_claims:
                session.delete(claim)
            print(f"✅ Deleted {len(preorder_claims)} preorder claims")
        
        # Collect inventory item IDs associated with preorders
        inventory_item_ids = [item.inventory_item_id for item in preorder_items]
        
        # Delete preorder items
        if preorder_items:
            print("\nDeleting preorder items...")
            for item in preorder_items:
                session.delete(item)
            print(f"✅ Deleted {len(preorder_items)} preorder items")
        
        # Delete associated inventory items (that were created for preorders)
        if inventory_item_ids:
            print("\nDeleting associated inventory items...")
            deleted_count = 0
            for inv_id in inventory_item_ids:
                inv_item = session.get(InventoryItem, inv_id)
                if inv_item:
                    print(f"  - Deleting: {inv_item.name} (SKU: {inv_item.sku})")
                    session.delete(inv_item)
                    deleted_count += 1
            print(f"✅ Deleted {deleted_count} inventory items")
        
        # Commit all deletions
        session.commit()
        
        print("\n=== Cleanup Complete ===")
        print("All preorder test data has been removed.")
        print("You can now add real preorder products!")


if __name__ == "__main__":
    try:
        response = input("\nThis will DELETE ALL preorder items and claims. Are you sure? (yes/no): ")
        if response.lower() in ['yes', 'y']:
            clear_preorder_data()
        else:
            print("Cancelled.")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
