#!/usr/bin/env python3
"""
Migration script to enhance preorder system with:
- Separate preorder inventory tracking (preorder_quantity, preorder_quantity_allocated)
- Payment tracking fields (is_paid, payment_amount_cents, payment_method, payment_date, payment_notes)

This migration adds new columns to preorderitem and preorderclaim tables.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from checkoutdesignator.database import engine


def migrate():
    """Execute migration to add preorder enhancement fields."""
    
    with engine.connect() as conn:
        print("Starting preorder enhancements migration...")
        
        # Check if we're using SQLite or PostgreSQL
        is_sqlite = str(engine.url).startswith("sqlite")
        
        try:
            # Add columns to preorderitem table
            print("\nAdding columns to preorderitem table...")
            
            if is_sqlite:
                # SQLite doesn't support adding multiple columns in one statement
                conn.execute(text("ALTER TABLE preorderitem ADD COLUMN preorder_quantity INTEGER DEFAULT 0 NOT NULL"))
                conn.execute(text("ALTER TABLE preorderitem ADD COLUMN preorder_quantity_allocated INTEGER DEFAULT 0 NOT NULL"))
            else:
                # PostgreSQL supports multiple columns
                conn.execute(text("""
                    ALTER TABLE preorderitem 
                    ADD COLUMN IF NOT EXISTS preorder_quantity INTEGER DEFAULT 0 NOT NULL,
                    ADD COLUMN IF NOT EXISTS preorder_quantity_allocated INTEGER DEFAULT 0 NOT NULL
                """))
            
            conn.commit()
            print("✓ Added preorder_quantity and preorder_quantity_allocated to preorderitem")
            
            # Add columns to preorderclaim table
            print("\nAdding columns to preorderclaim table...")
            
            if is_sqlite:
                conn.execute(text("ALTER TABLE preorderclaim ADD COLUMN is_paid INTEGER DEFAULT 0 NOT NULL"))
                conn.execute(text("ALTER TABLE preorderclaim ADD COLUMN payment_amount_cents INTEGER"))
                conn.execute(text("ALTER TABLE preorderclaim ADD COLUMN payment_method VARCHAR"))
                conn.execute(text("ALTER TABLE preorderclaim ADD COLUMN payment_date TIMESTAMP"))
                conn.execute(text("ALTER TABLE preorderclaim ADD COLUMN payment_notes TEXT"))
            else:
                conn.execute(text("""
                    ALTER TABLE preorderclaim 
                    ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE NOT NULL,
                    ADD COLUMN IF NOT EXISTS payment_amount_cents INTEGER,
                    ADD COLUMN IF NOT EXISTS payment_method VARCHAR,
                    ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP,
                    ADD COLUMN IF NOT EXISTS payment_notes TEXT
                """))
            
            conn.commit()
            print("✓ Added payment tracking fields to preorderclaim")
            
            # Create index on is_paid for faster queries
            print("\nCreating index on is_paid...")
            try:
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_preorderclaim_is_paid ON preorderclaim (is_paid)"))
                conn.commit()
                print("✓ Created index on preorderclaim.is_paid")
            except Exception as e:
                print(f"Note: Index may already exist - {e}")
            
            print("\n✅ Migration completed successfully!")
            print("\nSummary:")
            print("- PreorderItem now tracks separate preorder inventory")
            print("- PreorderClaim now tracks payment status in perpetuity")
            print("- All existing claims set to is_paid=False by default")
            
        except Exception as e:
            print(f"\n❌ Migration failed: {e}")
            conn.rollback()
            raise


if __name__ == "__main__":
    migrate()
