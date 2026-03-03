from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel

from checkoutdesignator.models import ChecklistCategory


class ChecklistTemplateCreate(BaseModel):
    category: ChecklistCategory
    task_name: str
    display_order: int = 0
    is_active: bool = True


class ChecklistTemplateUpdate(BaseModel):
    task_name: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class ChecklistTemplateRead(BaseModel):
    id: int
    category: ChecklistCategory
    task_name: str
    display_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ChecklistCompletionCreate(BaseModel):
    template_id: int
    completion_date: date
    notes: Optional[str] = None


class ChecklistCompletionRead(BaseModel):
    id: int
    template_id: int
    user_id: int
    user_name: str  # Denormalized for convenience
    completion_date: date
    completed_at: datetime
    notes: Optional[str] = None


class ChecklistItemWithStatus(BaseModel):
    """Checklist template item with completion status for a specific date"""
    id: int
    category: ChecklistCategory
    task_name: str
    display_order: int
    is_completed: bool
    completed_by: Optional[str] = None  # User name who completed it
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
