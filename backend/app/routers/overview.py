# backend/app/routers/overview.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from .. import models, schemas, deps
from ..database import get_db

router = APIRouter()

# --- Response Models ---
class DeviceCounts(BaseModel):
    active: int = 0; inactive: int = 0; pending: int = 0; faulty: int = 0; total: int = 0
class SplitterOverview(schemas.SplitterBase): # Assumes SplitterBase includes location fields
    id: int; load: int; device_counts: DeviceCounts
    class Config: from_attributes = True
class FdhOverview(schemas.FDHBase): # Assumes FDHBase includes location fields
    id: int; total_splitters: int; total_capacity: int; total_used_ports: int;
    device_counts: DeviceCounts; splitters: List[SplitterOverview]
    class Config: from_attributes = True
class PincodeGroup(BaseModel):
     pincode: str
     fdh_count: int
     device_counts: DeviceCounts
     fdhs: List[FdhOverview]
class DistrictGroup(BaseModel):
     district: str
     pincode_groups: List[PincodeGroup]
     # Add aggregated counts for the district
     total_fdhs: int
     total_devices: DeviceCounts
class RegionGroup(BaseModel):
     region: str
     district_groups: List[DistrictGroup]
     # Add aggregated counts for the region
     total_fdhs: int
     total_devices: DeviceCounts

@router.get("/", response_model=List[RegionGroup]) # Changed response model
def get_network_overview_grouped(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_planner),
    include_splitter_details: bool = Query(False, description="Include Splitter details under FDHs")
):
    """Provides a regional overview of network assets, grouped by Region -> District -> Pincode."""

    # Fetch all FDHs with necessary relationships loaded
    query_options = [joinedload(models.FDH.splitters).joinedload(models.Splitter.customers)]
    all_fdhs = db.query(models.FDH).options(*query_options).order_by(
         models.FDH.region, models.FDH.district, models.FDH.pincode, models.FDH.name
    ).all()

    # --- Data Processing and Grouping ---
    regions_data: Dict[str, Dict[str, Dict[str, List[Dict[str, Any]]]]] = {} # Region -> District -> Pincode -> [FDH Dicts]

    for fdh in all_fdhs:
        region = fdh.region or "Unknown Region"
        district = fdh.district or "Unknown District"
        pincode = fdh.pincode or "Unknown Pincode"

        # Ensure keys exist
        if region not in regions_data: regions_data[region] = {}
        if district not in regions_data[region]: regions_data[region][district] = {}
        if pincode not in regions_data[region][district]: regions_data[region][district][pincode] = []

        # Calculate FDH Stats (similar to previous version)
        fdh_counts = {'active': 0, 'inactive': 0, 'pending': 0, 'faulty': 0, 'total': 0}
        splitter_details_list = []
        fdh_total_used = 0
        fdh_total_capacity = sum(s.port_capacity or 8 for s in fdh.splitters)

        for splitter in fdh.splitters:
             splitter_used = len(splitter.customers)
             fdh_total_used += splitter_used
             splitter_counts = {'active': 0, 'inactive': 0, 'pending': 0, 'faulty': 0, 'total': 0}
             for cust in splitter.customers:
                  status = cust.status.upper() if cust.status else "UNKNOWN"
                  splitter_counts['total'] += 1
                  if status == 'ACTIVE': splitter_counts['active'] += 1
                  elif status == 'INACTIVE': splitter_counts['inactive'] += 1
                  elif 'PENDING' in status: splitter_counts['pending'] += 1
             for key in fdh_counts: fdh_counts[key] += splitter_counts[key]

             if include_splitter_details:
                  splitter_data_dict = {
                      "id": splitter.id, "name": splitter.name, "port_capacity": splitter.port_capacity or 8,
                      "location": splitter.location, "pincode": splitter.pincode, "district": splitter.district, "region": splitter.region,
                      "load": splitter_used, "device_counts": DeviceCounts(**splitter_counts)
                  }
                  splitter_details_list.append(SplitterOverview(**splitter_data_dict))

        # Store FDH data as a dictionary within the nested structure
        fdh_data_dict = {
            "id": fdh.id, "name": fdh.name, "location": fdh.location,
            "region": fdh.region, "district": fdh.district, "pincode": fdh.pincode,
            "total_splitters": len(fdh.splitters), "total_capacity": fdh_total_capacity,
            "total_used_ports": fdh_total_used, "device_counts": fdh_counts, # Store counts as dict
            "splitters": [spl.dict() for spl in splitter_details_list] # Store splitters as dicts
        }
        regions_data[region][district][pincode].append(fdh_data_dict)

    # --- Format into Pydantic Response Models ---
    final_response: List[RegionGroup] = []
    for region_name, districts in regions_data.items():
        district_groups_list: List[DistrictGroup] = []
        region_total_fdhs = 0
        region_total_devices = DeviceCounts()

        for district_name, pincodes in districts.items():
            pincode_groups_list: List[PincodeGroup] = []
            district_total_fdhs = 0
            district_total_devices = DeviceCounts()

            for pincode_name, fdh_list_dicts in pincodes.items():
                pincode_counts = DeviceCounts()
                parsed_fdhs: List[FdhOverview] = []
                for fdh_dict in fdh_list_dicts:
                    # Parse dict back into Pydantic model for validation/structure
                    fdh_model = FdhOverview(
                        **fdh_dict,
                        device_counts=DeviceCounts(**fdh_dict['device_counts']), # Parse nested dict
                        splitters=[SplitterOverview(**spl_dict) for spl_dict in fdh_dict['splitters']] # Parse list
                    )
                    parsed_fdhs.append(fdh_model)
                    # Aggregate counts for pincode
                    pincode_counts.active += fdh_model.device_counts.active
                    pincode_counts.inactive += fdh_model.device_counts.inactive
                    pincode_counts.pending += fdh_model.device_counts.pending
                    pincode_counts.faulty += fdh_model.device_counts.faulty
                    pincode_counts.total += fdh_model.device_counts.total

                pincode_group = PincodeGroup(
                    pincode=pincode_name, fdh_count=len(parsed_fdhs),
                    device_counts=pincode_counts, fdhs=parsed_fdhs
                )
                pincode_groups_list.append(pincode_group)
                # Aggregate counts for district
                district_total_fdhs += pincode_group.fdh_count
                district_total_devices.active += pincode_counts.active
                district_total_devices.inactive += pincode_counts.inactive
                district_total_devices.pending += pincode_counts.pending
                district_total_devices.faulty += pincode_counts.faulty
                district_total_devices.total += pincode_counts.total

            district_group = DistrictGroup(
                district=district_name, pincode_groups=pincode_groups_list,
                total_fdhs=district_total_fdhs, total_devices=district_total_devices
            )
            district_groups_list.append(district_group)
            # Aggregate counts for region
            region_total_fdhs += district_total_fdhs
            region_total_devices.active += district_total_devices.active
            region_total_devices.inactive += district_total_devices.inactive
            region_total_devices.pending += district_total_devices.pending
            region_total_devices.faulty += district_total_devices.faulty
            region_total_devices.total += district_total_devices.total

        region_group = RegionGroup(
            region=region_name, district_groups=district_groups_list,
            total_fdhs=region_total_fdhs, total_devices=region_total_devices
        )
        final_response.append(region_group)

    return final_response