# backend/app/routers/customers.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List

from .. import schemas, models, deps
from ..database import get_db

router = APIRouter()

# We need a new schema for this. Add this to backend/app/schemas.py
"""
class CustomerProfileDetail(schemas.CustomerProfileSimple):
    user: schemas.UserBase
    assigned_assets: List[schemas.MyAsset]
    
    class Config:
        from_attributes = True
"""
# For now, let's just use the simple one to avoid file-hopping.
# A real app would use a detailed schema.

@router.get("/search", response_model=List[schemas.CustomerProfileSimple])
def search_customers(
    q: str = Query(..., min_length=3, description="Search term for address, username, or email"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_support) # Support or Admin
):
    search_term = f"%{q}%"
    
    # This query joins CustomerProfile with User and searches on both
    customers = db.query(models.CustomerProfile).join(models.User).filter(
        or_(
            models.CustomerProfile.address.ilike(search_term),
            models.User.username.ilike(search_term),
            models.User.email.ilike(search_term)
        )
    ).all()
    
    return customers

@router.get("/{customer_id}/details", response_model=schemas.MyProfile) # Re-using this schema
def get_customer_details(
    customer_id: int, # This is CustomerProfile ID, not User ID
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_support)
):
    profile = db.query(models.CustomerProfile).options(
        joinedload(models.CustomerProfile.user),
        joinedload(models.CustomerProfile.assigned_assets)
    ).filter(models.CustomerProfile.id == customer_id).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Customer profile not found")

    return {
        "full_name": profile.user.full_name,
        "email": profile.user.email,
        "address": profile.address,
        "plan": profile.plan,
        "status": profile.status,
        "assigned_assets": profile.assigned_assets
    }