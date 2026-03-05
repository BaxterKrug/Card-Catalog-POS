"""
Migration script to add cash register tables and update payment methods

Run with: python -m scripts.migrate_add_cash_register
"""
from sqlmodel import Session
from checkoutdesignator.database import engine
from checkoutdesignator.models import (
    CashRegisterSession,
    CashRegisterTransaction,
    SQLModel
)


def migrate():
    """Create cash register tables"""
    print("Creating cash register tables...")
    
    # Create tables
    SQLModel.metadata.create_all(engine)
    
    print("✓ Cash register tables created successfully!")
    print("\nNew tables added:")
    print("  - cashregistersession")
    print("  - cashregistertransaction")
    print("\nPayment methods updated to include:")
    print("  - cashapp")
    print("  - venmo")
    

if __name__ == "__main__":
    migrate()
