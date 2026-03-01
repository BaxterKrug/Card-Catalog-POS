#!/usr/bin/env python3
"""Migration: Add PreorderOrder table to group customer preorder claims."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, text, select
from checkoutdesignator.database import engine
from checkoutdesignator.models import PreorderClaim, PreorderOrder, Customer


def migrate():
    """Add PreorderOrder table and link existing PreorderClaims to orders."""
    print("\n=== Migration: Add PreorderOrder Table ===\n")
    
    with Session(engine) as session:
        # Create the preorderorder table
        print("Creating preorderorder table...")
        session.exec(text("""
            CREATE TABLE IF NOT EXISTS preorderorder (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                status VARCHAR NOT NULL DEFAULT 'waiting',
                notes TEXT,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                FOREIGN KEY (customer_id) REFERENCES customer(id)
            )
        """))
        
        # Add index on customer_id
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS ix_preorderorder_customer_id ON preorderorder(customer_id)
        """))
        
        # Add index on status
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS ix_preorderorder_status ON preorderorder(status)
        """))
        
        session.commit()
        print("✅ Created preorderorder table with indexes")
        
        # Check if preorder_order_id column already exists
        result = session.exec(text("""
            SELECT COUNT(*) as count FROM pragma_table_info('preorderclaim') 
            WHERE name='preorder_order_id'
        """)).first()
        
        if result and result[0] > 0:
            print("✅ preorder_order_id column already exists in preorderclaim table")
        else:
            # Add preorder_order_id column to preorderclaim table
            print("\nAdding preorder_order_id column to preorderclaim table...")
            session.exec(text("""
                ALTER TABLE preorderclaim ADD COLUMN preorder_order_id INTEGER
            """))
            session.commit()
            print("✅ Added preorder_order_id column")
        
        # Get all existing preorder claims grouped by customer
        print("\nMigrating existing preorder claims...")
        claims = session.exec(select(PreorderClaim)).all()
        
        if not claims:
            print("No existing preorder claims to migrate")
            session.commit()
            return
        
        # Group claims by customer
        customer_claims = {}
        for claim in claims:
            if claim.customer_id not in customer_claims:
                customer_claims[claim.customer_id] = []
            customer_claims[claim.customer_id].append(claim)
        
        print(f"Found {len(claims)} claims from {len(customer_claims)} customers")
        
        # Create a PreorderOrder for each customer and link their claims
        for customer_id, customer_claim_list in customer_claims.items():
            # Create a new PreorderOrder for this customer
            preorder_order = PreorderOrder(
                customer_id=customer_id,
                status=customer_claim_list[0].status,  # Use status from first claim
                created_at=min(c.created_at for c in customer_claim_list),
                updated_at=max(c.updated_at for c in customer_claim_list),
            )
            session.add(preorder_order)
            session.flush()
            
            # Link all claims to this order
            for claim in customer_claim_list:
                claim.preorder_order_id = preorder_order.id
                session.add(claim)
            
            print(f"  ✅ Created PreorderOrder #{preorder_order.id} for customer #{customer_id} with {len(customer_claim_list)} claims")
        
        session.commit()
        
        # Now make preorder_order_id NOT NULL
        print("\nMaking preorder_order_id NOT NULL...")
        session.exec(text("""
            CREATE TABLE preorderclaim_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                preorder_order_id INTEGER NOT NULL,
                preorder_item_id INTEGER NOT NULL,
                customer_id INTEGER NOT NULL,
                quantity_requested INTEGER NOT NULL,
                quantity_allocated INTEGER NOT NULL DEFAULT 0,
                status VARCHAR NOT NULL DEFAULT 'waiting',
                is_paid BOOLEAN NOT NULL DEFAULT 0,
                payment_amount_cents INTEGER,
                payment_method VARCHAR,
                payment_date TIMESTAMP,
                payment_notes TEXT,
                created_at TIMESTAMP NOT NULL,
                updated_at TIMESTAMP NOT NULL,
                FOREIGN KEY (preorder_order_id) REFERENCES preorderorder(id),
                FOREIGN KEY (preorder_item_id) REFERENCES preorderitem(id),
                FOREIGN KEY (customer_id) REFERENCES customer(id)
            )
        """))
        
        # Copy data
        session.exec(text("""
            INSERT INTO preorderclaim_new 
            SELECT * FROM preorderclaim
        """))
        
        # Drop old table and rename new one
        session.exec(text("DROP TABLE preorderclaim"))
        session.exec(text("ALTER TABLE preorderclaim_new RENAME TO preorderclaim"))
        
        # Recreate indexes
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS ix_preorderclaim_preorder_order_id ON preorderclaim(preorder_order_id)
        """))
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS ix_preorderclaim_status ON preorderclaim(status)
        """))
        session.exec(text("""
            CREATE INDEX IF NOT EXISTS ix_preorderclaim_is_paid ON preorderclaim(is_paid)
        """))
        
        session.commit()
        print("✅ Made preorder_order_id NOT NULL and recreated indexes")
        
        print("\n=== Migration Complete ===")
        print("All preorder claims are now grouped under PreorderOrder")


if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
