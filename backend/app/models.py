# backend/app/models.py
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Enum as PyEnum
from sqlalchemy.orm import relationship
from .database import Base # Assuming Base is defined in database.py
import datetime
import enum

# --- Enums ---
class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    PLANNER = "PLANNER"
    TECHNICIAN = "TECHNICIAN"
    SUPPORT = "SUPPORT"
    CUSTOMER = "CUSTOMER"

class AssetType(str, enum.Enum):
    ONT = "ONT"
    ROUTER = "ROUTER"
    FDH = "FDH"
    SPLITTER = "SPLITTER"


class AssetStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    FAULTY = "FAULTY"
    IN_REPAIR = "IN_REPAIR"
    RETIRED = "RETIRED"
    IN_USE = "IN_USE"  # <-- THIS IS THE FIX

# --- Models ---

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(PyEnum(UserRole), nullable=False, default=UserRole.CUSTOMER)
    is_active = Column(Boolean, default=True)

    # Relationship to CustomerProfile (one-to-one)
    customer_profile = relationship("CustomerProfile", uselist=False, back_populates="user", cascade="all, delete-orphan")
    # Relationship for tasks assigned to technician
    assigned_tasks = relationship("DeploymentTask", back_populates="technician")

class CustomerProfile(Base):
    __tablename__ = "customer_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    address = Column(String, index=True)
    pincode = Column(String(6), index=True, nullable=True) # Added pincode
    plan = Column(String, nullable=True)
    status = Column(String, index=True, default="PENDING_ONBOARDING") # e.g., PENDING_ONBOARDING, PENDING_INSTALLATION, ACTIVE, INACTIVE
    splitter_id = Column(Integer, ForeignKey("splitters.id"), nullable=True)
    splitter_port = Column(Integer, nullable=True)

    # --- Relationships ---
    user = relationship("User", back_populates="customer_profile")
    splitter = relationship("Splitter", back_populates="customers")
    # **This relationship links CustomerProfile to the Assets assigned to it**
    # **back_populates="assigned_to_customer" must match the name in the Asset model**
    assigned_assets = relationship("Asset", back_populates="assigned_to_customer")
    deployment_task = relationship("DeploymentTask", uselist=False, back_populates="customer")

class Asset(Base):
    __tablename__ = "assets"
    id = Column(Integer, primary_key=True, index=True)
    serial_number = Column(String, unique=True, index=True, nullable=False)
    model = Column(String, nullable=True)
    asset_type = Column(PyEnum(AssetType), nullable=False)
    status = Column(PyEnum(AssetStatus), nullable=False, default=AssetStatus.AVAILABLE)
    location = Column(String, nullable=True)

    # Foreign Key linking to the customer profile
    assigned_to_customer_id = Column(Integer, ForeignKey("customer_profiles.id"), nullable=True)

    # --- Relationships ---
    # **This relationship links Asset back to the CustomerProfile it's assigned to**
    # **back_populates="assigned_assets" must match the name in the CustomerProfile model**
    assigned_to_customer = relationship("CustomerProfile", back_populates="assigned_assets")
    # Relationship to AssetHistory
    history = relationship("AssetHistory", back_populates="asset", cascade="all, delete-orphan")

class AssetHistory(Base):
    __tablename__ = "asset_history"
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=datetime.datetime.now(datetime.timezone.utc))
    action = Column(String(100), nullable=False) # e.g., "CREATED", "STATUS_CHANGE", "ASSIGNED"
    details = Column(String, nullable=True) # e.g., "Status changed from AVAILABLE to FAULTY"
    changed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Who made the change?

    # --- Relationships ---
    asset = relationship("Asset", back_populates="history")
    changed_by_user = relationship("User") # Link to the user who made the change

class Splitter(Base):
    __tablename__ = "splitters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    port_capacity = Column(Integer, default=8)
    location = Column(String, nullable=True)
    fdh_id = Column(Integer, ForeignKey("fdhs.id"), nullable=False)
    pincode = Column(String(6), index=True, nullable=True)  # <-- Add pincode
    district = Column(String, index=True, nullable=True) # <-- Add district
    region = Column(String, index=True, nullable=True)   # <-- Add region
    # --- Relationships ---
    fdh = relationship("FDH", back_populates="splitters")
    customers = relationship("CustomerProfile", back_populates="splitter") # Customers connected

class FDH(Base):
    __tablename__ = "fdhs"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    location = Column(String, nullable=True) # e.g., Specific area like "Adyar"
    pincode = Column(String(6), index=True, nullable=True)  # Added pincode
    district = Column(String, index=True, nullable=True) # Added district
    region = Column(String, index=True, nullable=True)   # Added region

    # --- Relationships ---
    splitters = relationship("Splitter", back_populates="fdh", cascade="all, delete-orphan")

class DeploymentTask(Base):
    __tablename__ = "deployment_tasks"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customer_profiles.id"), nullable=False, unique=True) # One task per customer profile install
    technician_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Technician assigned
    status = Column(String, index=True, default="PENDING") # e.g., PENDING, IN_PROGRESS, COMPLETED, FAILED
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.now(datetime.timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.now(datetime.timezone.utc), onupdate=datetime.datetime.now(datetime.timezone.utc))

    # --- Relationships ---
    customer = relationship("CustomerProfile", back_populates="deployment_task")
    technician = relationship("User", back_populates="assigned_tasks")