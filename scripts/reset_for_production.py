#!/usr/bin/env python3
"""
Reset Orders and Pre-orders for Production

This script will:
1. Delete all test orders and order items
2. Delete all pre-order claims
3. Delete all pre-order orders
4. Optionally delete pre-order items (or keep them for upcoming releases)
5. Reset inventory allocated quantities to 0
6. Keep customers, users, and inventory items

USE WITH CAUTION: This will permanently delete order and pre-order data!
"""

from checkoutdesignator.database import init_db, session_scope
from checkoutdesignator.models import (
    Order,
    OrderItem,
    OrderPayment,
    PreorderClaim,
    PreorderOrder,
    PreorderItem,
    InventoryItem,
)
from sqlmodel import select


def reset_for_production(delete_preorder_items: bool = False):
    """
    Reset orders and pre-orders for production.
    
    Args:
        delete_preorder_items: If True, also delete pre-order items. 
                               If False, keep them but reset allocated quantities.
    """
    init_db()
    
    print("🧹 Resetting database for production...\n")
    
    with session_scope() as session:
        # 1. Count existing data
        order_count = len(session.exec(select(Order)).all())
        order_item_count = len(session.exec(select(OrderItem)).all())
        order_payment_count = len(session.exec(select(OrderPayment)).all())
        preorder_claim_count = len(session.exec(select(PreorderClaim)).all())
        preorder_order_count = len(session.exec(select(PreorderOrder)).all())
        preorder_item_count = len(session.exec(select(PreorderItem)).all())
        
        print(f"📊 Current data:")
        print(f"   Orders: {order_count}")
        print(f"   Order Items: {order_item_count}")
        print(f"   Order Payments: {order_payment_count}")
        print(f"   Pre-order Claims: {preorder_claim_count}")
        print(f"   Pre-order Orders: {preorder_order_count}")
        print(f"   Pre-order Items: {preorder_item_count}")
        print()
        
        if order_count == 0 and preorder_claim_count == 0 and (not delete_preorder_items or preorder_item_count == 0):
            print("✅ Database is already clean - nothing to delete!")
            return
        
        # Confirm deletion
        print("⚠️  WARNING: This will permanently delete:")
        print(f"   - {order_count} orders")
        print(f"   - {order_item_count} order items")
        print(f"   - {order_payment_count} order payments")
        print(f"   - {preorder_claim_count} pre-order claims")
        print(f"   - {preorder_order_count} pre-order orders")
        if delete_preorder_items:
            print(f"   - {preorder_item_count} pre-order items")
        print()
        print("✅ Will keep:")
        print("   - All customers")
        print("   - All users")
        print("   - All inventory items")
        print("   - All buylist transactions")
        if not delete_preorder_items:
            print("   - All pre-order items (but will reset allocated quantities)")
        print()
        
        response = input("Are you sure you want to continue? Type 'YES' to confirm: ")
        
        if response.strip() != "YES":
            print("❌ Aborted - no changes made")
            return
        
        print("\n🗑️  Deleting data...\n")
        
        # 2. Delete Order Payments (must delete before Orders due to foreign key)
        if order_payment_count > 0:
            order_payments = session.exec(select(OrderPayment)).all()
            for payment in order_payments:
                session.delete(payment)
            print(f"✅ Deleted {order_payment_count} order payments")
        
        # 3. Delete Order Items (must delete before Orders due to foreign key)
        if order_item_count > 0:
            order_items = session.exec(select(OrderItem)).all()
            for item in order_items:
                session.delete(item)
            print(f"✅ Deleted {order_item_count} order items")
        
        # 4. Delete Orders
        if order_count > 0:
            orders = session.exec(select(Order)).all()
            for order in orders:
                session.delete(order)
            print(f"✅ Deleted {order_count} orders")
        
        # 5. Delete Pre-order Claims
        if preorder_claim_count > 0:
            claims = session.exec(select(PreorderClaim)).all()
            for claim in claims:
                session.delete(claim)
            print(f"✅ Deleted {preorder_claim_count} pre-order claims")
        
        # 6. Delete Pre-order Orders
        if preorder_order_count > 0:
            preorder_orders = session.exec(select(PreorderOrder)).all()
            for po in preorder_orders:
                session.delete(po)
            print(f"✅ Deleted {preorder_order_count} pre-order orders")
        
        # 7. Optionally delete Pre-order Items
        if delete_preorder_items and preorder_item_count > 0:
            preorder_items = session.exec(select(PreorderItem)).all()
            for item in preorder_items:
                session.delete(item)
            print(f"✅ Deleted {preorder_item_count} pre-order items")
        
        # 8. Reset inventory allocated quantities
        inventory_items = session.exec(select(InventoryItem)).all()
        reset_count = 0
        for item in inventory_items:
            if item.allocated_quantity > 0:
                item.allocated_quantity = 0
                session.add(item)
                reset_count += 1
        
        if reset_count > 0:
            print(f"✅ Reset allocated quantity for {reset_count} inventory items")
        
        # Commit all changes
        session.commit()
        
        print("\n✨ Database reset complete!")
        print("\n📋 Summary:")
        print(f"   - Deleted all orders and order items")
        print(f"   - Deleted all pre-order claims and orders")
        if delete_preorder_items:
            print(f"   - Deleted all pre-order items")
        else:
            print(f"   - Kept pre-order items (ready for upcoming releases)")
        print(f"   - Reset inventory allocations")
        print(f"   - Kept all customers, users, and inventory")
        print("\n🚀 Ready for production!")


def main():
    """Main entry point with user options."""
    print("=" * 60)
    print("Card Catalog POS - Production Reset")
    print("=" * 60)
    print()
    print("This script will clean up test data and prepare for production.")
    print()
    print("Options:")
    print("1. Delete orders/pre-orders, KEEP pre-order items (recommended)")
    print("   - Good if you have upcoming releases configured")
    print("2. Delete orders/pre-orders AND pre-order items (full reset)")
    print("   - Good if you want to start completely fresh")
    print("3. Cancel")
    print()
    
    choice = input("Enter your choice (1, 2, or 3): ").strip()
    
    if choice == "1":
        reset_for_production(delete_preorder_items=False)
    elif choice == "2":
        reset_for_production(delete_preorder_items=True)
    elif choice == "3":
        print("❌ Cancelled - no changes made")
    else:
        print("❌ Invalid choice - no changes made")


if __name__ == "__main__":
    main()
