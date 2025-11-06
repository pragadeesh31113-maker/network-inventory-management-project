from sqlalchemy.orm import Session, joinedload
from . import models, schemas # <-- THIS IS THE FIX (was 'from ..')
from typing import List, Dict, Any
import json

# This is a skill for the AI to use
def suggest_available_assets(db: Session, asset_type: str, count: int) -> List[Dict[str, Any]]:
    """
    Finds a list of available assets of a specific type.
    Tool for the AI to suggest ONTs or Routers for a planner to assign.
    """
    
    # Validate asset_type
    valid_types = {"ONT": models.AssetType.ONT, "ROUTER": models.AssetType.ROUTER}
    if asset_type.upper() not in valid_types:
        return [{"error": f"Invalid asset_type. Must be 'ONT' or 'ROUTER'."}]

    assets = db.query(models.Asset).filter(
        models.Asset.asset_type == valid_types[asset_type.upper()],
        models.Asset.status == models.AssetStatus.AVAILABLE
    ).limit(count).all()
    
    if not assets:
        return [{"error": f"No {asset_type.upper()}s are currently AVAILABLE in the inventory."}]
        
    # Return a simple list of dicts for the AI to parse
    return [
        {
            "serial_number": asset.serial_number,
            "model": asset.model,
            "location": asset.location
        } 
        for asset in assets
    ]

# This is a skill for the AI to use
def get_customer_hierarchy(db: Session, customer_name_or_id: str) -> Dict[str, Any]:
    """
    Finds a customer by their name or username and returns their full network path.
    Tool for the AI to explain a customer's hierarchy.
    """
    search_term = f"%{customer_name_or_id}%"
    
    # Find the customer
    customer = db.query(models.CustomerProfile).join(models.User).filter(
        (models.User.full_name.ilike(search_term)) |
        (models.User.username.ilike(search_term))
    ).options(
        joinedload(models.CustomerProfile.user),
        joinedload(models.CustomerProfile.splitter)
            .joinedload(models.Splitter.fdh)
    ).first()
    
    if not customer:
        return {"error": f"Customer '{customer_name_or_id}' not found."}
        
    if not customer.splitter or not customer.splitter.fdh:
        return {
            "customer_name": customer.user.full_name,
            "status": "Not Onboarded",
            "detail": "Customer is not connected to a valid FDH or Splitter."
        }
        
    # Build the hierarchy path
    return {
        "customer_name": customer.user.full_name,
        "status": customer.status,
        "path": [
            {"type": "FDH", "name": customer.splitter.fdh.name, "location": customer.splitter.fdh.location},
            {"type": "Splitter", "name": customer.splitter.name, "port_assigned": customer.splitter_port},
            {"type": "Customer", "name": customer.user.full_name, "address": customer.address}
        ]
    }

# This is a skill for the AI to use
def troubleshoot_install_issue(db: Session, issue_description: str) -> str:
    """
    Provides troubleshooting steps for common technician issues.
    This is a "knowledge base" tool.
    """
    
    # In a real app, this would query a 'kb_articles' table.
    # For now, we hardcode the knowledge.
    kb = {
        "light": "1. Verify the fiber optic cable is securely plugged into the ONT. 2. Check for any sharp bends or breaks in the fiber. 3. Clean the fiber connector end with a one-click cleaner.",
        "connection": "1. Check that the router's WAN port is connected to the ONT's LAN port. 2. Reboot the router. 3. Check if the customer's device (laptop/phone) is connected to the correct Wi-Fi network.",
        "speed": "1. Run a speed test on a *wired* device, not Wi-Fi. 2. Check the customer's subscribed plan. 3. Ensure no other devices are heavily using the network."
    }
    
    issue = issue_description.lower()
    if "light" in issue or "red light" in issue or "los" in issue:
        return kb["light"]
    elif "connection" in issue or "internet" in issue or "no ip" in issue:
        return kb["connection"]
    elif "slow" in issue or "speed" in issue:
        return kb["speed"]
    else:
        return "I'm not sure about that specific issue, but here are general steps: 1. Reboot the ONT. 2. Reboot the Router. 3. Check all cable connections."