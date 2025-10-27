# backend/app/seed.py
from faker import Faker
from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import User, Asset, UserRole, AssetType, AssetStatus, FDH, Splitter
from .security import get_password_hash

fake = Faker()

def seed_db():
    db: Session = SessionLocal()
    
    try:
        # Check if users already exist
        if db.query(User).count() == 0:
            print("Seeding database...")
            
            # --- Create Users ---
            users_data = [
                {"username": "admin", "email": "admin@example.com", "full_name": "Admin User", "role": UserRole.ADMIN, "pw": "admin123"},
                {"username": "planner", "email": "planner@example.com", "full_name": "Planner Pete", "role": UserRole.PLANNER, "pw": "planner123"},
                {"username": "tech", "email": "tech@example.com", "full_name": "Technician Tim", "role": UserRole.TECHNICIAN, "pw": "tech123"},
                {"username": "support", "email": "support@example.com", "full_name": "Support Sara", "role": UserRole.SUPPORT, "pw": "support123"},
            ]
            
            for user_data in users_data:
                hashed_pw = get_password_hash(user_data["pw"])
                db_user = User(
                    username=user_data["username"],
                    email=user_data["email"],
                    full_name=user_data["full_name"],
                    hashed_password=hashed_pw,
                    role=user_data["role"]
                )
                db.add(db_user)
            
            db.commit()
            print("Users seeded.")

            # --- Create Assets (Inventory) ---
            asset_types = [
                (AssetType.ONT, "ONT-XG99", 50),
                (AssetType.ROUTER, "WiFi-Router-AC3200", 50),
                (AssetType.SPLITTER, "1:8 Passive Splitter", 10),
                (AssetType.FDH, "FDH-3000 Cabinet", 5)
            ]
            
            for asset_type, model, count in asset_types:
                for _ in range(count):
                    asset = Asset(
                        serial_number=f"{asset_type.value}-{fake.unique.ean(length=13)}",
                        model=model,
                        asset_type=asset_type,
                        status=AssetStatus.AVAILABLE,
                        location="Central Warehouse"
                    )
                    db.add(asset)
            
            db.commit()
            print("Assets seeded.")

            # --- Create Network Hierarchy (for Sprint 2) ---
            fdh_a = FDH(name="FDH-A", location="North Region", region="North")
            fdh_b = FDH(name="FDH-B", location="East Region", region="East")
            db.add_all([fdh_a, fdh_b])
            db.commit()

            splitter_a1 = Splitter(name="SPL-A1", port_capacity=8, location="Neighborhood A1", fdh_id=fdh_a.id)
            splitter_a2 = Splitter(name="SPL-A2", port_capacity=8, location="Neighborhood A2", fdh_id=fdh_a.id)
            splitter_b1 = Splitter(name="SPL-B1", port_capacity=8, location="Neighborhood B1", fdh_id=fdh_b.id)
            splitter_b2 = Splitter(name="SPL-B2", port_capacity=8, location="Neighborhood B2", fdh_id=fdh_b.id)
            db.add_all([splitter_a1, splitter_a2, splitter_b1, splitter_b2])
            
            db.commit()
            print("Hierarchy seeded.")

        else:
            print("Database already seeded.")
            
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()