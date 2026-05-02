# Store Credit External API Integration Guide

## Current Implementation

The store credit system is currently **fully functional** and stores all data in your local SQLite database. All operations work without any external dependencies.

## Available API Endpoints

### 1. Check Customer Balance
```bash
GET /api/customers/{customer_id}/store-credit/balance
```

**Example:**
```bash
curl http://localhost:8000/api/customers/5/store-credit/balance

# Response:
{
  "customer_id": 5,
  "balance_cents": 2500,
  "balance_dollars": 25.00
}
```

### 2. Get Transaction History
```bash
GET /api/customers/{customer_id}/store-credit/history
```

**Example:**
```bash
curl http://localhost:8000/api/customers/5/store-credit/history?limit=10
```

### 3. From JavaScript/TypeScript (Frontend)
```typescript
import { getStoreCreditBalance } from './api/storeCredit';

// Check balance
const balance = await getStoreCreditBalance(customerId);
console.log(`Balance: $${balance.balance_dollars}`);
```

### 4. From Python (Backend/Scripts)
```python
from checkoutdesignator.database import engine
from checkoutdesignator.services import store_credit as store_credit_service
from sqlmodel import Session

with Session(engine) as session:
    balance = store_credit_service.get_credit_balance(session, customer_id=5)
    print(f"Balance: ${balance/100:.2f}")
    
    # Get history
    history = store_credit_service.get_credit_history(session, customer_id=5)
    for txn in history:
        print(f"{txn.transaction_type}: ${txn.amount_cents/100:.2f}")
```

---

## Syncing to External API/Database

If you need to sync store credit data with an external system (e.g., another database, third-party service, or accounting system), you have several options:

### Option 1: Batch Sync Script (Recommended for Start)

Use the provided script to periodically sync data:

```bash
# Sync all customer balances
python scripts/sync_store_credit_to_external.py --sync-balances

# Sync recent transactions
python scripts/sync_store_credit_to_external.py --sync-transactions --limit 100

# Check external balance for a customer
python scripts/sync_store_credit_to_external.py --check-customer 5
```

**Setup:**
1. Edit `scripts/sync_store_credit_to_external.py`
2. Set your external API URL and authentication
3. Run manually or schedule with cron:
   ```bash
   # Run every 5 minutes
   */5 * * * * cd /path/to/project && python scripts/sync_store_credit_to_external.py --sync-balances
   ```

### Option 2: Real-Time Sync (Advanced)

For real-time syncing whenever store credit changes:

1. **Set environment variables:**
   ```bash
   export ENABLE_EXTERNAL_SYNC=true
   export EXTERNAL_API_URL=https://your-api.com/api
   export EXTERNAL_API_KEY=your-secret-key
   ```

2. **Modify the service layer:**
   - See `docs/EXTERNAL_SYNC_EXAMPLE.py` for code examples
   - Add sync calls after each database operation
   - Handle errors gracefully (don't fail transactions if external sync fails)

3. **Recommended approach:**
   ```python
   # After updating balance in database
   session.flush()
   
   # Sync to external (non-blocking, log errors)
   try:
       sync_to_external_api(customer_id, balance_cents)
   except Exception as e:
       logger.warning(f"External sync failed: {e}")
       # Don't fail the transaction
   ```

### Option 3: Webhook/Event System

Create a webhook that gets called after store credit changes:

1. Add a webhook URL to config
2. POST transaction data to webhook after each change
3. External system handles the incoming data

---

## Integration Examples

### Example 1: Sync to Another Database
```python
import psycopg2  # or pymysql, etc.

def sync_to_postgres(customer_id, balance_cents):
    conn = psycopg2.connect("postgresql://user:pass@host/db")
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO store_credit (customer_id, balance_cents, updated_at) "
        "VALUES (%s, %s, NOW()) "
        "ON CONFLICT (customer_id) DO UPDATE SET balance_cents = %s, updated_at = NOW()",
        (customer_id, balance_cents, balance_cents)
    )
    conn.commit()
    conn.close()
```

### Example 2: Sync to Shopify/WooCommerce/etc
```python
import requests

def sync_to_shopify(customer_id, balance_cents):
    # Map local customer ID to Shopify customer ID
    shopify_customer_id = get_shopify_id(customer_id)
    
    response = requests.put(
        f"https://your-store.myshopify.com/admin/api/2024-01/customers/{shopify_customer_id}.json",
        headers={
            "X-Shopify-Access-Token": SHOPIFY_TOKEN,
            "Content-Type": "application/json",
        },
        json={
            "customer": {
                "metafields": [
                    {
                        "key": "store_credit_balance",
                        "value": str(balance_cents),
                        "type": "number_integer",
                        "namespace": "custom"
                    }
                ]
            }
        }
    )
    return response.json()
```

### Example 3: Query External API Before Local DB
```python
def get_balance_with_external_fallback(customer_id):
    # Try external API first
    try:
        response = requests.get(f"{EXTERNAL_API}/balance/{customer_id}")
        if response.ok:
            return response.json()["balance_cents"]
    except:
        pass
    
    # Fall back to local database
    with Session(engine) as session:
        return store_credit_service.get_credit_balance(session, customer_id)
```

---

## Security Considerations

1. **API Keys**: Store API keys in environment variables, never commit to git
2. **HTTPS Only**: Always use HTTPS for external API calls
3. **Authentication**: Use proper authentication (API keys, OAuth, JWT)
4. **Rate Limiting**: Implement rate limiting for external calls
5. **Error Handling**: Log failures but don't expose sensitive data to users
6. **Timeouts**: Set reasonable timeouts (5-10 seconds) for external calls
7. **Retry Logic**: Consider retry with exponential backoff for transient failures

---

## Testing

### Test Local API
```bash
# Start the server
./start.sh

# In another terminal, test endpoints
curl http://localhost:8000/api/customers/1/store-credit/balance
```

### Test External Sync
```bash
# Dry run (check configuration)
python scripts/sync_store_credit_to_external.py --check-customer 1

# Sync a few records (test mode)
python scripts/sync_store_credit_to_external.py --sync-transactions --limit 5
```

---

## Troubleshooting

**Q: How do I check if external sync is enabled?**
```bash
echo $ENABLE_EXTERNAL_SYNC
echo $EXTERNAL_API_URL
```

**Q: External sync is failing, but I don't want it to break my POS**
A: This is correct behavior! The system continues working even if external sync fails. Check logs for error messages.

**Q: How do I see sync errors?**
A: Errors are printed to stdout/stderr. Redirect to a log file:
```bash
python scripts/sync_store_credit_to_external.py --sync-balances 2>&1 | tee sync.log
```

**Q: Can I sync to multiple external systems?**
A: Yes! Call multiple sync functions in sequence or parallel. Each should handle errors independently.

---

## Summary

✅ **Current state**: Fully functional store credit system using local SQLite database  
✅ **API endpoints**: Available at `/api/customers/{id}/store-credit/*`  
⚙️ **External sync**: Optional - implement batch or real-time as needed  
🔒 **Security**: Use environment variables for credentials  
📊 **Monitoring**: Log all sync operations for debugging  

For questions, see the example scripts or check the source code in:
- `checkoutdesignator/services/store_credit.py` (business logic)
- `checkoutdesignator/routers/store_credit.py` (API endpoints)
- `frontend/src/api/storeCredit.ts` (frontend client)
