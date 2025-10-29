# backend/app/models.py
import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
import datetime

# --- IMPORT Base FROM YOUR NEW database.py FILE ---
from .database import Base

# --- ENUMS ---

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    PLANNER = "PLANNER"
    TECHNICIAN = "TECHNICIAN"
    SUPPORT = "SUPPORT"
    CUSTOMER = "CUSTOMER"

class AssetType(str, enum.Enum):
    ONT = "ONT"
    ROUTER = "ROUTER"
    SPLITTER = "SPLITTER"
    FDH = "FDH"
    CORE_SWITCH = "CORE_SWITCH"

class AssetStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    FAULTY = "FAULTY"
    IN_REPAIR = "IN_REPAIR"
    RETIRED = "RETIRED"

class AssetHistory(Base):
    __tablename__ = "asset_history"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=datetime.datetime.now(datetime.timezone.utc))
    
    # The action performed, e.g., "CREATED", "STATUS_CHANGE", "ASSIGNED"
    action = Column(String(100), nullable=False) 
    
    # Details of the change, e.g., "Status changed from AVAILABLE to FAULTY"
    details = Column(String, nullable=True) 
    
    # Who made the change?
    changed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Nullable for system actions
    
    asset = relationship("Asset", back_populates="history")
    changed_by_user = relationship("User")
# --- MODELS ---

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(Enum(UserRole), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Relationships
    customer_profile = relationship("CustomerProfile", back_populates="user", uselist=False)
    assigned_tasks = relationship("DeploymentTask", back_populates="technician")

class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String, unique=True, index=True, nullable=False)
    model = Column(String)
    asset_type = Column(Enum(AssetType), nullable=False)
    status = Column(Enum(AssetStatus), default=AssetStatus.AVAILABLE)
    location = Column(String, default="Central Warehouse")
    
    # Relationship: Which customer is this asset assigned to?
    assigned_to_customer_id = Column(Integer, ForeignKey("customer_profiles.id"), nullable=True)
    customer = relationship("CustomerProfile", back_populates="assigned_assets")
    history = relationship("AssetHistory", back_populates="asset", cascade="all, delete-orphan")
class CustomerProfile(Base):
    __tablename__ = "customer_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    address = Column(String)
    pincode = Column(String(6), index=True, nullable=True) # Added pincode
    plan = Column(String)
    status = Column(String, default="PENDING_INSTALLATION") # e.g., PENDING, ACTIVE, INACTIVE
    
    # Relationships
    user = relationship("User", back_populates="customer_profile")
    assigned_assets = relationship("Asset", back_populates="customer")
    
    # Link to hierarchy (added in Sprint 2 logic)
    splitter_id = Column(Integer, ForeignKey("splitters.id"), nullable=True)
    splitter_port = Column(Integer, nullable=True)
    splitter = relationship("Splitter", back_populates="customers")

class FDH(Base):
    __tablename__ = "fdhs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    location = Column(String)
    pincode = Column(String(6), index=True, nullable=True)
    region = Column(String)
    splitters = relationship("Splitter", back_populates="fdh")

class Splitter(Base):
    __tablename__ = "splitters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    port_capacity = Column(Integer, default=8)
    location = Column(String)
    fdh_id = Column(Integer, ForeignKey("fdhs.id"))
    
    fdh = relationship("FDH", back_populates="splitters")
    customers = relationship("CustomerProfile", back_populates="splitter")

class DeploymentTask(Base):
    __tablename__ = "deployment_tasks"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customer_profiles.id"))
    technician_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="PENDING") # PENDING, IN_PROGRESS, COMPLETED, FAILED
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    customer = relationship("CustomerProfile")
    technician = relationship("User", back_populates="assigned_tasks")