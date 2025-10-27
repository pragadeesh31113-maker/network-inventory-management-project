# backend/app/routers/hierarchy.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from .. import schemas, models, deps
from ..database import get_db

router = APIRouter()

# --- FDH (Fiber Distribution Hub) Endpoints ---

@router.post("/fdh", response_model=schemas.FDH, status_code=201)
def create_fdh(
    fdh_in: schemas.FDHCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner) # Planners or Admins
):
    db_fdh = models.FDH(**fdh_in.dict())
    db.add(db_fdh)
    db.commit()
    db.refresh(db_fdh)
    return db_fdh

@router.get("/fdh", response_model=List[schemas.FDH])
def get_all_fdhs_with_details(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """
    Gets all FDHs and eagerly loads their splitters and
    the customers connected to those splitters.
    This is the main data load for the planner dashboard.
    """
    fdhs = db.query(models.FDH).options(
        joinedload(models.FDH.splitters)
        .joinedload(models.Splitter.customers)
    ).all()
    return fdhs

# --- Splitter Endpoints ---

@router.post("/splitter", response_model=schemas.Splitter, status_code=201)
def create_splitter(
    splitter_in: schemas.SplitterCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)
):
    # Check if parent FDH exists
    db_fdh = db.query(models.FDH).filter(models.FDH.id == splitter_in.fdh_id).first()
    if not db_fdh:
        raise HTTPException(status_code=404, detail="Parent FDH not found")
        
    db_splitter = models.Splitter(**splitter_in.dict())
    db.add(db_splitter)
    db.commit()
    db.refresh(db_splitter)
    return db_splitter