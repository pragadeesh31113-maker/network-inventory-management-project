# backend/app/routers/lifecycle.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import schemas, models, deps
from ..database import get_db

router = APIRouter()

@router.post("/deactivate/{customer_profile_id}", status_code=status.HTTP_200_OK)
def deactivate_customer(
    customer_profile_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_support) # Support or Admin
):
    customer_profile = db.query(models.CustomerProfile).filter(
        models.CustomerProfile.id == customer_profile_id
    ).first()
    
    if not customer_profile:
        raise HTTPException(status_code=404, detail="Customer profile not found")
    if customer_profile.status == "INACTIVE":
        raise HTTPException(status_code=400, detail="Customer is already inactive")

    try:
        # 1. Reclaim all assets
        assets_to_reclaim = db.query(models.Asset).filter(
            models.Asset.assigned_to_customer_id == customer_profile.id
        ).all()
        
        for asset in assets_to_reclaim:
            asset.status = models.AssetStatus.AVAILABLE
            asset.location = "Central Warehouse" # Return to stock
            asset.assigned_to_customer_id = None
            db.add(asset)
            
        # 2. Free up Splitter Port
        customer_profile.splitter_id = None
        customer_profile.splitter_port = None
        
        # 3. Deactivate Customer
        customer_profile.status = "INACTIVE"
        db.add(customer_profile)
        
        # 4. (Optional) Deactivate user login
        user = db.query(models.User).filter(models.User.id == customer_profile.user_id).first()
        if user:
            user.is_active = False
            db.add(user)
        
        db.commit()
        
        return {
            "message": f"Customer deactivated and {len(assets_to_reclaim)} assets reclaimed."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")