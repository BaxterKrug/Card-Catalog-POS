"""
Migration script to add checklist tracking system.
Adds ChecklistTemplate and ChecklistCompletion tables and seeds with store procedures.
"""

from sqlmodel import Session, create_engine, SQLModel

from checkoutdesignator.config import get_settings
from checkoutdesignator.models import ChecklistCategory, ChecklistTemplate

settings = get_settings()
engine = create_engine(str(settings.database_url))


def migrate():
    print("Creating checklist tables...")
    SQLModel.metadata.create_all(engine)
    print("✓ Tables created")
    
    with Session(engine) as session:
        print("Seeding checklist templates...")
        
        # Opening Procedures
        opening_tasks = [
            "Turn on light",
            "Open Kiosk",
            "Wake laptop",
            "Turn on TV",
            "Restock Fridge",
            "Unlock door",
            'Open door and move sign to "Open"',
            "Do discord Pings",
        ]
        
        for idx, task in enumerate(opening_tasks):
            template = ChecklistTemplate(
                category=ChecklistCategory.OPENING,
                task_name=task,
                display_order=idx,
                is_active=True,
            )
            session.add(template)
        
        # Closing Procedures
        closing_tasks = [
            "Lock door at end of night",
            'Switch sign to "Closed"',
            "Pick up loose trash",
            "Sweep",
            "Take out trash",
            "Fix Tables and Chairs",
        ]
        
        for idx, task in enumerate(closing_tasks):
            template = ChecklistTemplate(
                category=ChecklistCategory.CLOSING,
                task_name=task,
                display_order=idx,
                is_active=True,
            )
            session.add(template)
        
        # Cleaning & Maintenance
        maintenance_tasks = [
            "Every Sunday night: sweep and mop the space",
        ]
        
        for idx, task in enumerate(maintenance_tasks):
            template = ChecklistTemplate(
                category=ChecklistCategory.MAINTENANCE,
                task_name=task,
                display_order=idx,
                is_active=True,
            )
            session.add(template)
        
        session.commit()
        print(f"✓ Seeded {len(opening_tasks) + len(closing_tasks) + len(maintenance_tasks)} checklist templates")
    
    print("✅ Migration complete!")


if __name__ == "__main__":
    migrate()
