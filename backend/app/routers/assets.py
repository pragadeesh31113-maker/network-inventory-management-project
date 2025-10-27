# backend/app/routers/assets.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional

from .. import schemas, models, deps
from ..database import get_db
from ..asset_logger import log_asset_change # <-- Import our new logger

router = APIRouter()

@router.post("/", response_model=schemas.Asset, status_code=status.HTTP_201_CREATED)
def create_asset(
    asset_in: schemas.AssetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_admin)
):
    db_asset = models.Asset(**asset_in.dict())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    # --- LOG IT ---
    log_asset_change(
        db, 
        asset_id=db_asset.id, 
        action="CREATED", 
        details=f"Asset created with S/N: {db_asset.serial_number}, Type: {db_asset.asset_type}",
        user_id=current_user.id
    )
    db.commit()
    
    return db_asset

@router.get("/", response_model=List[schemas.Asset])
def read_assets(
    skip: int = 0, 
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    assets = db.query(models.Asset).order_by(models.Asset.id.desc()).offset(skip).limit(limit).all()
    return assets

@router.put("/{asset_id}", response_model=schemas.Asset)
def update_asset(
    asset_id: int,
    asset_in: schemas.AssetUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)
):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if db_asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    update_data = asset_in.dict(exclude_unset=True)
    details_log = [] # To store what changed
    
    for key, value in update_data.items():
        old_value = getattr(db_asset, key)
        if old_value != value:
            details_log.append(f"{key} changed from '{old_value}' to '{value}'")
            setattr(db_asset, key, value)
            
    if not details_log:
         raise HTTPException(status_code=304, detail="No changes detected")

    db.add(db_asset)
    
    # --- LOG IT ---
    log_asset_change(
        db,
        asset_id=db_asset.id,
        action="UPDATED",
        details="; ".join(details_log),
        user_id=current_user.id
    )
    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_admin)
):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if db_asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    if db_asset.status == models.AssetStatus.ASSIGNED:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete an asset that is currently assigned to a customer."
        )

    # --- LOG IT ---
    # Log before deleting so we don't violate foreign key
    log_asset_change(
        db,
        asset_id=db_asset.id,
        action="DELETED",
        details=f"Asset with S/N: {db_asset.serial_number} was permanently deleted.",
        user_id=current_user.id
    )
    
    db.delete(db_asset)
    db.commit()
    return

# --- NEW ENDPOINT FOR SUMMARY ---
@router.get("/summary", response_model=dict)
def get_asset_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)
):
    # 1. By Status
    status_summary = db.query(
        models.Asset.status, func.count(models.Asset.id).label("count")
    ).group_by(models.Asset.status).all()
    
    # 2. By Type
    type_summary = db.query(
        models.Asset.asset_type, func.count(models.Asset.id).label("count")
    ).group_by(models.Asset.asset_type).all()
    
    # 3. KPIs
    total_assets = db.query(models.Asset).count()
    total_assigned = db.query(models.Asset).filter(models.Asset.status == "ASSIGNED").count()
    total_available = db.query(models.Asset).filter(models.Asset.status == "AVAILABLE").count()
    total_faulty = db.query(models.Asset).filter(models.Asset.status == "FAULTY").count()

    return {
        "kpis": {
            "total_assets": total_assets,
            "total_assigned": total_assigned,
            "total_available": total_available,
            "total_faulty": total_faulty
        },
        "by_status": [{"name": status.value, "value": count} for status, count in status_summary],
        "by_type": [{"name": type.value, "value": count} for type, count in type_summary],
    }

# --- NEW ENDPOINT FOR HISTORY ---
@router.get("/{asset_id}/history", response_model=List[schemas.AssetHistory])
def get_asset_history(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)
):
    history = db.query(models.AssetHistory).filter(
        models.AssetHistory.asset_id == asset_id
    ).order_by(models.AssetHistory.timestamp.desc()).all()
    
    return history