from sqlalchemy.orm import Session, joinedload, selectinload
from . import models, schemas
from .asset_logger import log_asset_change # Import the logger
from typing import List, Dict, Any, Optional
import json
import datetime # Import datetime for task updates

# --- EXISTING TOOLS (IMPROVED) ---

def suggest_available_assets(db: Session, asset_type: str, count: int) -> List[Dict[str, Any]]:
    """
    Finds a list of available assets of a specific type.
    Tool for the AI to suggest ONTs or Routers for a planner to assign.
    """
    valid_types = {"ONT": models.AssetType.ONT, "ROUTER": models.AssetType.ROUTER}
    if asset_type.upper() not in valid_types:
        return [{"error": f"Invalid asset_type. Must be 'ONT' or 'ROUTER'."}]

    assets = db.query(models.Asset).filter(
        models.Asset.asset_type == valid_types[asset_type.upper()],
        models.Asset.status == models.AssetStatus.AVAILABLE
    ).limit(count).all()
    
    if not assets:
        return [{"error": f"No {asset_type.upper()}s are currently AVAILABLE in the inventory."}]
        
    return [
        {
            "serial_number": asset.serial_number,
            "model": asset.model,
            "location": asset.location
        } 
        for asset in assets
    ]

def get_customer_hierarchy(db: Session, customer_name_or_id: str) -> Dict[str, Any]:
    """
    Finds a customer by their name or username and returns their full network path.
    Tool for the AI to explain a customer's hierarchy.
    """
    search_term = f"%{customer_name_or_id}%"
    
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
        
    return {
        "customer_name": customer.user.full_name,
        "status": customer.status,
        "path": [
            {"type": "FDH", "name": customer.splitter.fdh.name, "location": customer.splitter.fdh.location},
            {"type": "Splitter", "name": customer.splitter.name, "port_assigned": customer.splitter_port},
            {"type": "Customer", "name": customer.user.full_name, "address": customer.address}
        ]
    }

def troubleshoot_install_issue(db: Session, issue_description: str) -> str:
    """
    Provides troubleshooting steps for common technician issues.
    This is a "knowledge base" tool.
    """
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

# --- NEW TOOL 1: LIST DEVICES (IMPROVED) ---
def list_devices(db: Session, status: Optional[str] = None, asset_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Lists devices from the Asset table, optionally filtered by status or asset_type.
    This tool is smart and can calculate 'IN_USE' status.
    It also returns the assigned customer's name.
    """
    query = db.query(models.Asset).options(
        joinedload(models.Asset.assigned_to_customer)
            .joinedload(models.CustomerProfile.user)
    )
    
    calculated_status = None
    if status:
        try:
            # Check if it's a real status
            status_enum = models.AssetStatus(status.upper())
            query = query.filter(models.Asset.status == status_enum)
        except ValueError:
            # It's not a real status. Is it our calculated 'IN_USE' status?
            if status.upper() == "IN_USE":
                calculated_status = "IN_USE"
            else:
                return [{"error": f"Invalid status. Valid statuses are: {[s.value for s in models.AssetStatus]} plus IN_USE"}]

    if asset_type:
        try:
            type_enum = models.AssetType(asset_type.upper())
            query = query.filter(models.Asset.asset_type == type_enum)
        except ValueError:
            return [{"error": f"Invalid asset_type. Valid types are: {[t.value for t in models.AssetType]}"}]
            
    assets = query.limit(30).all() # Return more
    
    # --- Calculate 'IN_USE' status (same logic as assets.py) ---
    used_splitter_names_query = db.query(models.Splitter.name).join(models.CustomerProfile).distinct()
    used_splitter_name_set = {name for (name,) in used_splitter_names_query.all()}
    used_fdh_names_query = db.query(models.FDH.name).join(models.Splitter).join(models.CustomerProfile).distinct()
    used_fdh_name_set = {name for (name,) in used_fdh_names_query.all()}
    
    results = []
    for a in assets:
        current_status = a.status.value
        
        # Calculate live status for hierarchy items
        try:
            if a.asset_type == models.AssetType.SPLITTER and a.status == models.AssetStatus.AVAILABLE:
                name_part = a.serial_number.split('-SN-')[1].rsplit('-', 1)[0]
                if name_part in used_splitter_name_set:
                     current_status = "IN_USE"
            elif a.asset_type == models.AssetType.FDH and a.status == models.AssetStatus.AVAILABLE:
                name_part = a.serial_number.split('-SN-')[1].rsplit('-', 1)[0]
                if name_part in used_fdh_name_set:
                    current_status = "IN_USE"
        except IndexError:
            pass # Malformed serial, skip
        
        # If the user is filtering by the calculated "IN_USE" status, skip non-matches
        if calculated_status == "IN_USE" and current_status != "IN_USE":
            continue
            
        results.append({
            "serial_number": a.serial_number,
            "asset_type": a.asset_type.value,
            "status": current_status,
            "location": a.location,
            "assigned_customer": a.assigned_to_customer.user.full_name if (a.assigned_to_customer and a.assigned_to_customer.user) else None
        })
    
    if not results:
        return [{"message": f"No assets found matching the criteria."}]
    return results

# --- NEW TOOL 2: GET SPLITTER DETAILS ---
def get_splitter_details(db: Session, splitter_name: str) -> Dict[str, Any]:
    """
    Gets the port-by-port connection details for a specific splitter.
    """
    splitter = db.query(models.Splitter).filter(
        models.Splitter.name.ilike(f"%{splitter_name}%")
    ).options(
        joinedload(models.Splitter.customers).joinedload(models.CustomerProfile.user),
        joinedload(models.Splitter.fdh) # Load the parent FDH
    ).first()
    
    if not splitter:
        return {"error": f"Splitter '{splitter_name}' not found."}
        
    port_capacity = splitter.port_capacity or 8
    ports = []
    
    used_ports_map = {
        customer.splitter_port: customer.user.full_name 
        for customer in splitter.customers 
        if customer.splitter_port is not None
    }
    
    for i in range(1, port_capacity + 1):
        if i in used_ports_map:
            ports.append({
                "port": i,
                "status": "ASSIGNED",
                "customer": used_ports_map[i]
            })
        else:
            ports.append({
                "port": i,
                "status": "AVAILABLE",
                "customer": None
            })
            
    return {
        "splitter_name": splitter.name,
        "fdh_name": splitter.fdh.name if splitter.fdh else "N/A",
        "total_ports": port_capacity,
        "used_ports": len(used_ports_map),
        "available_ports": port_capacity - len(used_ports_map),
        "ports": ports
    }

# --- NEW TOOL 3: GET TECHNICIAN TASKS ---
def get_technician_tasks(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """
    Gets a list of PENDING or IN_PROGRESS tasks for the currently logged-in technician.
    """
    tasks = db.query(models.DeploymentTask).filter(
        models.DeploymentTask.technician_id == user_id,
        models.DeploymentTask.status.in_(["PENDING", "IN_PROGRESS"])
    ).options(
        joinedload(models.DeploymentTask.customer).joinedload(models.CustomerProfile.user)
    ).limit(10).all()
    
    if not tasks:
        return [{"message": "You have no pending or in-progress tasks."}]
        
    return [
        {
            "task_id": task.id,
            "customer_name": task.customer.user.full_name if task.customer and task.customer.user else "N/A",
            "address": task.customer.address if task.customer else "N/A",
            "status": task.status
        }
        for task in tasks
    ]
    
# --- NEW TOOL 4: GET DEVICE DETAILS BY SERIAL ---
def get_device_details_by_serial(db: Session, serial_number: str) -> Dict[str, Any]:
    """
    Finds a single asset by its serial number and returns its full details,
    including status and assigned customer.
    """
    asset = db.query(models.Asset).filter(
        models.Asset.serial_number.ilike(f"%{serial_number}%")
    ).options(
        joinedload(models.Asset.assigned_to_customer).joinedload(models.CustomerProfile.user)
    ).first()
    
    if not asset:
        return {"error": f"Asset with serial number '{serial_number}' not found."}
        
    status = asset.status.value
    
    # Calculate IN_USE status
    if status == "AVAILABLE":
        try:
            if asset.asset_type == models.AssetType.SPLITTER:
                name_part = asset.serial_number.split('-SN-')[1].rsplit('-', 1)[0]
                is_in_use = db.query(models.Splitter).join(models.CustomerProfile).filter(models.Splitter.name == name_part).first()
                if is_in_use: status = "IN_USE"
            elif asset.asset_type == models.AssetType.FDH:
                name_part = asset.serial_number.split('-SN-')[1].rsplit('-', 1)[0]
                is_in_use = db.query(models.FDH).join(models.Splitter).join(models.CustomerProfile).filter(models.FDH.name == name_part).first()
                if is_in_use: status = "IN_USE"
        except IndexError:
            pass # Malformed serial
            
    customer = asset.assigned_to_customer
    
    return {
        "serial_number": asset.serial_number,
        "asset_type": asset.asset_type.value,
        "model": asset.model,
        "status": status,
        "location": asset.location,
        "assigned_customer": customer.user.full_name if (customer and customer.user) else None
    }

# --- NEW TOOL 5: UPDATE ASSET STATUS (WRITE ACTION) ---
def update_asset_status(db: Session, serial_number: str, new_status: str, user_id: int) -> Dict[str, Any]:
    """
    Updates the status of an asset (ONT, Router, FDH, or Splitter).
    Valid new statuses: AVAILABLE, FAULTY, IN_REPAIR, RETIRED
    """
    try:
        new_status_enum = models.AssetStatus(new_status.upper())
    except ValueError:
        return {"error": f"Invalid status. Valid statuses are: AVAILABLE, FAULTY, IN_REPAIR, RETIRED."}

    if new_status_enum in [models.AssetStatus.ASSIGNED, models.AssetStatus.IN_USE]:
        return {"error": "Cannot manually set status to ASSIGNED or IN_USE. Use Onboarding or mark as AVAILABLE."}

    db_asset = db.query(models.Asset).filter(
        models.Asset.serial_number.ilike(f"%{serial_number}%")
    ).first()
    
    if not db_asset:
        return {"error": f"Asset with serial number '{serial_number}' not found."}

    old_status = db_asset.status.value
    if old_status == new_status_enum.value:
        return {"message": f"Asset {serial_number} is already {new_status_enum.value}."}
        
    if old_status == models.AssetStatus.ASSIGNED:
        db_asset.assigned_to_customer_id = None
        
    db_asset.status = new_status_enum
    
    log_asset_change(
        db,
        asset_id=db_asset.id,
        action="UPDATED (BY AI)",
        details=f"Status changed from {old_status} to {new_status_enum.value}",
        user_id=user_id
    )
    
    db.commit()
    
    return {
        "serial_number": db_asset.serial_number,
        "new_status": new_status_enum.value,
        "message": "Asset status updated successfully."
    }

# --- NEW SKILL 6: UPDATE TASK STATUS (WRITE ACTION) ---
def update_task_status(db: Session, task_id: int, new_status: str) -> Dict[str, Any]:
    """
    Updates the status of a deployment task.
    Valid new statuses: IN_PROGRESS, COMPLETED, FAILED
    """
    valid_statuses = ["IN_PROGRESS", "COMPLETED", "FAILED"]
    if new_status.upper() not in valid_statuses:
        return {"error": f"Invalid status. Valid statuses are: {valid_statuses}."}
        
    task = db.query(models.DeploymentTask).filter(models.DeploymentTask.id == task_id).first()
    if not task:
        return {"error": f"Task with ID {task_id} not found."}

    new_status_str = new_status.upper()
    task.status = new_status_str
    
    if new_status_str == "COMPLETED":
        task.completed_at = datetime.datetime.now(datetime.timezone.utc)
        customer = db.query(models.CustomerProfile).filter(models.CustomerProfile.id == task.customer_id).first()
        if customer:
            customer.status = "ACTIVE"
            db.add(customer)
            
    db.add(task)
    db.commit()
    
    return {
        "task_id": task.id,
        "new_status": new_status_str,
        "message": "Task status updated successfully."
    }