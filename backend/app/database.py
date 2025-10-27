# backend/app/database.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

DATABASE_URL = "sqlite:///./test.db"  # Using SQLite
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base() # This is our declarative base

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# This is the function main.py is looking for!
def create_db_and_tables():
    # Import all models here so that Base knows about them before creating tables
    # This is a crucial step!
    from . import models
    Base.metadata.create_all(bind=engine)