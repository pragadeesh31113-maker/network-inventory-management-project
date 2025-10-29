# backend/app/seed.py
from sqlalchemy.orm import Session
from . import models, security # Assuming security is used for hashing passwords
from faker import Faker # Import Faker
import logging # Optional: for better logging

# Configure logging (optional but helpful)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

fake = Faker('en_IN') # Use Indian locale for potentially relevant fake data

def seed_users(db: Session):
    # Check if users already exist
    if db.query(models.User).count() == 0:
        logger.info("Seeding users...")
        try:
            hashed_password_admin = security.get_password_hash("admin123")
            hashed_password_planner = security.get_password_hash("planner123")
            hashed_password_tech = security.get_password_hash("tech123")
            hashed_password_support = security.get_password_hash("support123")

            users = [
                models.User(username="admin", email="admin@example.com", hashed_password=hashed_password_admin, role=models.UserRole.ADMIN, full_name="Admin User"),
                models.User(username="planner", email="planner@example.com", hashed_password=hashed_password_planner, role=models.UserRole.PLANNER, full_name="Network Planner"),
                models.User(username="tech", email="tech@example.com", hashed_password=hashed_password_tech, role=models.UserRole.TECHNICIAN, full_name="Field Technician"),
                models.User(username="support", email="support@example.com", hashed_password=hashed_password_support, role=models.UserRole.SUPPORT, full_name="Support Agent"),
            ]
            db.add_all(users)
            db.commit()
            logger.info("✅ Users seeded successfully.")
        except Exception as e:
            logger.error(f"❌ Error seeding users: {e}")
            db.rollback()
    else:
        logger.info("ℹ️ Users already exist, skipping seeding.")

def seed_hierarchy(db: Session):
    if db.query(models.FDH).count() == 0:
        logger.info("Seeding network hierarchy (FDHs + Splitters) across Tamil Nadu...")
        try:
            # --- Define Tamil Nadu FDHs with realistic data ---
            fdh_data = [
                # Chennai
                {"name": "CHN-ADY-01", "location": "Adyar Main Hub", "pincode": "600020", "district": "Chennai"},
                {"name": "CHN-TNG-01", "location": "T. Nagar Exchange", "pincode": "600017", "district": "Chennai"},
                {"name": "CHN-AMB-01", "location": "Ambattur Central", "pincode": "600053", "district": "Chennai"},
                # Coimbatore
                {"name": "CBE-GDP-01", "location": "Gandhipuram Central", "pincode": "641012", "district": "Coimbatore"},
                {"name": "CBE-RSP-01", "location": "RS Puram Hub", "pincode": "641002", "district": "Coimbatore"},
                # Madurai
                {"name": "MDU-ANN-01", "location": "Anna Nagar Point", "pincode": "625020", "district": "Madurai"},
                {"name": "MDU-TPT-01", "location": "Thirupparankundram Zone", "pincode": "625005", "district": "Madurai"},
                # Tiruchirappalli
                {"name": "TRY-SRC-01", "location": "Srirangam Main", "pincode": "620006", "district": "Tiruchirappalli"},
                {"name": "TRY-TNK-01", "location": "Thillai Nagar", "pincode": "620018", "district": "Tiruchirappalli"},
                # Salem
                {"name": "SLM-FTN-01", "location": "Fairlands Network Hub", "pincode": "636016", "district": "Salem"},
                {"name": "SLM-STN-01", "location": "Steel Plant Sector", "pincode": "636030", "district": "Salem"},
                # Tirunelveli
                {"name": "TNV-PAL-01", "location": "Palayamkottai Central", "pincode": "627002", "district": "Tirunelveli"},
                # Erode
                {"name": "ERD-BYP-01", "location": "Brough Road Sector", "pincode": "638001", "district": "Erode"},
                # Vellore
                {"name": "VLR-KTP-01", "location": "Katpadi Station Area", "pincode": "632007", "district": "Vellore"},
                # Thanjavur
                {"name": "TNJ-MED-01", "location": "Medical College Zone", "pincode": "613004", "district": "Thanjavur"},
                # Kanyakumari
                {"name": "KKR-NGR-01", "location": "Nagercoil Central", "pincode": "629001", "district": "Kanyakumari"},
            ]

            # --- Create FDH records ---
            fdh_objects = []
            for fdh in fdh_data:
                fdh_obj = models.FDH(
                    name=fdh["name"],
                    location=fdh["location"],
                    pincode=fdh["pincode"],
                    district=fdh["district"],
                    region="Tamil Nadu", # Constant region
                )
                fdh_objects.append(fdh_obj)

            db.add_all(fdh_objects)
            db.flush()  # Get FDH IDs before creating splitters

            # --- Create exactly 3 splitters per FDH (8-port each) ---
            splitters = []
            for fdh in fdh_objects:
                for i in range(1, 4):  # Create 3 splitters
                    splitter_name = f"SPL-{fdh.name}-{i:02d}"
                    splitters.append(
                        models.Splitter(
                            name=splitter_name,
                            fdh_id=fdh.id,
                            port_capacity=8,
                            # Copy location details from parent FDH
                            location=f"Area near {fdh.name}", # Example specific location
                            pincode=fdh.pincode,
                            district=fdh.district,
                            region=fdh.region,
                        )
                    )

            db.add_all(splitters)
            db.commit()
            logger.info(f"✅ Seeded {len(fdh_objects)} FDHs and {len(splitters)} 8-port splitters across Tamil Nadu.")
        except Exception as e:
            logger.error(f"❌ Error seeding hierarchy: {e}")
            db.rollback()
    else:
        logger.info("ℹ️ Hierarchy already exists, skipping seeding.")


# backend/app/seed.py
# ... (imports, logger, fake) ...

def seed_assets(db: Session):
     if db.query(models.Asset).count() == 0:
        logger.info("Seeding assets (ONT, Router, FDH, Splitter)...")
        try:
            assets = []
            # --- INCREASED COUNT ---
            # Seed 50 ONTs
            logger.info("Generating 50 ONT assets...")
            for i in range(1, 51): # <-- Changed range to 51
                assets.append(models.Asset(serial_number=f"ONT-SN-{fake.unique.ean(length=8)}", model="Nokia G-140W-C", asset_type="ONT", status="AVAILABLE", location="Central Warehouse"))
            # Seed 50 Routers
            logger.info("Generating 50 Router assets...")
            for i in range(1, 51): # <-- Changed range to 51
                assets.append(models.Asset(serial_number=f"RTR-SN-{fake.unique.ean(length=8)}", model="TP-Link Archer C6", asset_type="ROUTER", status="AVAILABLE", location="Central Warehouse"))
            # ---------------------

            # --- Seed FDH and Splitter Assets ---
            logger.info("Querying hierarchy to create FDH/Splitter asset entries...")
            fdhs_in_hierarchy = db.query(models.FDH).all()
            splitters_in_hierarchy = db.query(models.Splitter).all()
            logger.info(f"Found {len(fdhs_in_hierarchy)} FDHs and {len(splitters_in_hierarchy)} Splitters in hierarchy table.")

            for fdh in fdhs_in_hierarchy:
                assets.append(models.Asset(
                    serial_number=f"FDH-SN-{fdh.name}-{fake.unique.ean(length=8)}",
                    model="Standard FDH Cabinet", asset_type="FDH", status="AVAILABLE", location=fdh.location,
                ))

            for splitter in splitters_in_hierarchy:
                assets.append(models.Asset(
                    serial_number=f"SPL-SN-{splitter.name}-{fake.unique.ean(length=8)}",
                    model="1:8 Passive Optical Splitter", asset_type="SPLITTER", status="AVAILABLE", location=splitter.location,
                ))
            # ------------------------------------

            db.add_all(assets)
            db.commit()
            logger.info(f"✅ Seeded a total of {len(assets)} Assets (including FDHs & Splitters).")
        except Exception as e:
            logger.error(f"❌ Error seeding assets: {e}")
            db.rollback()
     else:
        logger.info("ℹ️ Assets already exist, skipping seeding.")

# ... (rest of seed.py: seed_users, seed_hierarchy, seed_all) ...
def seed_all(db: Session):
    logger.info("🚀 Starting database seeding process...")
    # --- CORRECTED ORDER ---
    seed_users(db)
    seed_hierarchy(db) # Seed hierarchy FIRST
    seed_assets(db)    # Seed assets AFTER hierarchy exists
    # --------------------------
    logger.info("🏁 Database seeding finished.")