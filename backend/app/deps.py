# backend/app/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session
from . import models, schemas, security
from .database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, security.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except (JWTError, ValidationError):
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

# --- Role-Based Dependencies ---

def get_current_active_user(
    current_user: models.User = Depends(get_current_user)
) -> models.User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def is_admin(
    current_user: models.User = Depends(get_current_active_user)
) -> models.User:
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="The user doesn't have enough privileges")
    return current_user

def is_planner(
    current_user: models.User = Depends(get_current_active_user)
) -> models.User:
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.PLANNER]:
        raise HTTPException(status_code=403, detail="Requires Planner or Admin privileges")
    return current_user

# --- NEWLY ADDED ---

def is_technician(
    current_user: models.User = Depends(get_current_active_user)
) -> models.User:
    # A Planner can also see technician tasks, but a tech can't see planner boards
    if current_user.role not in [
        models.UserRole.ADMIN, 
        models.UserRole.PLANNER, 
        models.UserRole.TECHNICIAN
    ]:
        raise HTTPException(status_code=403, detail="Requires Technician, Planner, or Admin privileges")
    return current_user

def is_support(
    current_user: models.User = Depends(get_current_active_user)
) -> models.User:
    # Only Admin and Support can access support-level routes (like deactivation)
    if current_user.role not in [models.UserRole.ADMIN, models.UserRole.SUPPORT]:
        raise HTTPException(status_code=403, detail="Requires Support or Admin privileges")
    return current_user

def is_customer(
    current_user: models.User = Depends(get_current_active_user)
) -> models.User:
    # CRITICAL: Only a customer can see their own portal
    # An Admin should NOT be able to log in to the customer portal
    if current_user.role != models.UserRole.CUSTOMER:
        raise HTTPException(status_code=403, detail="Requires a Customer account")
    return current_user