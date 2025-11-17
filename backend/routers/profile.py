"""
Profile router for managing user profile data.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any
import base64

from database import get_db
from models import User, Workout
from schemas import UserResponse, UserUpdate
from services.readiness_service import calculate_readiness_score
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


@router.get("/profile/insights")
async def get_profile_insights(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
) -> Dict[str, Any]:
    """
    Get profile insights: phase, average volume, training load, injury status.
    """
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Calculate date ranges
    now = datetime.now()
    four_weeks_ago = now - timedelta(days=28)
    seven_days_ago = now - timedelta(days=7)

    # Get workouts for calculations
    recent_workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= four_weeks_ago
    ).all()

    # Calculate average weekly volume (last 4 weeks)
    total_distance = sum(w.distance or 0 for w in recent_workouts)
    avg_weekly_volume = round(total_distance / 4, 1) if recent_workouts else 0

    # Calculate training load (7d / 28d ratio)
    last_7_days = [w for w in recent_workouts if w.date >= seven_days_ago]
    acute_load = sum(w.distance or 0 for w in last_7_days)
    chronic_load = total_distance / 4 if total_distance > 0 else 0
    training_load = round(acute_load / chronic_load, 2) if chronic_load > 0 else None

    # Determine phase based on training load and objective proximity
    phase = "Développement"
    if user.objectives and len(user.objectives) > 0:
        primary_obj = next((obj for obj in user.objectives if obj.get('priority') == 'primary'), user.objectives[0])
        if primary_obj and primary_obj.get('date'):
            try:
                objective_date = datetime.fromisoformat(primary_obj['date'].replace('Z', '+00:00'))
                days_until = (objective_date - now).days

                if days_until < 14:
                    phase = "Affûtage"
                elif days_until < 60:
                    phase = "Compétition"
                elif training_load and training_load < 0.8:
                    phase = "Récupération"
            except Exception as e:
                logger.warning(f"Error parsing objective date: {e}")

    # Get latest injury status
    injury_status = None
    if user.injury_history and len(user.injury_history) > 0:
        latest_injury = user.injury_history[-1]
        status_map = {
            'gueri': 'Guéri',
            'en_cours': 'En cours',
            'attention': 'Attention'
        }
        injury_status = f"{latest_injury.get('type', 'Blessure')} ({status_map.get(latest_injury.get('status', 'gueri'), 'Guéri')})"

    return {
        "phase": phase,
        "avg_weekly_volume_km": avg_weekly_volume,
        "training_load": training_load,
        "injury_status": injury_status,
        "workouts_count_4w": len(recent_workouts)
    }


@router.get("/profile/readiness")
async def get_readiness_score(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
) -> Dict[str, Any]:
    """
    Get daily readiness score (100% algorithmic).

    Returns a score from 0-100 based on:
    - Training load ratio (7d/28d volume)
    - Recovery since last hard session
    - Pace progression
    """
    result = calculate_readiness_score(db, user_id)

    if not result:
        raise HTTPException(status_code=404, detail="User not found")

    return result


@router.post("/profile/picture", response_model=UserResponse)
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Upload profile picture (converts to base64 and stores in DB)."""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Read file and convert to base64
    contents = await file.read()
    base64_image = base64.b64encode(contents).decode('utf-8')

    # Store with data URI prefix for easy display in frontend
    data_uri = f"data:{file.content_type};base64,{base64_image}"

    user.profile_picture = data_uri
    db.commit()
    db.refresh(user)

    logger.info(f"Updated profile picture for user {user_id}")

    return user
