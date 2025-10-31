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
    id: str               # A unique ID for the node (e.g., "fdh-1", "splitter-5")
    type: str             # 'fdh', 'splitter', 'ont', 'router', 'customer'
    name: str             # Display name (e.g., FDH Serial, Customer Name)
    status: Optional[str] = None # e.g., "ACTIVE", "FAULTY"
    details: Dict[str, Any] = {}
    children: List['TopologyNode'] = [] # Recursive definition

# --- Pydantic Models for Search ---

class SearchSuggestion(BaseModel):
    id: int
    name: str
    type: str # 'customer' or 'fdh'
    label: str # e.g., "Customer: John Doe (1234)"

# --- Helper Functions (Recursive Tree Builders) ---

def build_customer_tree(customer: models.CustomerProfile, db: Session) -> TopologyNode:
    """Builds the tree DOWN from a customer, using the correct models."""
    
    if not customer.user:
        customer = db.query(models.CustomerProfile).options(
            joinedload(models.CustomerProfile.user)
        ).filter(models.CustomerProfile.id == customer.id).first()

    # --- THIS IS THE FIX ---
    # Set safe defaults
    customer_name = "Orphaned Profile"
    customer_email = "N/A"
    customer_username = "N/A" # <-- This will be our customer ID
    customer_status = "UNKNOWN"

    if customer:
        customer_status = customer.status if customer.status else "UNKNOWN"
        
        if customer.user:
            customer_name = customer.user.full_name
            customer_email = customer.user.email
            customer_username = customer.user.username # <-- Get the username
    else:
        return TopologyNode(
            id=f"error-customer", 
            type="customer", 
            name="Error: Customer not found", 
            status="FAULTY"
        )
    # --- END FIX ---

    customer_node = TopologyNode(
        id=f"customer-{customer.id}",
        type='customer',
        name=customer_name,
        status=customer_status,
        details={
            "email": customer_email, 
            "customer_id": customer_username, # <-- Use username here
            # Your model does not have a phone number, so it is removed.
        }
    )
    
    # This logic is correct based on your models.py
    # (Asset.assigned_to_customer_id is FK to CustomerProfile.id)
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
                status=asset_status,
                details={"model": asset.model or "N/A", "location": asset.location or "N/A"},
                children=[]
            )
        elif asset.asset_type == models.AssetType.ROUTER:
            router_node = TopologyNode(
                id=f"router-{asset.id}",
                type='router',
                name=asset.serial_number or "Router",
                status=asset_status,
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
    fdh_node = TopologyNode(
        id=f"fdh-{fdh.id}",
        type='fdh',
        name=fdh.name or "FDH",
        status="ACTIVE", # FDH model has no status
        details={
            "model": fdh.name or "N/A",
            "location": fdh.location or "N/A",
            "pincode": fdh.pincode or "N/A"
        }
    )
    
    # This logic is correct based on your models.py
    # (Splitter.fdh_id is FK to FDH.id)
    splitters = db.query(models.Splitter).filter(
        models.Splitter.fdh_id == fdh.id
    ).options(
        selectinload(models.Splitter.customers) # Load customers from splitter
            .selectinload(models.CustomerProfile.user) # Load user from customer
    ).all()

    for splitter in splitters:
        splitter_node = TopologyNode(
            id=f"splitter-{splitter.id}",
            type='splitter',
            name=splitter.name or "Splitter",
            status="ACTIVE", # Splitter model has no status
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
    """Searches for Customers (by name/email/username) and FDHs (by name/pincode/district)."""
    suggestions = []
    search_term = f"%{query}%"
    
    # This query is correct based on your models.py
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
            id=c.id, # This is CustomerProfile.id
            name=f"{c.user.full_name}",
            type='customer',
            label=f"Customer: {c.user.full_name} ({c.user.email})"
        ))
        
    # This query is correct based on your models.py
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
            id=f.id, # This is FDH.id
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
    """Gets the entire network topology starting from an FDH."""
    fdh = db.query(models.FDH).filter(
        models.FDH.id == fdh_id
    ).first()
    
    if not fdh:
        raise HTTPException(status_code=404, detail="FDH not found")
        
    return build_fdh_tree(fdh, db)

@router.get("/customer/{customer_id}", response_model=TopologyNode)
def get_topology_for_customer(
    customer_id: int, # This is the CustomerProfile ID
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner)
):
    """Traces a customer up to their FDH and returns the full tree."""
    
    # This query is correct based on your models.py
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
    
    fdh = customer.splitter.fdh
    return build_fdh_tree(fdh, db)