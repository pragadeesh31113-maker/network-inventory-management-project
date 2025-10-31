# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

# --- Import SessionLocal for manual session creation ---
from .database import Base, engine, SessionLocal
from . import models # Import models to ensure tables are known to Base

# --- Import Routers ---
# Ensure all routers you intend to use are imported
from .routers import auth, assets, hierarchy, onboarding, tasks, customers, lifecycle, dashboard, overview, topology

# --- Create Database Tables ---
try:
    models.Base.metadata.create_all(bind=engine)
    print("Database tables created/verified.")
except Exception as e:
    print(f"Error creating database tables: {e}")


# --- FastAPI App Instance ---
app = FastAPI(title="Network Inventory Management API")

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # The origin of your React app
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, etc.)
    allow_headers=["*"], # Allow all headers
)

# --- Database Seeding on Startup ---
@app.on_event("startup")
def on_startup():
    print("Application startup: attempting to seed database...")
    db: Session = SessionLocal()
    try:
        from .seed import seed_all # Import the seeding function
        seed_all(db) # <-- Pass the db session here
        print("Seeding function executed.")
    except ImportError:
        print("Seeding function 'seed_all' not found or error during import.")
    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback() # Rollback in case of error during seeding
    finally:
        db.close() # <-- Always close the manually created session
        print("Database session closed after seeding attempt.")


# --- API Routers ---
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(assets.router, prefix="/api/assets", tags=["Asset Management"])
app.include_router(hierarchy.router, prefix="/api/hierarchy", tags=["Network Hierarchy"])
app.include_router(onboarding.router, prefix="/api/onboard", tags=["Customer Onboarding"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Deployment Tasks"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customer Management"])
app.include_router(lifecycle.router, prefix="/api/lifecycle", tags=["Customer Lifecycle"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Admin Dashboard"])
app.include_router(overview.router, prefix="/api/overview", tags=["Network Overview"])

# --- THIS IS THE CRITICAL FIX for the 404 error ---
app.include_router(topology.router, prefix="/api/topology", tags=["Network Topology"])


# --- Root Endpoint ---
@app.get("/api")
def read_root():
    return {"message": "Welcome to the Network Inventory API"}