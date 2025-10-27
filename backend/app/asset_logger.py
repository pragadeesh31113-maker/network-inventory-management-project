# backend/app/asset_logger.py
from sqlalchemy.orm import Session
from typing import Optional
from . import models

def log_asset_change(
    db: Session, 
    asset_id: int, 
    action: str, 
    details: str, 
    user_id: Optional[int] = None
):
    """
    Creates a new asset history log entry.
    """
    db_history = models.AssetHistory(
        asset_id=asset_id,
        action=action,
        details=details,
        changed_by_user_id=user_id
    )
    db.add(db_history)
    # We will let the calling function handle the db.commit()