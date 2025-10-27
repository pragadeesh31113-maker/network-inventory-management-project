# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import create_db_and_tables

# --- THIS IS THE FIXED IMPORT LINE ---
# We only import the routers that actually exist
from .routers import auth, assets, hierarchy, onboarding,tasks, customers, lifecycle, dashboard
# ------------------------------------

app = FastAPI(title="Network Inventory Management API")

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # The origin of your React app
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, etc.)
    allow_headers=["*"], # Allow all headers
)

# --- Database Initialization ---
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    # We will add seeding here
    from .seed import seed_db
    seed_db()

# --- THIS IS THE FIXED ROUTER SECTION ---
# --- API Routers ---
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(assets.router, prefix="/api/assets", tags=["Asset Inventory"])
app.include_router(hierarchy.router, prefix="/api/hierarchy", tags=["Network Hierarchy"])
app.include_router(onboarding.router, prefix="/api/onboard", tags=["Customer Onboarding"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["Deployment Tasks"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customer Management"])
app.include_router(lifecycle.router, prefix="/api/lifecycle", tags=["Asset Lifecycle"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
# ---------------------------
# ---------------------------------------

@app.get("/api")
def read_root():
    return {"message": "Welcome to the Network Inventory API"}