# backend/app/schemas.py
import datetime
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from .models import UserRole, AssetType, AssetStatus # Import our enums

# --- User & Auth Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    username: str
    password: str
    role: UserRole

class UserSignUp(BaseModel): # Special for customer sign up
    email: EmailStr
    username: str
    password: str
    full_name: str
    address: str # We'll create the CustomerProfile from this
    pincode:str

class User(UserBase):
    id: int
    username: str
    role: UserRole
    is_active: bool

    class Config:
        from_attributes = True # Tells Pydantic to read data even if it's not a dict (e.g., ORM object)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# --- Asset Schemas ---
class AssetBase(BaseModel):
    model: Optional[str] = None
    asset_type: AssetType
    location: Optional[str] = None

class AssetCreate(AssetBase):
    serial_number: str
    status: AssetStatus = AssetStatus.AVAILABLE

class Asset(AssetBase):
    id: int
    serial_number: str
    status: AssetStatus
    assigned_to_customer_id: Optional[int] = None

    class Config:
        from_attributes = True  # <-- THIS WAS THE SYNTAX ERROR

# --- THIS IS THE NEW CLASS YOU WERE MISSING ---
# --- THIS IS THE NEW CLASS YOU WERE MISSING ---
class AssetUpdate(BaseModel):
    model: Optional[str] = None
    location: Optional[str] = None
    status: Optional[AssetStatus] = None # <-- FIX: Removed 'models.'
    assigned_to_customer_id: Optional[int] = None
# ---------------------------------------------


class AssetHistoryBase(BaseModel):
    timestamp: datetime.datetime
    action: str
    details: Optional[str] = None

class AssetHistory(AssetHistoryBase):
    id: int
    asset_id: int
    changed_by_user_id: Optional[int] = None

    class Config:
        from_attributes = True # Replaces orm_mode

# --- Schemas for Sprints 2, 3, 4 ---
# We'll add these here now so you don't get import errors later.

# --- Hierarchy Schemas (Sprint 2) ---
class CustomerProfileSimple(BaseModel): # To nest inside splitter/pending list
    id: int
    user_id: int
    address: str
    status: str
    splitter_port: Optional[int]
    pincode: Optional[str] = None # <-- *** ADD/ENSURE THIS LINE EXISTS ***

    class Config:
        from_attributes = True

class SplitterBase(BaseModel):
    name: str
    port_capacity: int = 8
    location: Optional[str] = None

class SplitterCreate(SplitterBase):
    fdh_id: int

class Splitter(SplitterBase):
    id: int
    fdh_id: int
    customers: List[CustomerProfileSimple] = []

    class Config:
        from_attributes = True

class FDHBase(BaseModel):
    name: str
    location: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None # <-- Add district
    pincode: Optional[str] = None  # <-- Add pincode

class FDHCreate(FDHBase):
    pass

class FDH(FDHBase):
    id: int
    splitters: List[Splitter] = []

    class Config:
        from_attributes = True

# --- Onboarding Schemas (Sprint 2) ---
class CustomerOnboardRequest(BaseModel):
    customer_profile_id: int # The profile of the customer to onboard
    splitter_id: int
    splitter_port: int

# --- Task Schemas (Sprint 3) ---
class TaskNote(BaseModel):
    notes: str

class TaskStatusUpdate(BaseModel):
    status: str # "IN_PROGRESS", "COMPLETED", "FAILED"

class Task(BaseModel): # A full task schema for responses
    id: int
    status: str
    notes: Optional[str]
    customer: CustomerProfileSimple
    
    class Config:
        from_attributes = True

class PortSuggestion(BaseModel):
    fdh_id: int
    fdh_name: str
    splitter_id: int
    splitter_name: str
    port_number: int
    
# --- Customer Portal Schemas (Sprint 4) ---
class MyAsset(BaseModel):
    model: Optional[str]
    asset_type: AssetType
    serial_number: str
    
    class Config:
        from_attributes = True

class MyProfile(BaseModel):
    full_name: Optional[str]
    email: EmailStr
    address: Optional[str]
    plan: Optional[str]
    status: Optional[str]
    assigned_assets: List[MyAsset]
    
    class Config:
        from_attributes = True