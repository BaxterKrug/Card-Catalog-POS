#!/usr/bin/env python3
"""Seed a default 'Walk-in Customer' for anonymous checkouts."""
import sys
from pathlib import Path

# Add the parent directory to sys.path so we can import checkoutdesignator
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlmodel import Session, select

from checkoutdesignator.database import engine
from checkoutdesignator.models import Customer


def seed_default_customer():
    """Create a default 'Walk-in Customer' if it doesn't exist."""
    with Session(engine) as session:
        # Check if Walk-in Customer already exists
        statement = select(Customer).where(Customer.name == "Walk-in Customer")
        existing = session.exec(statement).first()
        
        if existing:
            print(f"✓ Default customer already exists (ID: {existing.id})")
            return existing.id
        
        # Create the Walk-in Customer
        customer = Customer(
            name="Walk-in Customer",
            email=None,
            phone=None,
            notes="Default customer for walk-in/anonymous purchases"
        )
        session.add(customer)
        session.commit()
        session.refresh(customer)
        
        print(f"✓ Created default 'Walk-in Customer' (ID: {customer.id})")
        return customer.id


if __name__ == "__main__":
    seed_default_customer()
