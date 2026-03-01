# CheckoutDesignator – Architecture

## Vision and Guiding Principles
- **State validation first.** Inventory moves through three explicit layers (physical, allocated, available). Business actions that would push `available` below zero are rejected.
- **Customer-centric.** Every order and preorder claim is tied to a `Customer` record with pickup tracking.
- **Preorders are first-class.** They have dedicated models, allocation logic, and status flow instead of being shoehorned into standard orders.
- **Auditability.** All stock movements (receiving, manual adjustments, sales) record who did it and why.

## Technical Stack
- **Backend:** Python 3.11, FastAPI, SQLModel (SQLite storage), Typer-powered CLI for in-store terminals.
- **API Layer:** RESTful endpoints grouped under `/customers`, `/inventory`, `/orders`, `/preorders`, and `/health`.
- **Services:** Pure Python business logic modules that enforce invariants before DB writes; reusable by API and CLI.
- **Tests:** Pytest suite covering allocation math, preorder workflows, and order lifecycle.

## Domain Model Overview
| Entity | Purpose |
| --- | --- |
| `InventoryItem` | Represents a unique SKU (singles keyed by set + card + printing). Tracks source (`player` vs `supplier`), optional `game_title`, `physical_quantity`, `allocated_quantity`, computed `available_quantity`.
| `InventoryAdjustment` | Audit log row for every stock change (reason, delta, actor, reference).
| `Customer` | Basic profile with contact channels and preferred pickup method.
| `Order` | Standard checkout document with statuses: `DRAFT → OPEN → READY → PICKED_UP` or `CANCELLED`. Always linked to a `Customer`.
| `OrderItem` | Line items referencing `InventoryItem` + quantity + unit price.
| `PreorderItem` | Product listing for future releases with optional quantity caps and release dates.
| `PreorderClaim` | Customer reservation for a preorder item. Tracks `quantity_requested`, `quantity_allocated`, `status` (`WAITING`, `ALLOCATED`, `FULFILLED`, `CANCELLED`).

## Inventory Layers
- `physical_quantity`: Actual count in-store (includes items sitting in holds or preorder bins until picked up). Mutated only by receiving, manual adjustments, or finalizing pickup/corrections.
- `allocated_quantity`: Units promised to customers (draft orders excluded). Increments when orders are submitted or preorder claims are created; decrements when orders/claims are fulfilled or cancelled.
- `available_quantity = physical_quantity - allocated_quantity`. Any transaction that would yield `available_quantity < 0` is blocked.

## Singles vs Supplier Stock
- **Singles:** `source=player`, optional `game_title`, and `acquisition_reference` (e.g., player name, trade ticket). Used for one-off cards purchased from players; pricing typically managed per card.
- **Supplier stock:** `source=supplier` plus reference to purchase order or distributor. Covers sealed product, supplies, and replenishable SKUs.
- API responses always include `physical_quantity`, `allocated_quantity`, and computed `available_quantity` so registers can see how much stock is free to sell regardless of origin.

## Key Workflows
### Receiving & Allocation
1. Staff enters receiving event via `/inventory/{id}/receive` or CLI.
2. System increments `physical_quantity`, writes `InventoryAdjustment`.
3. Auto allocator scans `PreorderClaim`s tied to that SKU ordered by `created_at` and raises `quantity_allocated` until no unassigned physical stock remains.
4. Claims that reach their requested quantity move to `ALLOCATED` (ready for pickup/order conversion).

### Preorders
1. Manager defines `PreorderItem` with underlying SKU, release date, and optional cap.
2. Associate captures customer claim: `quantity_requested`, `customer_id`.
3. Claim immediately counts toward `allocated_quantity` to keep available inventory honest.
4. Once product arrives, allocator marks earliest claims as `ALLOCATED`. Staff can convert them into standard orders or mark as `FULFILLED` after pickup, which removes both physical and allocated amounts.

### Standard Orders
- **Drafting:** Staff can start an order, add or remove items, and save progress without touching inventory.
- **Submitting:** Transition to `OPEN` validates availability per line and bumps `allocated_quantity`.
- **Ready / Pickup:** When order is staged (`READY`), no quantity changes. Completing pickup deducts from both `physical` and `allocated` with an adjustment entry. Cancels release the allocation but leave physical untouched.

### Bulk Entry & Adjustments
- CSV import endpoint/CLI accepts headers: `sku,name,category,set_code,quantity,unit_price_cents`.
- Manual adjustments require reason + reference tag and create an audit record categorized as `CORRECTION`, `DAMAGE`, or `RECOUNT`.

## Interfaces
- **REST API** for integration with future web/mobile clients.
- **Typer CLI** for quick back-of-house tasks: `checkout-designator customers add`, `checkout-designator orders submit`, etc. CLI commands call the same service layer, guaranteeing parity with the API.

## Validation & Testing Strategy
- Service-layer unit tests for:
  - Oversell prevention when submitting orders.
  - Auto allocation of received stock to preorder claims in FIFO order.
  - Order lifecycle transitions updating physical/allocated quantities correctly.
- HTTP-level smoke test for creating customers and orders via FastAPI `TestClient`.

## Deployment Notes
- SQLite file (`checkoutdesignator.db`) by default; path configurable via env var.
- Uvicorn app entry point: `checkoutdesignator.app.main:app`.
- Future enhancements: multi-register concurrency (swap SQLite for Postgres), barcode scanning, and UI layering.
