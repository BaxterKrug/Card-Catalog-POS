"""Seed all staff profiles for CheckoutDesignator."""

from checkoutdesignator.database import init_db, session_scope
from checkoutdesignator.models import UserRole
from checkoutdesignator.schemas import UserCreate
from checkoutdesignator.services import users

STAFF = [
    {"name": "Cayle", "username": "cayle", "password": "dev123", "role": UserRole.OWNER, "title": "Owner, Manager"},
    {"name": "Baxter", "username": "baxter", "password": "dev123", "role": UserRole.OWNER, "title": "Owner"},
    {"name": "Ian", "username": "ian", "password": "dev123", "role": UserRole.OWNER, "title": "Owner"},
    {"name": "Brendan", "username": "brendan", "password": "dev123", "role": UserRole.MANAGER, "title": "Manager"},
    {"name": "Tony", "username": "tony", "password": "dev123", "role": UserRole.EMPLOYEE, "title": "Employee"},
    {"name": "Taft", "username": "taft", "password": "dev123", "role": UserRole.EMPLOYEE, "title": "Employee"},
    {"name": "Gabriel", "username": "gabriel", "password": "dev123", "role": UserRole.EMPLOYEE, "title": "Employee"},
    {"name": "Rick", "username": "rick", "password": "dev123", "role": UserRole.MANAGER, "title": "Manager"},
]


def seed_staff() -> None:
    init_db()
    with session_scope() as session:
        for staff_member in STAFF:
            try:
                user = users.create_user(session, UserCreate(**staff_member))
                print(f"✅ Created {user.name} ({user.username}) - {user.role.value}")
            except Exception as exc:
                print(f"⚠️  Skipped {staff_member['name']}: {exc}")

        print(f"\n✅ Staff seeding complete. {len(STAFF)} profiles ready.")
        print("\nDefault login credentials (username / password):")
        for staff_member in STAFF:
            print(f"  {staff_member['username']} / {staff_member['password']}")


if __name__ == "__main__":
    seed_staff()
