# Preorder Set Feature

## Overview

The **Preorder Set** feature allows you to create multiple preorder products at once that share common details like game title, release date, and notes. This is particularly useful when setting up an entire product line for a new game release (e.g., different booster box types for a new Magic: The Gathering set).

## When to Use

Use **Preorder Sets** when:
- Setting up multiple products for the same game release
- All products share the same release date
- All products are part of the same category (e.g., all sealed products)
- You want to save time by entering shared details only once

Use **Individual Preorder Products** when:
- Adding a single product
- Products have different release dates
- Products are from different games

## How It Works

### Creating a Preorder Set

1. Navigate to the **Preorders** page
2. Click the **"New Preorder Set"** button (highlighted in green)
3. Fill in the shared details:
   - **Game/System**: The game name (e.g., "Magic: The Gathering - Modern Horizons 4")
   - **Release Date**: When the products will be available (optional)
   - **Notes**: Any shared notes for all products (optional)

4. For each product in the set, enter:
   - **Product Name**: Full name of the product (e.g., "Modern Horizons 4 - Booster Box")
   - **SKU**: Product identifier (e.g., "MH4-BB-001")
   - **MSRP ($)**: Manufacturer's suggested retail price (optional)
   - **Allocated Units**: How many units you're expecting to receive for preorder
   - **Per Customer**: Maximum units each customer can order

5. Click **"+ Add Another Product"** to add more products to the set
6. Click **"Create Preorder Set"** to save all products at once

### What Gets Created

When you create a preorder set, the system:
1. Creates an inventory item for each product with:
   - Physical quantity set to 0 (unreleased)
   - The shared game title
   - Category set to "sealed"
   
2. Creates a preorder item for each product with:
   - The shared release date
   - The shared notes
   - Individual preorder quantities and customer limits

## Example Use Case

**Setting up Modern Horizons 4 Release:**

**Shared Details:**
- Game: "Magic: The Gathering - Modern Horizons 4"
- Release Date: June 15, 2026
- Notes: "Summer 2026 release - limited allocation"

**Products:**
1. **Booster Box**
   - SKU: MH4-BB-001
   - MSRP: $279.99
   - Allocated: 20 units
   - Per Customer: 2 boxes

2. **Collector Booster Box**
   - SKU: MH4-CBB-001
   - MSRP: $399.99
   - Allocated: 15 units
   - Per Customer: 1 box

3. **Draft Booster Box**
   - SKU: MH4-DBB-001
   - MSRP: $249.99
   - Allocated: 25 units
   - Per Customer: 3 boxes

This creates all three products in one operation, saving time and ensuring consistency.

## Benefits

1. **Time Savings**: Enter shared details once instead of repeating for each product
2. **Consistency**: All products automatically share the same game title, release date, and notes
3. **Less Error-Prone**: Reduces chances of typos or inconsistencies across related products
4. **Batch Management**: Easier to set up entire product releases at once

## API Reference

### Endpoint
`POST /api/preorders/sets`

### Request Body
```json
{
  "game_title": "Magic: The Gathering - Modern Horizons 4",
  "release_date": "2026-06-15",
  "category": "sealed",
  "notes": "Summer 2026 release - limited allocation",
  "products": [
    {
      "product_name": "Modern Horizons 4 - Booster Box",
      "sku": "MH4-BB-001",
      "msrp_cents": 27999,
      "preorder_quantity": 20,
      "quantity_cap": 2
    },
    {
      "product_name": "Modern Horizons 4 - Collector Booster Box",
      "sku": "MH4-CBB-001",
      "msrp_cents": 39999,
      "preorder_quantity": 15,
      "quantity_cap": 1
    }
  ]
}
```

### Response
Returns an array of created preorder items with their full details.

## Technical Notes

- All products in a set are created atomically (all succeed or all fail)
- Each product gets its own inventory item and preorder item
- Physical quantity is always set to 0 for unreleased products
- The category defaults to "sealed" but can be adjusted in the backend if needed
- Per-customer limits are enforced individually per product (e.g., a customer can order 2 booster boxes AND 1 collector box)
