# backend/app/routers/assets.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from .. import schemas, models, deps
from ..database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.Asset)
def create_asset(
    asset_in: schemas.AssetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_admin) # Only Admins can create assets
):
    db_asset = models.Asset(**asset_in.dict())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

@router.get("/", response_model=List[schemas.Asset])
def read_assets(
    skip: int = 0, 
    limit: int = 100,
    status: Optional[models.AssetStatus] = None,
    asset_type: Optional[models.AssetType] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user) # Any logged-in user can view
):
    query = db.query(models.Asset)
    if status:
        query = query.filter(models.Asset.status == status)
    if asset_type:
        query = query.filter(models.Asset.asset_type == asset_type)
        
    assets = query.offset(skip).limit(limit).all()
    return assets

@router.get("/{asset_id}", response_model=schemas.Asset)
def read_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if db_asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    return db_asset