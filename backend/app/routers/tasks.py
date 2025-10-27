# backend/app/routers/tasks.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
import datetime

from .. import schemas, models, deps
from ..database import get_db

router = APIRouter()

@router.get("/my-tasks", response_model=List[schemas.Task])
def get_my_deployment_tasks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    # This dependency check is flexible (allows admin/planner)
    # Let's make one just for the tech
    if current_user.role != models.UserRole.TECHNICIAN:
        raise HTTPException(status_code=403, detail="Only technicians can view 'my-tasks'")
        
    tasks = db.query(models.DeploymentTask).options(
        joinedload(models.DeploymentTask.customer) # Eager load customer details
    ).filter(
        models.DeploymentTask.technician_id == current_user.id
    ).order_by(models.DeploymentTask.created_at.desc()).all()
    
    return tasks

@router.put("/{task_id}/status", response_model=schemas.Task)
def update_task_status(
    task_id: int,
    status_update: schemas.TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    task = db.query(models.DeploymentTask).filter(models.DeploymentTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Security check: Only assigned tech or an admin/planner
    if (current_user.role == models.UserRole.TECHNICIAN and 
        task.technician_id != current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this task")
    if (current_user.role not in [models.UserRole.ADMIN, models.UserRole.PLANNER, models.UserRole.TECHNICIAN]):
         raise HTTPException(status_code=403, detail="Not authorized")

    new_status = status_update.status
    if new_status not in ["IN_PROGRESS", "COMPLETED", "FAILED"]:
         raise HTTPException(status_code=4.00, detail="Invalid status")

    # --- This is the key logic ---
    if new_status == "COMPLETED":
        # Find the customer and set their status to ACTIVE
        customer_profile = db.query(models.CustomerProfile).filter(
            models.CustomerProfile.id == task.customer_id
        ).first()
        if customer_profile:
            # We also need to mark the assets as "Installed" or just keep "Assigned"
            # For now, just activate the customer
            customer_profile.status = "ACTIVE"
            db.add(customer_profile)
        
        task.completed_at = datetime.datetime.now(datetime.timezone.utc)
    
    task.status = new_status
    db.add(task)
    db.commit()
    db.refresh(task)
    return task