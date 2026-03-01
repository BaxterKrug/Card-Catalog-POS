# CheckoutDesignator

Point-of-sale and preorder workflow for **SK Games**, crafted by **SK R&D**.

## Highlights
- Three-layer inventory (physical, allocated, available) with hard validation to stop oversells.
- Singles vs supplier stock metadata (player trade-ins vs purchase orders) with optional game + acquisition reference.
- First-class preorder pipeline with FIFO allocation as stock arrives.
- Every sale/preorder tied to a customer record with pickup tracking.
- REST API (FastAPI) plus Typer-powered CLI for register/back-office flows.
- SQLite + SQLModel data layer with audit-ready adjustment log.

## Project Structure
```
checkoutdesignator/
  app/main.py          # FastAPI application entrypoint
  cli.py               # Typer CLI (`checkout-designator`)
  config.py            # Env-driven settings
  database.py          # Engine/session helpers
  models.py            # SQLModel tables & enums
  routers/             # API routers (customers, inventory, orders, preorders, health)
  services/            # Business logic modules
  schemas.py           # Pydantic request/response models
scripts/
  seed_demo_data.py    # Quick demo dataset loader
tests/
  test_inventory.py
  test_orders.py
```

## Getting Started
### Requirements
- Python 3.11+
- Pip / virtualenv

### Install
```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

### Database
By default the app stores data in `checkoutdesignator.db` (SQLite). To use another database, set `CHECKOUT_DESIGNATOR_DATABASE_URL` (e.g., `postgresql+psycopg://user:pass@host/db`).

Initialize tables once:
```bash
checkout-designator init-db
```

### Run the API
```bash
uvicorn checkoutdesignator.app.main:app --reload
```
Open http://127.0.0.1:8000/docs for interactive docs.

### CLI Quickstart
```bash
checkout-designator customers add --name "Jess Player" --email jess@example.com
checkout-designator inventory upsert --sku MH3-SET --name "MH3 Set Booster" --physical-quantity 12 --unit-price-cents 3299
checkout-designator orders create --customer-id 1
checkout-designator orders add-item --order-id 1 --inventory-item-id 1 --quantity 2
checkout-designator orders submit --order-id 1
checkout-designator orders status --order-id 1 --status ready
```

### Seed Demo Data
```bash
python scripts/seed_demo_data.py
```
This inserts sample customers, a Lotus, and a MH3 preorder queue to explore allocation behavior.

### Tests
```bash
pytest
```

## Key Workflows
- **Receiving:** `POST /inventory/{id}/receive` or `checkout-designator inventory receive` bumps physical count, triggers FIFO preorder allocation, and records an adjustment.
- **Orders:** Draft -> Open (allocates units) -> Ready -> Picked Up (reduces physical + allocated) / Cancel (releases allocations).
- **Preorders:** Create preorder items, accept claims, and auto-allocate when stock arrives. Fulfillment can optionally mark pickup immediately.

## Configuration
| Env Var | Default | Description |
| --- | --- | --- |
| `CHECKOUT_DESIGNATOR_APP_NAME` | `CheckoutDesignator` | UI title |
| `CHECKOUT_DESIGNATOR_ATTRIBUTION` | `Built by SK R&D for SK Games` | Exposed in docs |
| `CHECKOUT_DESIGNATOR_DATABASE_URL` | `sqlite:///./checkoutdesignator.db` | SQLAlchemy URL |

## Roadmap Ideas
- Event prize inventory buckets.
- Barcode scanning & label printing.
- Web front-end for registers and customer self-service.
- Postgres + row-level locking for multi-register deployments.
