# backend/app/routers/overview.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional, Dict, Any
from pydantic import BaseModel # Import BaseModel

from .. import models, schemas, deps
from ..database import get_db

router = APIRouter()

# Define response structure (ensure these match schemas.py if defined there)
class DeviceCounts(BaseModel):
    active: int = 0
    inactive: int = 0
    pending: int = 0
    faulty: int = 0
    total: int = 0

class SplitterOverview(schemas.SplitterBase):
     id: int
     load: int
     device_counts: DeviceCounts

class FdhOverview(schemas.FDHBase):
    id: int
    # Ensure pincode, district, region are included if added to FDHBase
    # pincode: Optional[str] = None
    # district: Optional[str] = None
    # region: Optional[str] = None
    total_splitters: int
    total_capacity: int
    total_used_ports: int
    device_counts: DeviceCounts
    splitters: List[SplitterOverview]

    class Config: # Add Config if nesting Pydantic models derived elsewhere
         from_attributes = True

class DistrictOverview(BaseModel):
     district: str
     pincode: str
     fdh_count: int
     device_counts: DeviceCounts
     fdhs: List[FdhOverview]

# Adjust response model based on your final desired structure
@router.get("/", response_model=Dict[str, List[DistrictOverview]])
def get_network_overview(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner),
    include_details: bool = Query(True, description="Include FDH and Splitter details") # Default to True now
):
    """Provides a regional overview of network assets, grouped by pincode."""

    overview: Dict[str, List[Dict[str, Any]]] = {} # Pincode -> List of FDH data dicts

    # Use joinedload for efficiency
    query_options = [
         joinedload(models.FDH.splitters).joinedload(models.Splitter.customers) # Load relations needed for counts
    ]

    # Fetch FDHs ordered by location fields
    all_fdhs = db.query(models.FDH).options(*query_options).order_by(
         models.FDH.region, models.FDH.district, models.FDH.pincode, models.FDH.name
    ).all()

    for fdh in all_fdhs:
        pincode = fdh.pincode or "UNKNOWN"
        if pincode not in overview:
            overview[pincode] = []

        # Calculate stats for this FDH
        fdh_total_splitters = len(fdh.splitters)
        fdh_total_capacity = sum(s.port_capacity or 8 for s in fdh.splitters)
        fdh_total_used = 0
        fdh_counts = {'active': 0, 'inactive': 0, 'pending': 0, 'faulty': 0, 'total': 0}
        splitter_details_list = []

        for splitter in fdh.splitters:
             splitter_used = len(splitter.customers)
             fdh_total_used += splitter_used
             splitter_counts = {'active': 0, 'inactive': 0, 'pending': 0, 'faulty': 0, 'total': 0}

             for cust in splitter.customers:
                  # Status counting based on CUSTOMER status
                  status = cust.status.upper() if cust.status else "UNKNOWN"
                  splitter_counts['total'] += 1
                  if status == 'ACTIVE': splitter_counts['active'] += 1
                  elif status == 'INACTIVE': splitter_counts['inactive'] += 1
                  elif 'PENDING' in status: splitter_counts['pending'] += 1
                  # Add 'faulty' logic if applicable (e.g., based on asset status)

             # Aggregate splitter counts to FDH counts
             for key in fdh_counts: fdh_counts[key] += splitter_counts[key]

             if include_details:
                 # Create SplitterOverview using data from the model instance
                 splitter_data_dict = {
                     "id": splitter.id,
                     "name": splitter.name,
                     "port_capacity": splitter.port_capacity or 8,
                     "location": splitter.location,
                     "load": splitter_used,
                     "device_counts": DeviceCounts(**splitter_counts)
                     # Exclude 'customers' and 'fdh' relationships if not in schema
                 }
                 splitter_details_list.append(SplitterOverview(**splitter_data_dict))


        # Create FdhOverview using data from the model instance
        fdh_data_dict = {
             "id": fdh.id,
             "name": fdh.name,
             "location": fdh.location,
             "region": fdh.region,
             "district": fdh.district,
             "pincode": fdh.pincode,
             "total_splitters": fdh_total_splitters,
             "total_capacity": fdh_total_capacity,
             "total_used_ports": fdh_total_used,
             "device_counts": DeviceCounts(**fdh_counts),
             "splitters": splitter_details_list # Already Pydantic models
        }
        overview[pincode].append(FdhOverview(**fdh_data_dict).dict()) # Append dict

    # Format the final response structure
    final_response_list: List[DistrictOverview] = []
    for pincode, fdh_list_dicts in overview.items():
        pincode_counts = {'active': 0, 'inactive': 0, 'pending': 0, 'faulty': 0, 'total': 0}
        district_name = "Unknown District" # Default
        for fdh_dict in fdh_list_dicts:
            district_name = fdh_dict.get('district') or district_name # Get district from first FDH
            for key in pincode_counts:
                pincode_counts[key] += fdh_dict['device_counts'][key]

        district_overview = DistrictOverview(
            district=district_name,
            pincode=pincode,
            fdh_count=len(fdh_list_dicts),
            device_counts=DeviceCounts(**pincode_counts),
            # Convert dicts back to FdhOverview models for response validation
            fdhs=[FdhOverview(**fdh_d) for fdh_d in fdh_list_dicts]
        )
        final_response_list.append(district_overview)

    # Sort by pincode
    final_response_list.sort(key=lambda x: x.pincode)

    # Return in the format defined by response_model
    return {"Overview": final_response_list}