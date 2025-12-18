# backend/app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, models, deps, security
from ..database import get_db

router = APIRouter()

@router.get("/", response_model=List[schemas.User])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_admin),
):
    """
    Retrieve all users. Admin only.
    """
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users

@router.post("/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: schemas.UserCreateAdmin,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_admin),
):
    """
    Create a new user. Admin only.
    """
    # Check for existing user
    db_user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    hashed_password = security.get_password_hash(user_in.password)
    db_user = models.User(
        username=user_in.username,
        email=user_in.email,
        full_name=user_in.full_name,
        role=user_in.role,
        is_active=user_in.is_active,
        hashed_password=hashed_password,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    user_in: schemas.UserUpdateAdmin,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_admin),
):
    """
    Update a user's details. Admin only.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_in.dict(exclude_unset=True)
    
    # Check for email conflict if email is being changed
    if "email" in update_data and update_data["email"] != db_user.email:
        existing_user = db.query(models.User).filter(models.User.email == update_data["email"]).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

    for key, value in update_data.items():
        setattr(db_user, key, value)

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.is_admin),
):
    """
    Delete a user. Admin only.
    """
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if db_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account")

    db.delete(db_user)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)