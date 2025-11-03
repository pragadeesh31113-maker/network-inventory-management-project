# backend/app/routers/topology.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import or_
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel

from .. import models, schemas, deps
from ..database import get_db

router = APIRouter()

# --- Pydantic Models for the Tree ---

class TopologyNode(BaseModel):
    id: str
    type: str
    name: str
    status: Optional[str] = None
    details: Dict[str, Any] = {}
    children: List['TopologyNode'] = []

# --- Pydantic Models for Search ---

class SearchSuggestion(BaseModel):
    id: int
    name: str
    type: str
    label: str

# --- Helper Functions (Recursive Tree Builders) ---

def build_customer_tree(customer: models.CustomerProfile, db: Session) -> TopologyNode:
    """Builds the tree DOWN from a customer, using the correct models."""
    
    if not customer.user:
        customer = db.query(models.CustomerProfile).options(
            joinedload(models.CustomerProfile.user)
        ).filter(models.CustomerProfile.id == customer.id).first()

    customer_name = "Orphaned Profile"
    customer_email = "N/A"
    customer_username = "N/A"
    customer_status = "UNKNOWN"

    if customer:
        customer_status = customer.status if customer.status else "UNKNOWN"
        
        if customer.user:
            customer_name = customer.user.full_name
            customer_email = customer.user.email
            customer_username = customer.user.username
    else:
        return TopologyNode(
            id=f"error-customer", 
            type="customer", 
            name="Error: Customer not found", 
            status="FAULTY"
        )

    customer_node = TopologyNode(
        id=f"customer-{customer.id}",
        type='customer',
        name=customer_name,
        status=customer_status,
        details={
            "email": customer_email, 
            "customer_id": customer_username,
        }
    )
    
    assigned_assets = db.query(models.Asset).filter(
        models.Asset.assigned_to_customer_id == customer.id
    ).all()

    ont_node = None
    router_node = None

    for asset in assigned_assets:
        asset_status = asset.status.value if asset.status else "UNKNOWN"
        if asset.asset_type == models.AssetType.ONT:
            ont_node = TopologyNode(
                id=f"ont-{asset.id}",
                type='ont',
                name=asset.serial_number or "ONT",
                status=asset_status, # <-- This is correct
                details={"model": asset.model or "N/A", "location": asset.location or "N/A"},
                children=[]
            )
        elif asset.asset_type == models.AssetType.ROUTER:
            router_node = TopologyNode(
                id=f"router-{asset.id}",
                type='router',
                name=asset.serial_number or "Router",
                status=asset_status, # <-- This is correct
                details={"model": asset.model or "N/A", "location": asset.location or "N/A"},
                children=[]
            )
            
    if router_node:
        router_node.children.append(customer_node)
    
    if ont_node:
        if router_node:
            ont_node.children.append(router_node)
        else:
            ont_node.children.append(customer_node)
        return ont_node
    
    if router_node:
        return router_node
        
    return customer_node

def build_fdh_tree(fdh: models.FDH, db: Session) -> TopologyNode:
    """Builds the full tree DOWN from an FDH, using the correct models."""
    
    # --- THIS IS THE FIX (Part 1) ---
    # Find the corresponding asset for this FDH to get its *real* status
    # We match by the 'name' which is part of the asset's serial number
    fdh_asset = db.query(models.Asset.status).filter(
        models.Asset.asset_type == models.AssetType.FDH,
        models.Asset.serial_number.ilike(f"%{fdh.name}%")
    ).first()
    
    fdh_status = "UNKNOWN"
    if fdh_asset:
        fdh_status = fdh_asset.status.value if fdh_asset.status else "UNKNOWN"
    
    # If it's not FAULTY/RETIRED and has splitters, check if it's IN_USE
    if fdh_status in ["AVAILABLE", "UNKNOWN"]:
        is_in_use = db.query(models.Splitter).join(models.CustomerProfile).filter(models.Splitter.fdh_id == fdh.id).first()
        if is_in_use:
            fdh_status = "IN_USE"
        else:
            fdh_status = "AVAILABLE" # Default to available if not in use
    # --- END FIX ---

    fdh_node = TopologyNode(
        id=f"fdh-{fdh.id}",
        type='fdh',
        name=fdh.name or "FDH",
        status=fdh_status, # <-- Use the REAL status, not "ACTIVE"
        details={
            "model": fdh.name or "N/A",
            "location": fdh.location or "N/A",
            "pincode": fdh.pincode or "N/A"
        }
    )
    
    splitters = db.query(models.Splitter).filter(
        models.Splitter.fdh_id == fdh.id
    ).options(
        selectinload(models.Splitter.customers)
            .selectinload(models.CustomerProfile.user)
    ).all()

    for splitter in splitters:
        
        # --- THIS IS THE FIX (Part 2) ---
        # Find the corresponding asset for this splitter to get its *real* status
        splitter_asset = db.query(models.Asset.status).filter(
            models.Asset.asset_type == models.AssetType.SPLITTER,
            models.Asset.serial_number.ilike(f"%{splitter.name}%")
        ).first()
        
        splitter_status = "UNKNOWN"
        if splitter_asset:
            splitter_status = splitter_asset.status.value if splitter_asset.status else "UNKNOWN"
        
        # If no customers are on it, status is from asset table.
        # If it has customers, it's "IN_USE" (unless it's FAULTY)
        if splitter_status not in ["FAULTY", "IN_REPAIR", "RETIRED"] and len(splitter.customers) > 0:
             splitter_status = "IN_USE"
        elif splitter_status in ["UNKNOWN", "IN_USE"] and len(splitter.customers) == 0:
             # If it's not FAULTY but has no customers, it's AVAILABLE
             splitter_status = "AVAILABLE"
        # --- END FIX ---

        splitter_node = TopologyNode(
            id=f"splitter-{splitter.id}",
            type='splitter',
            name=splitter.name or "Splitter",
            status=splitter_status, # <-- Use the REAL status, not "ACTIVE"
            details={"model": splitter.name or "N/A", "location": splitter.location or "N/A", "ports": splitter.port_capacity}
        )
        
        for customer in splitter.customers:
            customer_tree_root = build_customer_tree(customer, db)
            splitter_node.children.append(customer_tree_root)
        
        fdh_node.children.append(splitter_node)
        
    return fdh_node

# --- API Endpoints ---

@router.get("/search", response_model=List[SearchSuggestion])
def search_customers_and_fdhs(
    query: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)
):
    suggestions = []
    search_term = f"%{query}%"
    
    customers = db.query(models.CustomerProfile).join(models.User).filter(
        or_(
            models.CustomerProfile.address.ilike(search_term),
            models.User.username.ilike(search_term),
            models.User.email.ilike(search_term),
            models.User.full_name.ilike(search_term)
        )
    ).limit(10).all()
    
    for c in customers:
        suggestions.append(SearchSuggestion(
            id=c.id,
            name=f"{c.user.full_name}",
            type='customer',
            label=f"Customer: {c.user.full_name} ({c.user.email})"
        ))
        
    fdhs = db.query(models.FDH).filter(
        or_(
            models.FDH.name.ilike(search_term),
            models.FDH.location.ilike(search_term),
            models.FDH.pincode.ilike(search_term),
            models.FDH.district.ilike(search_term)
        )
    ).limit(10).all()
    
    for f in fdhs:
        suggestions.append(SearchSuggestion(
            id=f.id,
            name=f.name or "FDH",
            type='fdh',
            label=f"FDH: {f.name} ({f.pincode or 'N/A'})"
        ))
        
    return suggestions

@router.get("/fdh/{fdh_id}", response_model=TopologyNode)
def get_topology_for_fdh(
    fdh_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)
):
    fdh = db.query(models.FDH).filter(
        models.FDH.id == fdh_id
    ).first()
    
    if not fdh:
        raise HTTPException(status_code=404, detail="FDH not found")
        
    return build_fdh_tree(fdh, db)

@router.get("/customer/{customer_id}", response_model=TopologyNode)
def get_topology_for_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)
):
    customer = db.query(models.CustomerProfile).filter(
        models.CustomerProfile.id == customer_id
    ).options(
        joinedload(models.CustomerProfile.user),
        joinedload(models.CustomerProfile.splitter)
            .joinedload(models.Splitter.fdh)
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    if not customer.splitter or not customer.splitter.fdh:
        raise HTTPException(
            status_code=404, 
            detail="Customer is not connected to a valid FDH. Cannot build topology."
        )
    
    # Trace up to the FDH and build the full tree down from there
    fdh = customer.splitter.fdh
    return build_fdh_tree(fdh, db)