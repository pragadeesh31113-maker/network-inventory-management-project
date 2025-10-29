# backend/app/routers/onboarding.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional # Make sure Optional is imported
from .. import schemas, models, deps
from ..database import get_db
from sqlalchemy import and_

router = APIRouter()

# --- CORRECT ---
@router.get("/pending", response_model=List[schemas.CustomerProfileSimple])
def get_pending_onboarding_customers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)
):
    """Get all customers who signed up but are not yet assigned to a splitter."""
    customers = db.query(models.CustomerProfile).filter(
        # It should ONLY show this one status
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

    # Check if port is valid
    if not (0 < onboard_request.splitter_port <= (splitter.port_capacity or 8)):
        raise HTTPException(status_code=400, detail=f"Port must be between 1 and {splitter.port_capacity or 8}")

    # Check if port is available
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

# --- **NEW SUGGESTION ENDPOINT** ---
@router.get("/suggest_port/{customer_profile_id}", response_model=List[schemas.PortSuggestion])
def suggest_available_port(
    customer_profile_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)
):
    """Suggest available splitter ports in the same pincode as the customer."""
    customer_profile = db.query(models.CustomerProfile).filter(models.CustomerProfile.id == customer_profile_id).first()
    
    # Check if customer and pincode exist
    if not customer_profile:
        raise HTTPException(status_code=404, detail="Customer profile not found.")
    if not customer_profile.pincode:
        raise HTTPException(status_code=404, detail="Customer has no pincode assigned. Cannot make suggestions.")

    customer_pincode = customer_profile.pincode

    # Find FDHs in the same pincode
    nearby_fdhs = db.query(models.FDH).filter(models.FDH.pincode == customer_pincode).all()
    if not nearby_fdhs:
        return [] # No FDHs found in this pincode

    suggestions = []
    max_suggestions = 10 # Limit the number of suggestions

    for fdh in nearby_fdhs:
        # Find splitters within these FDHs
        splitters_in_fdh = db.query(models.Splitter).filter(models.Splitter.fdh_id == fdh.id).all()

        for splitter in splitters_in_fdh:
            # Get ports currently used by ANY customer on this splitter
            used_ports_query = db.query(models.CustomerProfile.splitter_port).filter(
                models.CustomerProfile.splitter_id == splitter.id,
                models.CustomerProfile.splitter_port != None # noqa E711
            )
            used_ports = {port for (port,) in used_ports_query.all()} # Create a set of port numbers

            capacity = splitter.port_capacity or 8 # Default to 8 if not set
            for port_num in range(1, capacity + 1):
                if port_num not in used_ports:
                    # This port is free, add it to suggestions
                    suggestions.append(schemas.PortSuggestion(
                        fdh_id=fdh.id,
                        fdh_name=fdh.name,
                        splitter_id=splitter.id,
                        splitter_name=splitter.name,
                        port_number=port_num
                    ))
                    if len(suggestions) >= max_suggestions:
                        return suggestions # Return early if max reached

    return suggestions