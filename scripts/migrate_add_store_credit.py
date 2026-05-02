#!/usr/bin/env python3
"""Migration: Add store credit tracking system."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from checkoutdesignator.database import engine


def migrate():
    """Add store credit balance to customer table and create storecredittransaction table."""
    with engine.begin() as conn:
        print("Adding store_credit_balance_cents column to customer table...")
        
        try:
            conn.execute(text('ALTER TABLE customer ADD COLUMN store_credit_balance_cents INTEGER DEFAULT 0 NOT NULL'))
            print("  ✓ Added column: store_credit_balance_cents")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("  - Column store_credit_balance_cents already exists, skipping")
            else:
                print(f"  ! Error adding store_credit_balance_cents: {e}")
        
        print("\nCreating storecredittransaction table...")
        
        # Create storecredittransaction table
        try:
            conn.execute(text("""
                CREATE TABLE storecredittransaction (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL REFERENCES customer(id),
                    transaction_type VARCHAR NOT NULL,
                    amount_cents INTEGER NOT NULL,
                    reference_type VARCHAR,
                    reference_id INTEGER,
                    created_by_user_id INTEGER NOT NULL REFERENCES user(id),
                    created_at TIMESTAMP NOT NULL,
                    notes VARCHAR
                )
            """))
            print("  ✓ Created storecredittransaction table")
            
            # Add indexes for better query performance
            conn.execute(text("CREATE INDEX ix_storecredittransaction_customer_id ON storecredittransaction (customer_id)"))
            print("  ✓ Created index on customer_id")
            
            conn.execute(text("CREATE INDEX ix_storecredittransaction_transaction_type ON storecredittransaction (transaction_type)"))
            print("  ✓ Created index on transaction_type")
            
            conn.execute(text("CREATE INDEX ix_storecredittransaction_created_by_user_id ON storecredittransaction (created_by_user_id)"))
            print("  ✓ Created index on created_by_user_id")
            
        except Exception as e:
            if "already exists" in str(e).lower():
                print("  - Table storecredittransaction already exists, skipping")
            else:
                print(f"  ! Error: {e}")
        
        print("\n✓ Migration completed successfully!")


if __name__ == "__main__":
    migrate()
