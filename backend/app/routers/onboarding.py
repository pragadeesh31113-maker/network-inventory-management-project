# backend/app/routers/onboarding.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from .. import schemas, models, deps
from ..database import get_db

router = APIRouter()

@router.get("/pending", response_model=List[schemas.CustomerProfileSimple])
def get_pending_onboarding_customers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)
):
    """Get all customers who signed up but are not yet assigned to a splitter."""
    customers = db.query(models.CustomerProfile).filter(
        # We'll change this status in the signup logic
        models.CustomerProfile.status == "PENDING_ONBOARDING" 
    ).all()
    return customers

@router.post("/", status_code=status.HTTP_201_CREATED)
def onboard_customer(
    onboard_request: schemas.CustomerOnboardRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)
):
    # --- 1. Validate all inputs ---
    customer_profile = db.query(models.CustomerProfile).filter(
        models.CustomerProfile.id == onboard_request.customer_profile_id
    ).first()
    if not customer_profile:
        raise HTTPException(status_code=404, detail="CustomerProfile not found")
    if customer_profile.status != "PENDING_ONBOARDING":
        raise HTTPException(status_code=400, detail="Customer is not pending onboarding")

    splitter = db.query(models.Splitter).filter(
        models.Splitter.id == onboard_request.splitter_id
    ).first()
    if not splitter:
        raise HTTPException(status_code=404, detail="Splitter not found")

    # Check if port is valid and available
    if not (0 < onboard_request.splitter_port <= splitter.port_capacity):
        raise HTTPException(status_code=400, detail=f"Port must be between 1 and {splitter.port_capacity}")

    port_taken = db.query(models.CustomerProfile).filter(
        models.CustomerProfile.splitter_id == splitter.id,
        models.CustomerProfile.splitter_port == onboard_request.splitter_port
    ).first()
    if port_taken:
        raise HTTPException(status_code=400, detail=f"Splitter port {onboard_request.splitter_port} is already taken")

    # --- 2. Find available assets ---
    available_ont = db.query(models.Asset).filter(
        models.Asset.asset_type == models.AssetType.ONT,
        models.Asset.status == models.AssetStatus.AVAILABLE
    ).first()
    if not available_ont:
        raise HTTPException(status_code=503, detail="No available ONTs in inventory. Please add stock.")
        
    available_router = db.query(models.Asset).filter(
        models.Asset.asset_type == models.AssetType.ROUTER,
        models.Asset.status == models.AssetStatus.AVAILABLE
    ).first()
    if not available_router:
        raise HTTPException(status_code=503, detail="No available Routers in inventory. Please add stock.")
        
    # --- 3. Perform the assignments (Transaction) ---
    try:
        available_ont.status = models.AssetStatus.ASSIGNED
        available_ont.assigned_to_customer_id = customer_profile.id
        
        available_router.status = models.AssetStatus.ASSIGNED
        available_router.assigned_to_customer_id = customer_profile.id
        
        customer_profile.splitter_id = splitter.id
        customer_profile.splitter_port = onboard_request.splitter_port
        customer_profile.status = "PENDING_INSTALLATION" # Ready for the technician!
        
        db.add_all([available_ont, available_router, customer_profile])
        
        # --- 4. Create a deployment task (for Sprint 3) ---
        technician = db.query(models.User).filter(models.User.role == models.UserRole.TECHNICIAN).first()
        if technician:
            new_task = models.DeploymentTask(
                customer_id=customer_profile.id,
                technician_id=technician.id, # Assign to the first tech for now
                status="PENDING"
            )
            db.add(new_task)
        
        db.commit()
        
        return { "message": "Customer onboarding successful. Deployment task created." }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")