# backend/app/routers/dashboard.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models, deps
from ..database import get_db

router = APIRouter()

@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_admin) # Admin only
):
    # 1. Asset Status Pie Chart
    assets_by_status = db.query(
        models.Asset.status, func.count(models.Asset.id).label("count")
    ).group_by(models.Asset.status).all()
    
    # 2. Task Status Bar Chart
    tasks_by_status = db.query(
        models.DeploymentTask.status, func.count(models.DeploymentTask.id).label("count")
    ).group_by(models.DeploymentTask.status).all()
    
    # 3. Customer Status
    customers_by_status = db.query(
        models.CustomerProfile.status, func.count(models.CustomerProfile.id).label("count")
    ).group_by(models.CustomerProfile.status).all()
    
    # 4. KPI Cards
    total_customers = db.query(models.CustomerProfile).count()
    active_customers = db.query(models.CustomerProfile).filter(models.CustomerProfile.status == "ACTIVE").count()
    pending_tasks = db.query(models.DeploymentTask).filter(models.DeploymentTask.status == "PENDING").count()
    available_onts = db.query(models.Asset).filter(
        models.Asset.status == "AVAILABLE", models.Asset.asset_type == "ONT"
    ).count()

    return {
        "kpis": {
            "total_customers": total_customers,
            "active_customers": active_customers,
            "pending_tasks": pending_tasks,
            "available_onts": available_onts
        },
        "asset_summary": [{"name": status.value, "value": count} for status, count in assets_by_status],
        "task_summary": [{"name": status, "value": count} for status, count in tasks_by_status],
        "customer_summary": [{"name": status, "value": count} for status, count in customers_by_status],
    }