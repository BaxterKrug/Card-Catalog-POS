#!/usr/bin/env python3
"""
Clear Buylist Transaction Data

This script will:
1. Delete all buylist transactions
2. Keep all customer records

USE WITH CAUTION: This will permanently delete buylist transaction history!
"""

from checkoutdesignator.database import init_db, session_scope
from checkoutdesignator.models import BuylistTransaction
from sqlmodel import select


def clear_buylist_transactions():
    """Clear all buylist transactions."""
    init_db()
    
    print("🧹 Clearing buylist transaction data...\n")
    
    with session_scope() as session:
        # 1. Find all transactions
        transactions_statement = select(BuylistTransaction)
        transactions = session.exec(transactions_statement).all()
        transaction_count = len(transactions)
        
        if transaction_count == 0:
            print("✅ No buylist transactions found - nothing to delete!")
            return
        
        print(f"📊 Found {transaction_count} buylist transactions")
        print()
        
        # Calculate totals
        total_cash = sum(t.amount_cents for t in transactions if t.payment_method == "cash")
        total_credit = sum(t.amount_cents for t in transactions if t.payment_method == "store_credit")
        
        print(f"Summary of transactions to be deleted:")
        print(f"   - Total cash paid: ${total_cash / 100:.2f}")
        print(f"   - Total store credit given: ${total_credit / 100:.2f}")
        print()
        
        # Confirm deletion
        print("⚠️  WARNING: This will permanently delete:")
        print(f"   - {transaction_count} buylist transactions")
        print()
        print("✅ Will keep:")
        print("   - All customer records")
        print("   - All customer store credit balances (not adjusted)")
        print()
        print("NOTE: This only deletes transaction history.")
        print("Customer store credit balances will NOT be affected.")
        print()
        
        response = input("Are you sure you want to continue? Type 'YES' to confirm: ")
        
        if response.strip() != "YES":
            print("❌ Aborted - no changes made")
            return
        
        print("\n🗑️  Deleting transactions...\n")
        
        # 2. Delete all transactions
        for transaction in transactions:
            session.delete(transaction)
        
        print(f"✅ Deleted {transaction_count} buylist transactions")
        
        # Commit all changes
        session.commit()
        
        print("\n✨ Buylist transactions cleared!")
        print("\n📋 Summary:")
        print(f"   - Deleted {transaction_count} transactions")
        print(f"   - All customers kept intact")
        print("\n🚀 Ready for production buylist tracking!")


def main():
    """Main entry point."""
    print("=" * 60)
    print("Card Catalog POS - Clear Buylist Transactions")
    print("=" * 60)
    print()
    print("This script will delete all buylist transaction history.")
    print("Customer records will remain intact.")
    print()
    
    clear_buylist_transactions()


if __name__ == "__main__":
    main()
