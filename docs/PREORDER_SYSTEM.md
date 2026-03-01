# Pre-Order System Documentation

## Overview

The Card Catalog POS pre-order system provides comprehensive management of product pre-orders with separate inventory tracking, quantity limits, payment recording, and automatic inventory release capabilities.

## Key Features

### 1. Separate Inventory Management
Pre-orders maintain their own inventory pool separate from main store inventory. This prevents overselling and ensures that allocated pre-order stock doesn't interfere with regular sales.

**PreorderItem Fields:**
- `preorder_quantity`: Total units allocated specifically for this pre-order
- `preorder_quantity_allocated`: Units claimed by customers
- `preorder_available_quantity`: Computed property showing unclaimed pre-order units
- `quantity_cap`: Optional maximum number of claims allowed (can be less than preorder_quantity to reserve some for walk-ins)

### 2. Quantity Cap Enforcement
The system prevents employees from selling more than the allocated quantity:
- `quantity_cap` sets the maximum number of units that can be claimed
- Cap can be less than `preorder_quantity` to reserve inventory for in-store customers
- System validates claims against the cap to prevent overselling
- Cannot exceed limited allocation

### 3. Payment Tracking (Stored in Perpetuity)
All payment information is permanently stored for audit and accounting purposes:

**PreorderClaim Payment Fields:**
- `is_paid`: Boolean flag for payment status
- `payment_amount_cents`: Amount paid in cents (stored as integer)
- `payment_method`: Payment type (cash, credit_card, debit_card, store_credit, check, other)
- `payment_date`: Timestamp when payment was recorded
- `payment_notes`: Optional notes about the payment

**Important:** Payment data is never deleted and remains in the database permanently for accounting and legal compliance.

### 4. Inventory Release
When a pre-order product arrives (on or after release date), remaining unclaimed inventory can be released to main inventory:

```python
# Releases available preorder stock to physical inventory
release_preorder_to_inventory(session, preorder_item_id, release_request)
```

This automatically:
- Moves unclaimed preorder units to physical inventory
- Records an inventory adjustment with reason "RECEIVE"
- Keeps allocated (claimed) units in preorder tracking
- Prevents double-counting inventory

## Data Models

### PreorderItem
```python
class PreorderItem:
    id: int
    inventory_item_id: int  # Links to main InventoryItem
    release_date: date | None
    preorder_quantity: int  # Total allocated for preorder
    preorder_quantity_allocated: int  # Amount claimed
    quantity_cap: int | None  # Max claims allowed
    notes: str | None
    created_at: datetime
    updated_at: datetime
```

### PreorderClaim
```python
class PreorderClaim:
    id: int
    preorder_item_id: int
    customer_id: int
    quantity_requested: int
    quantity_allocated: int
    status: PreorderClaimStatus  # WAITING, ALLOCATED, FULFILLED, CANCELLED
    
    # Payment tracking (permanent)
    is_paid: bool
    payment_amount_cents: int | None
    payment_method: PaymentMethod | None
    payment_date: datetime | None
    payment_notes: str | None
    
    created_at: datetime
    updated_at: datetime
```

## API Endpoints

### Preorder Items

**List all preorder items:**
```
GET /api/preorders/items
```

**Create a preorder item:**
```
POST /api/preorders/items
Body: {
  "inventory_item_id": 123,
  "release_date": "2026-04-15",
  "preorder_quantity": 50,
  "quantity_cap": 40,
  "notes": "Limited edition with promo"
}
```

**Update a preorder item:**
```
PATCH /api/preorders/items/{item_id}
Body: {
  "preorder_quantity": 60,
  "quantity_cap": 50
}
```

**Release preorder to main inventory:**
```
POST /api/preorders/items/{item_id}/release
Body: {
  "note": "Product received from distributor"
}
```

### Preorder Claims

**List all claims:**
```
GET /api/preorders/claims
```

**Create a claim:**
```
POST /api/preorders/claims
Body: {
  "preorder_item_id": 1,
  "customer_id": 5,
  "quantity_requested": 2
}
```

**Update a claim:**
```
PATCH /api/preorders/claims/{claim_id}
Body: {
  "quantity_requested": 3,
  "status": "ALLOCATED"
}
```

**Record payment:**
```
POST /api/preorders/claims/{claim_id}/payment
Body: {
  "is_paid": true,
  "payment_amount_cents": 29999,
  "payment_method": "credit_card",
  "payment_notes": "Paid in full"
}
```

**Cancel a claim:**
```
POST /api/preorders/claims/{claim_id}/cancel
```

**Fulfill a claim:**
```
POST /api/preorders/claims/{claim_id}/fulfill
Body: {
  "mark_picked_up": true,
  "note": "Customer picked up"
}
```

## Workflows

### Creating a Pre-Order

1. **Set up the preorder item:**
   - Create an `InventoryItem` for the product (if not exists)
   - Create a `PreorderItem` with:
     - `preorder_quantity`: How many units you've allocated
     - `quantity_cap`: Maximum claims allowed (protects against overselling)
     - `release_date`: Expected availability date

2. **Customer places claim:**
   - Create a `PreorderClaim` with customer and quantity
   - System validates against quantity cap
   - System allocates from preorder inventory
   - Reserves units in main inventory (prevents double-selling)

3. **Record payment:**
   - Use `/claims/{id}/payment` endpoint
   - Record full or partial payment
   - Payment data stored permanently

4. **Release to inventory:**
   - When product arrives, use `/items/{id}/release`
   - Unclaimed units move to physical inventory
   - Claimed units stay in preorder tracking

5. **Fulfill orders:**
   - When customer picks up, use `/claims/{id}/fulfill`
   - Reduces physical inventory
   - Marks claim as FULFILLED

### Example: Magic: The Gathering Set Release

```python
# Step 1: Create preorder item
# You've secured 50 boxes but only want to pre-sell 40
preorder_item = create_preorder_item({
    "inventory_item_id": 789,
    "release_date": "2026-06-01",
    "preorder_quantity": 50,
    "quantity_cap": 40,  # Save 10 for walk-ins
    "notes": "Modern Horizons 4 - limited allocation"
})

# Step 2: Customer pre-orders 2 boxes
claim = create_preorder_claim({
    "preorder_item_id": preorder_item.id,
    "customer_id": 123,
    "quantity_requested": 2
})

# Step 3: Customer pays deposit
record_payment({
    "is_paid": True,
    "payment_amount_cents": 10000,  # $100 deposit
    "payment_method": "credit_card",
    "payment_notes": "50% deposit, balance due at pickup"
})

# Step 4: Product arrives on release date
release_to_inventory({
    "note": "Received shipment from distributor"
})
# Now 8 unclaimed boxes are in physical inventory

# Step 5: Customer picks up
fulfill_claim({
    "mark_picked_up": True,
    "note": "Customer paid remaining balance"
})
```

## Business Rules

1. **Quantity Cap Protection:**
   - System will reject claims that would exceed `quantity_cap`
   - Protects against overselling limited allocations
   - Allows reserving some inventory for walk-in customers

2. **Separate Inventory Pools:**
   - Preorder inventory is tracked separately
   - Main inventory isn't affected until release
   - Prevents confusion between preorder and regular stock

3. **Payment Audit Trail:**
   - All payment information is permanent
   - Never deleted even if claim is cancelled
   - Maintains complete financial history

4. **Inventory Reservation:**
   - Claims reserve units in main inventory
   - Prevents selling preorder stock as regular inventory
   - Released automatically when claim is fulfilled or cancelled

5. **Status Workflow:**
   - WAITING → claim created, not yet allocated
   - ALLOCATED → inventory set aside for customer
   - FULFILLED → customer picked up
   - CANCELLED → claim cancelled, inventory released

## Frontend Integration

The frontend provides React hooks for easy integration:

```typescript
import {
  usePreorderItems,
  usePreorderClaims,
  useCreatePreorderItem,
  useRecordPreorderPayment,
  useReleasePreorderToInventory,
} from '../hooks/usePreorders';

// In your component
const { data: items } = usePreorderItems();
const createItem = useCreatePreorderItem();
const recordPayment = useRecordPreorderPayment();

// Create preorder
createItem.mutate({
  inventory_item_id: 123,
  preorder_quantity: 50,
  quantity_cap: 40,
  release_date: "2026-06-01"
});

// Record payment
recordPayment.mutate({
  claimId: 5,
  payment: {
    is_paid: true,
    payment_amount_cents: 29999,
    payment_method: "credit_card"
  }
});
```

## Migration

Run the migration script to add new fields to existing database:

```bash
python scripts/migrate_preorder_enhancements.py
```

This adds:
- `preorder_quantity` and `preorder_quantity_allocated` to `preorderitem`
- Payment tracking fields to `preorderclaim`
- Index on `is_paid` for performance

## Testing

Comprehensive test suite available:

```bash
python scripts/test_preorder_enhancements.py
```

Tests verify:
- Separate inventory tracking
- Quantity cap enforcement
- Payment recording
- Inventory release
- Overselling prevention

## Summary

The enhanced pre-order system provides:
✅ Separate inventory pools for pre-orders
✅ Quantity cap enforcement to prevent overselling
✅ Permanent payment tracking for audit compliance
✅ Automatic inventory release on product arrival
✅ Complete claim lifecycle management
✅ Protection against allocation errors

This system ensures you can confidently manage limited allocation products without risk of overselling or inventory confusion.
