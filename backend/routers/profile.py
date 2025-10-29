"""
Profile router for managing user profile data.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import UserResponse, UserUpdate
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/profile", response_model=UserResponse)
async def get_profile(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Get current user profile."""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    profile_update: UserUpdate,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Update user profile."""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields if provided
    update_data = profile_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    db.commit()
    db.refresh(user)
    
    logger.info(f"Updated profile for user {user_id}")
    
    return user
