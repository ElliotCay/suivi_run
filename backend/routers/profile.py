"""
Profile router for managing user profile data.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any
import base64

from database import get_db
from models import User, Workout, TrainingZone
from schemas import UserResponse, UserUpdate
from services.readiness_service import calculate_readiness_score
from services.vdot_calibration import get_calibrated_vdot, update_user_training_zones
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


@router.post("/profile/recalculate-zones")
async def recalculate_training_zones(
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Recalculate user's training zones using calibrated VDOT.

    Uses weighted average of PRs + recent workout performances to determine
    realistic training paces.

    Returns:
        Updated training zones with calibration metadata
    """
    try:
        # Get calibrated VDOT with metadata
        calibrated_vdot, metadata = get_calibrated_vdot(user_id, db)

        # Update training zones
        zone = update_user_training_zones(user_id, db, force_recalculate=True)

        logger.info(f"Recalculated training zones for user {user_id}: VDOT {calibrated_vdot}")

        return {
            "success": True,
            "vdot": calibrated_vdot,
            "zones": {
                "easy": {
                    "min": f"{zone.easy_min_pace_sec//60}:{zone.easy_min_pace_sec%60:02d}",
                    "max": f"{zone.easy_max_pace_sec//60}:{zone.easy_max_pace_sec%60:02d}"
                },
                "marathon": f"{zone.marathon_pace_sec//60}:{zone.marathon_pace_sec%60:02d}",
                "threshold": {
                    "min": f"{zone.threshold_min_pace_sec//60}:{zone.threshold_min_pace_sec%60:02d}",
                    "max": f"{zone.threshold_max_pace_sec//60}:{zone.threshold_max_pace_sec%60:02d}"
                },
                "interval": {
                    "min": f"{zone.interval_min_pace_sec//60}:{zone.interval_min_pace_sec%60:02d}",
                    "max": f"{zone.interval_max_pace_sec//60}:{zone.interval_max_pace_sec%60:02d}"
                },
                "repetition": {
                    "min": f"{zone.repetition_min_pace_sec//60}:{zone.repetition_min_pace_sec%60:02d}",
                    "max": f"{zone.repetition_max_pace_sec//60}:{zone.repetition_max_pace_sec%60:02d}"
                }
            },
            "calibration_metadata": metadata
        }

    except ValueError as e:
        logger.error(f"Error recalculating zones for user {user_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error recalculating zones: {e}")
        raise HTTPException(status_code=500, detail="Failed to recalculate training zones")


@router.get("/profile/training-zones")
async def get_training_zones(
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Get current training zones for the user.

    Returns zones in both seconds/km and MM:SS format.
    """
    zone = db.query(TrainingZone).filter(TrainingZone.user_id == user_id).first()

    if not zone:
        raise HTTPException(status_code=404, detail="Training zones not found. Please add PRs and recalculate.")

    return {
        "vdot": zone.vdot,
        "zones": {
            "easy": {
                "min_sec": zone.easy_min_pace_sec,
                "max_sec": zone.easy_max_pace_sec,
                "min": f"{zone.easy_min_pace_sec//60}:{zone.easy_min_pace_sec%60:02d}",
                "max": f"{zone.easy_max_pace_sec//60}:{zone.easy_max_pace_sec%60:02d}"
            },
            "marathon": {
                "sec": zone.marathon_pace_sec,
                "pace": f"{zone.marathon_pace_sec//60}:{zone.marathon_pace_sec%60:02d}"
            },
            "threshold": {
                "min_sec": zone.threshold_min_pace_sec,
                "max_sec": zone.threshold_max_pace_sec,
                "min": f"{zone.threshold_min_pace_sec//60}:{zone.threshold_min_pace_sec%60:02d}",
                "max": f"{zone.threshold_max_pace_sec//60}:{zone.threshold_max_pace_sec%60:02d}"
            },
            "interval": {
                "min_sec": zone.interval_min_pace_sec,
                "max_sec": zone.interval_max_pace_sec,
                "min": f"{zone.interval_min_pace_sec//60}:{zone.interval_min_pace_sec%60:02d}",
                "max": f"{zone.interval_max_pace_sec//60}:{zone.interval_max_pace_sec%60:02d}"
            },
            "repetition": {
                "min_sec": zone.repetition_min_pace_sec,
                "max_sec": zone.repetition_max_pace_sec,
                "min": f"{zone.repetition_min_pace_sec//60}:{zone.repetition_min_pace_sec%60:02d}",
                "max": f"{zone.repetition_max_pace_sec//60}:{zone.repetition_max_pace_sec%60:02d}"
            }
        }
    }
