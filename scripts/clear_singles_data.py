#!/usr/bin/env python3
"""
Clear Singles Inventory Data

This script will:
1. Delete all inventory items that are singles (category = "single")
2. Delete associated inventory adjustments for those items
3. Keep sealed products, supplies, and other items

USE WITH CAUTION: This will permanently delete singles inventory data!
"""

from checkoutdesignator.database import init_db, session_scope
from checkoutdesignator.models import (
    InventoryItem,
    InventoryAdjustment,
    ProductCategory,
)
from sqlmodel import select


def clear_singles_inventory():
    """Clear all singles from inventory."""
    init_db()
    
    print("🧹 Clearing singles inventory data...\n")
    
    with session_scope() as session:
        # 1. Find all singles
        singles_statement = select(InventoryItem).where(
            InventoryItem.category == ProductCategory.SINGLE
        )
        singles = session.exec(singles_statement).all()
        singles_count = len(singles)
        
        if singles_count == 0:
            print("✅ No singles found in inventory - nothing to delete!")
            return
        
        print(f"📊 Found {singles_count} singles in inventory")
        print()
        
        # Show some examples
        print("Examples of singles to be deleted:")
        for single in singles[:5]:
            print(f"   - {single.name} (SKU: {single.sku})")
        if singles_count > 5:
            print(f"   ... and {singles_count - 5} more")
        print()
        
        # Confirm deletion
        print("⚠️  WARNING: This will permanently delete:")
        print(f"   - {singles_count} singles inventory items")
        print(f"   - All associated inventory adjustments")
        print()
        print("✅ Will keep:")
        print("   - All sealed products")
        print("   - All supplies")
        print("   - All other inventory items")
        print()
        
        response = input("Are you sure you want to continue? Type 'YES' to confirm: ")
        
        if response.strip() != "YES":
            print("❌ Aborted - no changes made")
            return
        
        print("\n🗑️  Deleting data...\n")
        
        # 2. Delete associated adjustments for each single
        total_adjustments = 0
        for single in singles:
            adjustments_statement = select(InventoryAdjustment).where(
                InventoryAdjustment.inventory_item_id == single.id
            )
            adjustments = session.exec(adjustments_statement).all()
            for adjustment in adjustments:
                session.delete(adjustment)
            total_adjustments += len(adjustments)
        
        if total_adjustments > 0:
            print(f"✅ Deleted {total_adjustments} inventory adjustments")
        
        # Flush adjustments before deleting items
        session.flush()
        
        # 3. Delete the singles
        for single in singles:
            session.delete(single)
        
        print(f"✅ Deleted {singles_count} singles")
        
        # Commit all changes
        session.commit()
        
        print("\n✨ Singles inventory cleared!")
        print("\n📋 Summary:")
        print(f"   - Deleted {singles_count} singles")
        print(f"   - Deleted {total_adjustments} adjustments")
        print(f"   - Kept all sealed products, supplies, and other items")
        print("\n🚀 Ready to add fresh singles inventory!")


def main():
    """Main entry point."""
    print("=" * 60)
    print("Card Catalog POS - Clear Singles Inventory")
    print("=" * 60)
    print()
    print("This script will delete all singles from inventory.")
    print("Sealed products, supplies, and other items will be kept.")
    print()
    
    clear_singles_inventory()


if __name__ == "__main__":
    main()
