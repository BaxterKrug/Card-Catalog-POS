# Order System Guide

## Overview

The Card Catalog POS now has a complete order creation system that allows you to create customer orders with multiple products, track inventory, and manage order status.

## Setup

### 1. Ensure You Have Test Data

Before creating orders, make sure you have:

**Customers:**
```bash
cd "/home/baxterkrug/Documents/Card Catalog POS"
.venv/bin/python scripts/seed_test_customers.py
```

**Inventory Items:**
Use the Inventory page in the UI to add products via the "Quick add a SKU" form.

### 2. Start the Application

```bash
cd "/home/baxterkrug/Documents/Card Catalog POS"
bash start.sh
```

Then open http://localhost:5173 in your browser and log in.

## Creating an Order

### Step-by-Step Process:

1. **Navigate to Orders Page**
   - Click "Orders" in the left sidebar
   - Click the "New order" button

2. **Select a Customer** (Required)
   - Choose a customer from the dropdown
   - Customers must be created first (use the Customers page or seed script)

3. **Add Products to the Order**
   
   **Method 1: Search**
   - Type in the search box to find products by SKU or name
   - Click on a product from the search results to add it to the cart
   - Only products with available inventory will appear

   **Method 2: Barcode Scanner**
   - Click the scan icon (📷) next to the search box
   - Allow camera access when prompted
   - Point camera at a product barcode
   - Product will automatically be added to cart when scanned

4. **Adjust Quantities**
   - Use the + and − buttons to adjust quantities
   - Maximum quantity is limited to available inventory
   - Click the trash icon to remove an item from the cart

5. **Add Notes** (Optional)
   - Add any special instructions or notes in the text area
   - Examples: "Gift wrap", "Hold for pickup", "Priority shipping"

6. **Review Total**
   - The total price is calculated automatically at the bottom
   - Shows sum of all items × quantities × unit prices

7. **Create the Order**
   - Click "Create Order" button
   - Order will be created and submitted in one step
   - Inventory quantities will be automatically allocated

## Order Features

### Automatic Inventory Management
- When an order is submitted, inventory is automatically allocated
- `allocated_quantity` increases for each item
- `available_quantity` decreases accordingly
- Orders can only be created if sufficient inventory is available

### Order Status Lifecycle
- **DRAFT**: Initial state (not currently used in UI - orders go straight to SUBMITTED)
- **SUBMITTED**: Order has been placed and is awaiting fulfillment
- **COMPLETED**: Order has been fulfilled
- **CANCELLED**: Order has been cancelled

### Real-Time Updates
- Order list refreshes automatically after creating a new order
- Inventory quantities update in real-time
- TanStack Query handles caching and invalidation

## Order Information Display

The Orders page shows:
- **Order ID**: Unique identifier for each order
- **Customer**: Customer ID (name display coming soon)
- **Total**: Calculated from all order items
- **Status**: Current order status with clock icon
- **Actions**: "Open" button (detail view coming soon)

## API Endpoints Used

The order system uses these backend endpoints:

```
POST   /api/orders/              - Create a new order
POST   /api/orders/{id}/items    - Add items to an order
POST   /api/orders/{id}/submit   - Submit an order
POST   /api/orders/{id}/status   - Update order status
GET    /api/orders/              - List all orders
```

## Troubleshooting

### "Please select a customer" Error
- Make sure you have customers in the database
- Run `seed_test_customers.py` or create customers via the Customers page

### "Please add at least one item" Error
- You must add at least one product to the cart before creating an order
- Make sure you have inventory items with available quantity > 0

### No Products in Search Results
- Verify you have inventory items in the database
- Check that inventory items have `available_quantity > 0`
- Only available items can be added to orders

### "No inventory item found with SKU" Error (Barcode)
- The scanned barcode doesn't match any product SKU
- Make sure products are added with correct SKUs
- Try manual search instead

## Future Enhancements

- [ ] Order detail view with full item breakdown
- [ ] Customer name display in order list
- [ ] Edit/cancel orders
- [ ] Order status workflow (mark as completed, etc.)
- [ ] Print receipts/invoices
- [ ] Payment processing integration
- [ ] Order history and reporting
- [ ] Bulk order operations
- [ ] Customer order history view
