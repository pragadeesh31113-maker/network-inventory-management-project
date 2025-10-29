# backend/app/routers/hierarchy.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from .. import schemas, models, deps
from ..database import get_db

router = APIRouter()

# ===============================================================
# GET — Retrieve Full FDH → Splitter → Customer Hierarchy
# ===============================================================
@router.get("/fdh", response_model=List[schemas.FDH])
def get_full_fdh_hierarchy(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)  # Restrict to planner or higher
):
    """
    Returns the full FDH -> Splitter -> Customer hierarchy including location details.
    """
    fdhs = (
        db.query(models.FDH)
        .options(
            joinedload(models.FDH.splitters).joinedload(models.Splitter.customers)
        )
        .order_by(models.FDH.region, models.FDH.district, models.FDH.name)
        .all()
    )

    return fdhs


# ===============================================================
# PUT — Update FDH and Cascade Changes to Splitters
# ===============================================================
@router.put("/fdh/{fdh_id}", response_model=schemas.FDH)
def update_fdh_location(
    fdh_id: int,
    fdh_update: schemas.FDHUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)  # Planners/Admins can update
):
    """
    Updates FDH location details and cascades relevant fields
    (pincode, district, region) to all connected splitters.
    """
    # Load FDH and its related splitters
    db_fdh = (
        db.query(models.FDH)
        .options(joinedload(models.FDH.splitters))
        .filter(models.FDH.id == fdh_id)
        .first()
    )

    if not db_fdh:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="FDH not found"
        )

    update_data = fdh_update.dict(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_304_NOT_MODIFIED, detail="No update data provided"
        )

    updated_fields_count = 0
    cascade_fields = {}  # Fields to propagate to splitters

    # --- Update FDH Fields ---
    for key, value in update_data.items():
        if hasattr(db_fdh, key) and getattr(db_fdh, key) != value:
            setattr(db_fdh, key, value)
            updated_fields_count += 1

            # Cascade pincode, district, region to splitters
            if key in ["pincode", "district", "region"]:
                cascade_fields[key] = value
            # You may enable this if you want 'location' to cascade as well:
            # if key == "location":
            #     cascade_fields[key] = value

    if updated_fields_count == 0:
        raise HTTPException(
            status_code=status.HTTP_304_NOT_MODIFIED, detail="No changes detected"
        )

    # --- Cascade Changes to Splitters ---
    if cascade_fields:
        print(f"Cascading fields to splitters: {cascade_fields}")
        for splitter in db_fdh.splitters:
            for key, value in cascade_fields.items():
                if hasattr(splitter, key):
                    setattr(splitter, key, value)
            db.add(splitter)  # Track changes for splitters

    db.add(db_fdh)

    # --- Commit and Handle Exceptions ---
    try:
        db.commit()
        db.refresh(db_fdh)
        print(
            f"✅ FDH {fdh_id} updated successfully. "
            f"Cascaded {len(cascade_fields)} fields to {len(db_fdh.splitters)} splitters."
        )
        return db_fdh
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating FDH {fdh_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update FDH and cascade changes.",
        )
