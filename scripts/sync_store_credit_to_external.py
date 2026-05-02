"""
Sync store credit data to external API/database.

This script demonstrates how to query store credit from the local database
and push updates to an external system.
"""
import os
import sys
import requests
from sqlmodel import Session, select

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from checkoutdesignator.database import engine
from checkoutdesignator.models import Customer, StoreCreditTransaction


# Configuration for your external API
EXTERNAL_API_URL = os.getenv("EXTERNAL_API_URL", "https://api.example.com")
EXTERNAL_API_KEY = os.getenv("EXTERNAL_API_KEY", "your-api-key-here")


def sync_customer_balance_to_external(customer_id: int, balance_cents: int):
    """Send customer balance to external API."""
    try:
        response = requests.post(
            f"{EXTERNAL_API_URL}/store-credit/balance",
            headers={
                "Authorization": f"Bearer {EXTERNAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "customer_id": customer_id,
                "balance_cents": balance_cents,
                "balance_dollars": balance_cents / 100.0,
            },
            timeout=10,
        )
        response.raise_for_status()
        print(f"✓ Synced customer {customer_id}: ${balance_cents/100:.2f}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"✗ Failed to sync customer {customer_id}: {e}")
        return False


def sync_transaction_to_external(transaction: StoreCreditTransaction):
    """Send transaction to external API."""
    try:
        response = requests.post(
            f"{EXTERNAL_API_URL}/store-credit/transactions",
            headers={
                "Authorization": f"Bearer {EXTERNAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "id": transaction.id,
                "customer_id": transaction.customer_id,
                "transaction_type": transaction.transaction_type,
                "amount_cents": transaction.amount_cents,
                "reference_type": transaction.reference_type,
                "reference_id": transaction.reference_id,
                "created_by_user_id": transaction.created_by_user_id,
                "created_at": transaction.created_at.isoformat(),
                "notes": transaction.notes,
            },
            timeout=10,
        )
        response.raise_for_status()
        print(f"✓ Synced transaction {transaction.id}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"✗ Failed to sync transaction {transaction.id}: {e}")
        return False


def sync_all_balances():
    """Sync all customer balances to external system."""
    with Session(engine) as session:
        # Get all customers with store credit
        statement = select(Customer).where(Customer.store_credit_balance_cents > 0)
        customers = session.exec(statement).all()
        
        print(f"Syncing {len(customers)} customers with store credit...")
        
        success_count = 0
        for customer in customers:
            if sync_customer_balance_to_external(customer.id, customer.store_credit_balance_cents):
                success_count += 1
        
        print(f"\nSynced {success_count}/{len(customers)} customers successfully")


def sync_recent_transactions(limit: int = 100):
    """Sync recent transactions to external system."""
    with Session(engine) as session:
        statement = (
            select(StoreCreditTransaction)
            .order_by(StoreCreditTransaction.created_at.desc())
            .limit(limit)
        )
        transactions = session.exec(statement).all()
        
        print(f"Syncing {len(transactions)} recent transactions...")
        
        success_count = 0
        for txn in transactions:
            if sync_transaction_to_external(txn):
                success_count += 1
        
        print(f"\nSynced {success_count}/{len(transactions)} transactions successfully")


def check_external_balance(customer_id: int):
    """Query store credit balance from external API."""
    try:
        response = requests.get(
            f"{EXTERNAL_API_URL}/store-credit/balance/{customer_id}",
            headers={
                "Authorization": f"Bearer {EXTERNAL_API_KEY}",
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        print(f"External balance for customer {customer_id}: ${data['balance_cents']/100:.2f}")
        return data
    except requests.exceptions.RequestException as e:
        print(f"Failed to query external API: {e}")
        return None


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Sync store credit data to external API")
    parser.add_argument("--sync-balances", action="store_true", help="Sync all customer balances")
    parser.add_argument("--sync-transactions", action="store_true", help="Sync recent transactions")
    parser.add_argument("--check-customer", type=int, help="Check external balance for customer ID")
    parser.add_argument("--limit", type=int, default=100, help="Limit for transaction sync")
    
    args = parser.parse_args()
    
    if args.sync_balances:
        sync_all_balances()
    elif args.sync_transactions:
        sync_recent_transactions(args.limit)
    elif args.check_customer:
        check_external_balance(args.check_customer)
    else:
        parser.print_help()
