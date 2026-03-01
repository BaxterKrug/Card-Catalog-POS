"""Add test customers for order testing."""

from checkoutdesignator.database import init_db, session_scope
from checkoutdesignator.models import Customer
from checkoutdesignator.schemas import CustomerCreate
from checkoutdesignator.services import customers

TEST_CUSTOMERS = [
    {"name": "Alice Johnson", "email": "alice@example.com", "phone": "555-0101"},
    {"name": "Bob Smith", "email": "bob@example.com", "phone": "555-0102"},
    {"name": "Charlie Brown", "email": "charlie@example.com", "phone": "555-0103"},
]


def seed_test_customers() -> None:
    init_db()
    with session_scope() as session:
        # Check if customers already exist
        existing = session.query(Customer).count()
        if existing > 0:
            print(f"✅ Database already has {existing} customers")
            for customer in session.query(Customer).all():
                print(f"  - {customer.name} ({customer.email})")
            return

        # Create test customers
        for customer_data in TEST_CUSTOMERS:
            try:
                customer = customers.create_customer(session, CustomerCreate(**customer_data))
                print(f"✅ Created {customer.name} ({customer.email})")
            except Exception as exc:
                print(f"⚠️  Skipped {customer_data['name']}: {exc}")

        print(f"\n✅ Test customers created successfully!")


if __name__ == "__main__":
    seed_test_customers()
