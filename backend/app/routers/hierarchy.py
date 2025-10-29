# backend/app/routers/hierarchy.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload
from typing import List
from .. import schemas, models, deps
from ..database import get_db

router = APIRouter()

@router.get("/fdh", response_model=List[schemas.FDH]) # Use the FDH schema which includes pincode/district/region
def get_full_fdh_hierarchy(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner) # Or appropriate dependency
):
    """Returns the full FDH -> Splitter -> Customer hierarchy including location details."""
    # Use joinedload to efficiently load related objects
    fdhs = db.query(models.FDH).options(
        joinedload(models.FDH.splitters).joinedload(models.Splitter.customers)
    ).order_by(models.FDH.region, models.FDH.district, models.FDH.name).all() # Order for better display

    # Pydantic should handle the conversion based on the response_model and Config.from_attributes=True
    return fdhs