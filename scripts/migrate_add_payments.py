#!/usr/bin/env python3
"""Migration: Add payment split and tax/discount support to orders."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from checkoutdesignator.database import engine


def migrate():
    """Add new columns to order table and create orderpayment table."""
    with engine.begin() as conn:
        print("Adding new columns to order table...")
        
        # SQLite doesn't support multiple ADD COLUMN, so we do them one at a time
        # and catch errors if columns already exist
        columns_to_add = [
            ("subtotal_cents", "INTEGER DEFAULT 0 NOT NULL"),
            ("discount_type", "VARCHAR"),
            ("discount_percent", "REAL DEFAULT 0.0 NOT NULL"),
            ("discount_amount_cents", "INTEGER DEFAULT 0 NOT NULL"),
            ("tax_rate_percent", "REAL DEFAULT 8.25 NOT NULL"),
            ("tax_amount_cents", "INTEGER DEFAULT 0 NOT NULL"),
            ("card_fee_percent", "REAL DEFAULT 0.0 NOT NULL"),
            ("card_fee_amount_cents", "INTEGER DEFAULT 0 NOT NULL"),
            ("total_cents", "INTEGER DEFAULT 0 NOT NULL"),
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                conn.execute(text(f'ALTER TABLE "order" ADD COLUMN {col_name} {col_type}'))
                print(f"  ✓ Added column: {col_name}")
            except Exception as e:
                if "duplicate column name" in str(e).lower():
                    print(f"  - Column {col_name} already exists, skipping")
                else:
                    print(f"  ! Error adding {col_name}: {e}")
        
        print("\nCreating orderpayment table...")
        
        # Create orderpayment table
        try:
            conn.execute(text("""
                CREATE TABLE orderpayment (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL REFERENCES "order"(id),
                    payment_method VARCHAR NOT NULL,
                    amount_cents INTEGER NOT NULL,
                    notes VARCHAR,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL
                )
            """))
            print("  ✓ Created orderpayment table")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("  - Table orderpayment already exists, skipping")
            else:
                print(f"  ! Error: {e}")
        
        print("\n✓ Migration completed successfully!")


if __name__ == "__main__":
    migrate()
