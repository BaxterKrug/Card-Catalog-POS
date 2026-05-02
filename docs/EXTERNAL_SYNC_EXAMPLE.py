"""
Example: Add real-time sync to store credit service.

To enable automatic syncing whenever store credit changes, you can modify
the store_credit service to call an external API after each operation.
"""

# Add this to checkoutdesignator/services/store_credit.py
# OR create a new sync service that gets called after operations

import os
import requests
from typing import Optional

EXTERNAL_API_URL = os.getenv("EXTERNAL_API_URL", "")
EXTERNAL_API_KEY = os.getenv("EXTERNAL_API_KEY", "")
ENABLE_EXTERNAL_SYNC = os.getenv("ENABLE_EXTERNAL_SYNC", "false").lower() == "true"


def sync_balance_to_external_api(customer_id: int, balance_cents: int) -> bool:
    """
    Push balance update to external API in real-time.
    
    Returns True if successful, False otherwise.
    """
    if not ENABLE_EXTERNAL_SYNC or not EXTERNAL_API_URL:
        return True  # Skip if not configured
    
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
            timeout=5,  # Short timeout for real-time sync
        )
        response.raise_for_status()
        return True
    except Exception as e:
        # Log error but don't fail the transaction
        print(f"Warning: Failed to sync to external API: {e}")
        return False


def sync_transaction_to_external_api(transaction_data: dict) -> bool:
    """
    Push transaction to external API in real-time.
    
    Returns True if successful, False otherwise.
    """
    if not ENABLE_EXTERNAL_SYNC or not EXTERNAL_API_URL:
        return True  # Skip if not configured
    
    try:
        response = requests.post(
            f"{EXTERNAL_API_URL}/store-credit/transactions",
            headers={
                "Authorization": f"Bearer {EXTERNAL_API_KEY}",
                "Content-Type": "application/json",
            },
            json=transaction_data,
            timeout=5,
        )
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"Warning: Failed to sync transaction to external API: {e}")
        return False


# ===================================================================
# MODIFIED add_store_credit() function with external sync
# ===================================================================

def add_store_credit_with_sync(
    session,
    customer_id: int,
    amount_cents: int,
    transaction_type,
    user_id: int,
    reference_type: Optional[str] = None,
    reference_id: Optional[int] = None,
    notes: Optional[str] = None,
):
    """
    Add store credit with automatic external API sync.
    
    This is an example showing how to modify the existing service.
    """
    from checkoutdesignator.models import Customer, StoreCreditTransaction, utcnow
    from checkoutdesignator.exceptions import ValidationError, NotFoundError
    
    if amount_cents <= 0:
        raise ValidationError("Amount must be positive")
    
    # Verify customer exists
    customer = session.get(Customer, customer_id)
    if not customer:
        raise NotFoundError(f"Customer {customer_id} not found")
    
    # Create transaction record
    transaction = StoreCreditTransaction(
        customer_id=customer_id,
        transaction_type=transaction_type,
        amount_cents=amount_cents,
        reference_type=reference_type,
        reference_id=reference_id,
        created_by_user_id=user_id,
        notes=notes,
    )
    session.add(transaction)
    
    # Update customer balance
    customer.store_credit_balance_cents += amount_cents
    customer.updated_at = utcnow()
    session.add(customer)
    
    session.flush()
    
    # Sync to external API after successful database update
    sync_balance_to_external_api(customer_id, customer.store_credit_balance_cents)
    sync_transaction_to_external_api({
        "id": transaction.id,
        "customer_id": customer_id,
        "transaction_type": str(transaction_type),
        "amount_cents": amount_cents,
        "reference_type": reference_type,
        "reference_id": reference_id,
        "created_by_user_id": user_id,
        "notes": notes,
    })
    
    return transaction


# ===================================================================
# ENVIRONMENT VARIABLES TO SET
# ===================================================================
"""
Add these to your .env file:

ENABLE_EXTERNAL_SYNC=true
EXTERNAL_API_URL=https://your-external-api.com/api
EXTERNAL_API_KEY=your-secret-api-key

Or set them in the system environment:
export ENABLE_EXTERNAL_SYNC=true
export EXTERNAL_API_URL=https://your-external-api.com/api
export EXTERNAL_API_KEY=your-secret-api-key
"""
