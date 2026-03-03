from datetime import date, datetime, time, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from checkoutdesignator.auth import get_current_user
from checkoutdesignator.database import get_session
from checkoutdesignator.models import (
    ChecklistCategory,
    ChecklistCompletion,
    ChecklistTemplate,
    User,
)
from checkoutdesignator.schemas_checklist import (
    ChecklistCompletionCreate,
    ChecklistCompletionRead,
    ChecklistItemWithStatus,
    ChecklistTemplateCreate,
    ChecklistTemplateRead,
    ChecklistTemplateUpdate,
)

router = APIRouter(prefix="/checklist", tags=["checklist"])


def get_current_checklist_date() -> date:
    """
    Get the current checklist date. 
    Before 8 AM, return previous day. At or after 8 AM, return current day.
    """
    now = datetime.now()
    cutoff_time = time(8, 0)  # 8:00 AM
    
    if now.time() < cutoff_time:
        # Before 8 AM, use yesterday's checklist
        return (now - timedelta(days=1)).date()
    else:
        # 8 AM or later, use today's checklist
        return now.date()


@router.get("/templates", response_model=List[ChecklistTemplateRead])
def get_checklist_templates(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get all active checklist templates"""
    statement = (
        select(ChecklistTemplate)
        .where(ChecklistTemplate.is_active == True)
        .order_by(ChecklistTemplate.category)
        .order_by(ChecklistTemplate.display_order)
    )
    templates = session.exec(statement).all()
    return templates


@router.post("/templates", response_model=ChecklistTemplateRead)
def create_checklist_template(
    template: ChecklistTemplateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Create a new checklist template (admin only)"""
    if current_user.role not in ["owner", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    db_template = ChecklistTemplate(**template.model_dump())
    session.add(db_template)
    session.commit()
    session.refresh(db_template)
    return db_template


@router.patch("/templates/{template_id}", response_model=ChecklistTemplateRead)
def update_checklist_template(
    template_id: int,
    update: ChecklistTemplateUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Update a checklist template (admin only)"""
    if current_user.role not in ["owner", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    template = session.get(ChecklistTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)
    
    session.add(template)
    session.commit()
    session.refresh(template)
    return template


@router.get("/today", response_model=List[ChecklistItemWithStatus])
def get_today_checklist(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get today's checklist with completion status"""
    checklist_date = get_current_checklist_date()
    
    # Get all active templates
    templates_statement = (
        select(ChecklistTemplate)
        .where(ChecklistTemplate.is_active == True)
        .order_by(ChecklistTemplate.category)
        .order_by(ChecklistTemplate.display_order)
    )
    templates = session.exec(templates_statement).all()
    
    # Get completions for today
    completions_statement = (
        select(ChecklistCompletion, User)
        .join(User)
        .where(ChecklistCompletion.completion_date == checklist_date)
    )
    completions_with_users = session.exec(completions_statement).all()
    
    # Create lookup dict: template_id -> (user_name, completed_at, notes)
    completion_map = {
        comp.template_id: (user.name, comp.completed_at, comp.notes)
        for comp, user in completions_with_users
    }
    
    # Build response
    result = []
    for template in templates:
        if template.id is None:
            continue
        completion_info = completion_map.get(template.id)
        result.append(
            ChecklistItemWithStatus(
                id=template.id,
                category=template.category,
                task_name=template.task_name,
                display_order=template.display_order,
                is_completed=completion_info is not None,
                completed_by=completion_info[0] if completion_info else None,
                completed_at=completion_info[1] if completion_info else None,
                notes=completion_info[2] if completion_info else None,
            )
        )
    
    return result


@router.post("/complete", response_model=ChecklistCompletionRead)
def complete_checklist_item(
    completion: ChecklistCompletionCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Mark a checklist item as complete"""
    if current_user.id is None:
        raise HTTPException(status_code=400, detail="Invalid user")
    
    # Verify template exists
    template = session.get(ChecklistTemplate, completion.template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Checklist template not found")
    
    # Check if already completed
    existing = session.exec(
        select(ChecklistCompletion).where(
            ChecklistCompletion.template_id == completion.template_id,
            ChecklistCompletion.completion_date == completion.completion_date,
        )
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="This checklist item has already been completed for this date",
        )
    
    # Create completion record
    db_completion = ChecklistCompletion(
        template_id=completion.template_id,
        user_id=current_user.id,
        completion_date=completion.completion_date,
        notes=completion.notes,
    )
    session.add(db_completion)
    session.commit()
    session.refresh(db_completion)
    
    if db_completion.id is None:
        raise HTTPException(status_code=500, detail="Failed to create completion")
    
    return ChecklistCompletionRead(
        id=db_completion.id,
        template_id=db_completion.template_id,
        user_id=current_user.id,
        user_name=current_user.name,
        completion_date=db_completion.completion_date,
        completed_at=db_completion.completed_at,
        notes=db_completion.notes,
    )


@router.delete("/complete/{completion_id}")
def uncheck_checklist_item(
    completion_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Remove a checklist completion (uncheck)"""
    completion = session.get(ChecklistCompletion, completion_id)
    if not completion:
        raise HTTPException(status_code=404, detail="Completion not found")
    
    # Only allow unchecking if it's your own completion or you're a manager/owner
    if completion.user_id != current_user.id and current_user.role not in ["owner", "manager"]:
        raise HTTPException(status_code=403, detail="Can only uncheck your own items")
    
    session.delete(completion)
    session.commit()
    return {"success": True}


@router.get("/history", response_model=List[ChecklistCompletionRead])
def get_checklist_history(
    start_date: date,
    end_date: date,
    template_id: Optional[int] = None,
    user_id: Optional[int] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """Get checklist completion history for a date range"""
    if current_user.role not in ["owner", "manager"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    statement = (
        select(ChecklistCompletion, User)
        .join(User)
        .where(
            ChecklistCompletion.completion_date >= start_date,
            ChecklistCompletion.completion_date <= end_date,
        )
    )
    
    if template_id:
        statement = statement.where(ChecklistCompletion.template_id == template_id)
    if user_id:
        statement = statement.where(ChecklistCompletion.user_id == user_id)
    
    statement = statement.order_by(ChecklistCompletion.completion_date)
    
    results = session.exec(statement).all()
    
    return [
        ChecklistCompletionRead(
            id=comp.id if comp.id else 0,
            template_id=comp.template_id,
            user_id=comp.user_id,
            user_name=user.name,
            completion_date=comp.completion_date,
            completed_at=comp.completed_at,
            notes=comp.notes,
        )
        for comp, user in results
    ]
