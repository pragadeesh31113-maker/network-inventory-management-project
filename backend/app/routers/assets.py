# # backend/app/routers/assets.py
# from fastapi import APIRouter, Depends, HTTPException, status
# from sqlalchemy.orm import Session, joinedload
# from sqlalchemy import func
# from typing import List, Optional

# from .. import schemas, models, deps
# from ..database import get_db
# from ..asset_logger import log_asset_change

# router = APIRouter()

# @router.post("/", response_model=schemas.Asset, status_code=status.HTTP_201_CREATED)
# def create_asset(
#     asset_in: schemas.AssetCreate,
#     db: Session = Depends(get_db),
#     current_user: models.User = Depends(deps.is_admin)
# ):
#     db_asset = models.Asset(**asset_in.dict())
#     db.add(db_asset)
#     db.commit()
#     db.refresh(db_asset)
    
#     log_asset_change(
#         db, 
#         asset_id=db_asset.id, 
#         action="CREATED", 
#         details=f"Asset created with S/N: {db_asset.serial_number}, Type: {db_asset.asset_type}",
#         user_id=current_user.id
#     )
#     db.commit()
    
#     return db_asset

# # --- THIS IS THE UPDATED FUNCTION ---
# @router.get("/", response_model=List[schemas.AssetDetail])
# def read_assets(
#     skip: int = 0, 
#     limit: int = 200, # Increased limit
#     db: Session = Depends(get_db),
#     current_user: models.User = Depends(deps.get_current_active_user)
# ):
#     """
#     Get all assets. This will now:
#     1. Join customer data for ONTs/Routers.
#     2. Calculate the status for FDHs and Splitters based on usage.
#     """
#     assets = db.query(models.Asset).options(
#         joinedload(models.Asset.assigned_to_customer)
#             .joinedload(models.CustomerProfile.user)
#     ).order_by(models.Asset.id.desc()).offset(skip).limit(limit).all()

#     # --- NEW LOGIC FOR CALCULATED STATUS ---
    
#     # 1. Find all splitter names from the hierarchy table that are in use
#     # --- THIS IS THE FIX: Changed group_by() to distinct() ---
#     used_splitter_names_query = db.query(models.Splitter.name).join(models.CustomerProfile).distinct()
#     used_splitter_name_set = {name for (name,) in used_splitter_names_query.all()}

#     # 2. Find all FDH names from the hierarchy table that are in use
#     # --- THIS IS THE FIX: Changed group_by() to distinct() ---
#     used_fdh_names_query = db.query(models.FDH.name).join(models.Splitter).join(models.CustomerProfile).distinct()
#     used_fdh_name_set = {name for (name,) in used_fdh_names_query.all()}
    
#     # 3. Iterate over our assets and update their status if they are hierarchy items
#     for asset in assets:
#         if asset.status != "AVAILABLE":
#             continue
            
#         try:
#             if asset.asset_type == models.AssetType.SPLITTER:
#                 # Extract the hierarchy name from the asset serial number
#                 # Format: "SPL-SN-{name}-{ean}"
#                 name_part = asset.serial_number.split('-SN-')[1].rsplit('-', 1)[0]
#                 if name_part in used_splitter_name_set:
#                      asset.status = "IN_USE" # This is a calculated status

#             elif asset.asset_type == models.AssetType.FDH:
#                 # Extract the hierarchy name from the asset serial number
#                 # Format: "FDH-SN-{name}-{ean}"
#                 name_part = asset.serial_number.split('-SN-')[1].rsplit('-', 1)[0]
#                 if name_part in used_fdh_name_set:
#                     asset.status = "IN_USE" # This is a calculated status
#         except IndexError:
#             # Asset has a malformed serial number, skip it
#             pass
#     # --- END NEW LOGIC ---

#     return assets
# # --- END UPDATED FUNCTION ---


# @router.put("/{asset_id}", response_model=schemas.Asset)
# def update_asset(
#     asset_id: int,
#     asset_in: schemas.AssetUpdate,
#     db: Session = Depends(get_db),
#     current_user: models.User = Depends(deps.is_planner)
# ):
#     db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
#     if db_asset is None:
#         raise HTTPException(status_code=404, detail="Asset not found")
        
#     update_data = asset_in.dict(exclude_unset=True)
#     details_log = [] 
    
#     # --- THIS IS THE FIX for your Request #2 ---
#     # Allow changing status of ASSIGNED devices
#     if db_asset.status == models.AssetStatus.ASSIGNED and 'status' in update_data:
#         if update_data['status'] not in [models.AssetStatus.FAULTY, models.AssetStatus.IN_REPAIR, models.AssetStatus.RETIRED]:
#              raise HTTPException(
#                 status_code=400, 
#                 detail="Assigned assets can only be moved to FAULTY, IN_REPAIR, or RETIRED."
#             )
#         # If it's a valid change, clear the customer assignment
#         if update_data['status'] != models.AssetStatus.ASSIGNED:
#             update_data['assigned_to_customer_id'] = None
#             details_log.append("asset un-assigned from customer")
#     # --- END FIX ---

#     for key, value in update_data.items():
#         old_value = getattr(db_asset, key)
#         if old_value != value:
#             details_log.append(f"{key} changed from '{old_value}' to '{value}'")
#             setattr(db_asset, key, value)
            
#     if not details_log:
#          raise HTTPException(status_code=304, detail="No changes detected")

#     db.add(db_asset)
    
#     log_asset_change(
#         db,
#         asset_id=db_asset.id,
#         action="UPDATED",
#         details="; ".join(details_log),
#         user_id=current_user.id
#     )
#     db.commit()
#     db.refresh(db_asset)
#     return db_asset

# @router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
# def delete_asset(
#     asset_id: int,
#     db: Session = Depends(get_db),
#     current_user: models.User = Depends(deps.is_admin)
# ):
#     db_asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
#     if db_asset is None:
#         raise HTTPException(status_code=404, detail="Asset not found")
        
#     if db_asset.status == models.AssetStatus.ASSIGNED:
#         raise HTTPException(
#             status_code=400, 
#             detail="Cannot delete an asset that is currently assigned to a customer."
#         )

#     log_asset_change(
#         db,
#         asset_id=db_asset.id,
#         action="DELETED",
#         details=f"Asset with S/N: {db_asset.serial_number} was permanently deleted.",
#         user_id=current_user.id
#     )
    
#     db.delete(db_asset)
#     db.commit()
#     return

# # This summary is now simple, and the frontend will do the calculation
# @router.get("/summary", response_model=dict)
# def get_asset_summary(
#     db: Session = Depends(get_db),
#     current_user: models.User = Depends(deps.is_planner)
# ):
#     # This endpoint is no longer used by the new frontend,
#     # but we leave it here in case it's used elsewhere.
    
#     # 1. By Status
#     status_summary = db.query(
#         models.Asset.status, func.count(models.Asset.id).label("count")
#     ).group_by(models.Asset.status).all()
    
#     # 2. By Type
#     type_summary = db.query(
#         models.Asset.asset_type, func.count(models.Asset.id).label("count")
#     ).group_by(models.Asset.asset_type).all()
    
#     # 3. KPIs
#     total_assets = db.query(models.Asset).count()
#     total_assigned = db.query(models.Asset).filter(models.Asset.status == "ASSIGNED").count()
#     total_available = db.query(models.Asset).filter(models.Asset.status == "AVAILABLE").count()
#     total_faulty = db.query(models.Asset).filter(models.Asset.status == "FAULTY").count()

#     return {
#         "kpis": {
#             "total_assets": total_assets,
#             "total_assigned": total_assigned,
#             "total_available": total_available,
#             "total_faulty": total_faulty
#         },
#         "by_status": [{"name": status.value, "value": count} for status, count in status_summary],
#         "by_type": [{"name": type.value, "value": count} for type, count in type_summary],
#     }

# @router.get("/{asset_id}/history", response_model=List[schemas.AssetHistory])
# def get_asset_history(
#     asset_id: int,
#     db: Session = Depends(get_db),
#     current_user: models.User = Depends(deps.is_planner)
# ):
#     history = db.query(models.AssetHistory).filter(
#         models.AssetHistory.asset_id == asset_id
#     ).order_by(models.AssetHistory.timestamp.desc()).all()
    
#     return history
# backend/app/routers/assets.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func
from typing import List, Optional

from .. import schemas, models, deps
from ..database import get_db
from ..asset_logger import log_asset_change

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
    
    log_asset_change(
        db, 
        asset_id=db_asset.id, 
        action="CREATED", 
        details=f"Asset created with S/N: {db_asset.serial_number}, Type: {db_asset.asset_type}",
        user_id=current_user.id
    )
    db.commit()
    
    return db_asset

@router.get("/", response_model=List[schemas.AssetDetail])
def read_assets(
    skip: int = 0, 
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    assets = db.query(models.Asset).options(
        joinedload(models.Asset.assigned_to_customer)
            .joinedload(models.CustomerProfile.user)
    ).order_by(models.Asset.id.desc()).offset(skip).limit(limit).all()

    # Find all splitter names from the hierarchy table that are in use
    used_splitter_names_query = db.query(models.Splitter.name).join(models.CustomerProfile).distinct()
    used_splitter_name_set = {name for (name,) in used_splitter_names_query.all()}

    # Find all FDH names from the hierarchy table that are in use
    used_fdh_names_query = db.query(models.FDH.name).join(models.Splitter).join(models.CustomerProfile).distinct()
    used_fdh_name_set = {name for (name,) in used_fdh_names_query.all()}
    
    for asset in assets:
        if asset.status != "AVAILABLE":
            continue
            
        try:
            if asset.asset_type == models.AssetType.SPLITTER:
                name_part = asset.serial_number.split('-SN-')[1].rsplit('-', 1)[0]
                if name_part in used_splitter_name_set:
                     asset.status = models.AssetStatus.IN_USE
            elif asset.asset_type == models.AssetType.FDH:
                name_part = asset.serial_number.split('-SN-')[1].rsplit('-', 1)[0]
                if name_part in used_fdh_name_set:
                    asset.status = models.AssetStatus.IN_USE
        except IndexError:
            pass

    return assets

# --- THIS IS THE UPDATED FUNCTION ---
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
    details_log = [] 
    
    # --- THIS IS THE FIX ---
    is_status_change = 'status' in update_data
    old_status = db_asset.status
    new_status = update_data.get('status')

    # If we are changing status FROM assigned TO something else (like FAULTY)
    if old_status == models.AssetStatus.ASSIGNED and is_status_change and new_status != models.AssetStatus.ASSIGNED:
        if new_status not in [models.AssetStatus.FAULTY, models.AssetStatus.IN_REPAIR, models.AssetStatus.RETIRED]:
             raise HTTPException(
                status_code=400, 
                detail="Assigned assets can only be moved to FAULTY, IN_REPAIR, or RETIRED."
            )
        
        # This is the critical fix: Un-assign the asset from the customer
        db_asset.assigned_to_customer_id = None
        details_log.append("asset un-assigned from customer")
    # --- END FIX ---

    for key, value in update_data.items():
        old_value = getattr(db_asset, key)
        if old_value != value:
            details_log.append(f"{key} changed from '{old_value}' to '{value}'")
            setattr(db_asset, key, value)
            
    if not details_log:
         raise HTTPException(status_code=304, detail="No changes detected")

    db.add(db_asset)
    
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
# --- END UPDATED FUNCTION ---

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

@router.get("/summary", response_model=dict)
def get_asset_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)
):
    status_summary = db.query(
        models.Asset.status, func.count(models.Asset.id).label("count")
    ).group_by(models.Asset.status).all()
    
    type_summary = db.query(
        models.Asset.asset_type, func.count(models.Asset.id).label("count")
    ).group_by(models.Asset.asset_type).all()
    
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