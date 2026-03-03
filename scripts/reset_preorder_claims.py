#!/usr/bin/env python3
"""Reset all preorder claims and restore allocated quantities to 0."""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select
from checkoutdesignator.database import engine
from checkoutdesignator.models import PreorderItem, PreorderClaim, PreorderOrder


def reset_preorder_claims():
    """Remove all preorder claims and orders, and reset allocated quantities."""
    print("\n=== Resetting Preorder Claims ===\n")
    
    with Session(engine) as session:
        # Get all preorder claims
        preorder_claims = session.exec(select(PreorderClaim)).all()
        print(f"Found {len(preorder_claims)} preorder claims")
        
        # Get all preorder orders
        preorder_orders = session.exec(select(PreorderOrder)).all()
        print(f"Found {len(preorder_orders)} preorder orders")
        
        # Delete all preorder claims first
        if preorder_claims:
            print("\nDeleting preorder claims...")
            for claim in preorder_claims:
                session.delete(claim)
            print(f"✅ Deleted {len(preorder_claims)} preorder claims")
        
        # Delete all preorder orders
        if preorder_orders:
            print("\nDeleting preorder orders...")
            for order in preorder_orders:
                session.delete(order)
            print(f"✅ Deleted {len(preorder_orders)} preorder orders")
        
        # Reset allocated quantities on all preorder items
        preorder_items = session.exec(select(PreorderItem)).all()
        if preorder_items:
            print(f"\nResetting allocated quantities on {len(preorder_items)} preorder items...")
            for item in preorder_items:
                if item.preorder_quantity_allocated > 0:
                    print(f"  - {item.id}: {item.preorder_quantity_allocated} → 0")
                    item.preorder_quantity_allocated = 0
                    session.add(item)
            print(f"✅ Reset all allocated quantities to 0")
        
        # Commit all changes
        session.commit()
        
        print("\n=== Reset Complete ===")
        print("All preorder claims have been removed.")
        print("All allocated quantities have been reset to 0.")
        print("Preorder items are ready for fresh claims!")


if __name__ == "__main__":
    try:
        response = input("\nThis will DELETE ALL preorder claims and reset allocated quantities. Continue? (yes/no): ")
        if response.lower() in ['yes', 'y']:
            reset_preorder_claims()
        else:
            print("Cancelled.")
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
