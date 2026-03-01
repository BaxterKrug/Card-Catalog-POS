#!/usr/bin/env python3
"""Migration script to add discord_id and default_discount_type to Customer table."""

from sqlalchemy import text
from checkoutdesignator.database import engine


def migrate():
    """Add new columns to customer table."""
    print("Adding discord_id and default_discount_type columns to customer table...")
    
    with engine.begin() as conn:
        try:
            # Add discord_id column
            conn.execute(text("ALTER TABLE customer ADD COLUMN discord_id TEXT"))
            print("✅ Added discord_id column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("⏭️  discord_id column already exists")
            else:
                print(f"❌ Error adding discord_id: {e}")
                raise
        
        try:
            # Add default_discount_type column
            conn.execute(text("ALTER TABLE customer ADD COLUMN default_discount_type TEXT"))
            print("✅ Added default_discount_type column")
        except Exception as e:
            if "duplicate column name" in str(e).lower():
                print("⏭️  default_discount_type column already exists")
            else:
                print(f"❌ Error adding default_discount_type: {e}")
                raise
    
    print("✅ Migration completed successfully!")


if __name__ == "__main__":
    migrate()
