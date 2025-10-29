# backend/app/seed.py
from sqlalchemy.orm import Session
from . import models, security # Assuming security is used for hashing passwords

def seed_users(db: Session):
    # Check if users already exist
    if db.query(models.User).count() == 0:
        print("Seeding users...")
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
        print("Users seeded.")
    else:
        print("Users already exist, skipping seeding.")

def seed_assets(db: Session):
     if db.query(models.Asset).count() == 0:
         print("Seeding assets...")
         assets = []
         # Seed some ONTs
         for i in range(1, 11):
             assets.append(models.Asset(serial_number=f"ONT-SN-{i:03d}", model="Nokia G-140W-C", asset_type="ONT", status="AVAILABLE", location="Central Warehouse"))
         # Seed some Routers
         for i in range(1, 11):
             assets.append(models.Asset(serial_number=f"RTR-SN-{i:03d}", model="TP-Link Archer C6", asset_type="ROUTER", status="AVAILABLE", location="Central Warehouse"))

         db.add_all(assets)
         db.commit()
         print("Assets seeded.")
     else:
         print("Assets already exist, skipping seeding.")

def seed_hierarchy(db: Session):
    if db.query(models.FDH).count() == 0:
        print("🌐 Seeding Tamil Nadu network hierarchy (FDHs + 8-port splitters)...")

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
                region="Tamil Nadu",
            )
            fdh_objects.append(fdh_obj)

        db.add_all(fdh_objects)
        db.flush()  # Get FDH IDs for splitters

        # --- Create exactly 3 splitters per FDH (8-port each) ---
        splitters = []
        for fdh in fdh_objects:
            for i in range(1, 4):  # 3 splitters per FDH
                splitter_name = f"SPL-{fdh.name}-{i:02d}"
                splitters.append(
                    models.Splitter(
                        name=splitter_name,
                        fdh_id=fdh.id,
                        port_capacity=8,
                    )
                )

        db.add_all(splitters)
        db.commit()

        print(f"✅ Seeded {len(fdh_objects)} FDHs and {len(splitters)} 8-port splitters across Tamil Nadu.")
    else:
        print("⚠️ Hierarchy already exists, skipping seeding.")


def seed_all(db: Session):
    print("Starting database seeding...")
    seed_users(db)
    seed_assets(db)
    seed_hierarchy(db)
    print("Database seeding finished.")

# You might call seed_all() from your main.py on startup if the DB is empty,
# or have a separate script/command to run it.