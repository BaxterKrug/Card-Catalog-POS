"""
Migration: Add is_archived field to preorderitem table.
This allows users to manually archive preorder sets.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session
from sqlalchemy import text
from checkoutdesignator.database import engine


def migrate():
    """Add is_archived column to preorderitem table."""
    with Session(engine) as session:
        # Check if column already exists
        result = session.execute(
            text("SELECT sql FROM sqlite_master WHERE type='table' AND name='preorderitem'")
        )
        table_sql = result.fetchone()
        
        if table_sql and 'is_archived' in table_sql[0]:
            print("Column 'is_archived' already exists in preorderitem table. Skipping.")
            return
        
        # Add the column with default value
        session.execute(
            text("ALTER TABLE preorderitem ADD COLUMN is_archived BOOLEAN DEFAULT 0 NOT NULL")
        )
        session.commit()
        print("Successfully added 'is_archived' column to preorderitem table.")


if __name__ == "__main__":
    migrate()
