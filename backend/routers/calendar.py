"""
Calendar router for exporting workouts to iCal format.
"""

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from database import get_db
from models import User, Suggestion, UserPreferences
from schemas import UserPreferencesResponse, UserPreferencesUpdate
from services.calendar import generate_ics_file, generate_ics_for_suggestion

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/preferences", response_model=UserPreferencesResponse)
async def get_preferences(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Get user calendar preferences."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    preferences = db.query(UserPreferences).filter(
        UserPreferences.user_id == user_id
    ).first()

    if not preferences:
        # Create default preferences
        preferences = UserPreferences(
            user_id=user_id,
            preferred_days=["tuesday", "thursday", "saturday"],
            preferred_time="18:00",
            calendar_sync_enabled=False,
            reminder_minutes=[15, 60]
        )
        db.add(preferences)
        db.commit()
        db.refresh(preferences)

    return preferences


@router.patch("/preferences", response_model=UserPreferencesResponse)
async def update_preferences(
    preferences_update: UserPreferencesUpdate,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Update user calendar preferences."""
    preferences = db.query(UserPreferences).filter(
        UserPreferences.user_id == user_id
    ).first()

    if not preferences:
        # Create new preferences
        preferences = UserPreferences(user_id=user_id)
        db.add(preferences)

    # Update fields
    update_data = preferences_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preferences, field, value)

    preferences.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(preferences)

    logger.info(f"Updated preferences for user {user_id}")
    return preferences


@router.get("/calendar/export.ics")
async def export_calendar(
    days: int = 30,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Export upcoming workout suggestions as iCal file.

    Args:
        days: Number of days to include (default 30)
    """
    # Get user preferences
    preferences = db.query(UserPreferences).filter(
        UserPreferences.user_id == user_id
    ).first()

    if not preferences or not preferences.calendar_sync_enabled:
        # Use defaults if sync not enabled
        preferred_days = ["tuesday", "thursday", "saturday"]
        preferred_time = "18:00"
        reminder_minutes = [15, 60]
    else:
        preferred_days = preferences.preferred_days or []
        preferred_time = preferences.preferred_time or "18:00"
        reminder_minutes = preferences.reminder_minutes or []

    # Get recent uncompleted suggestions
    cutoff_date = datetime.now() - timedelta(days=7)  # Last 7 days
    suggestions = db.query(Suggestion).filter(
        Suggestion.user_id == user_id,
        Suggestion.completed == 0,
        Suggestion.created_at >= cutoff_date
    ).order_by(Suggestion.created_at.desc()).limit(20).all()

    if not suggestions:
        raise HTTPException(
            status_code=404,
            detail="No workout suggestions found. Generate some suggestions first."
        )

    # Convert to dicts for service
    suggestions_data = []
    for s in suggestions:
        suggestions_data.append({
            'id': s.id,
            'workout_type': s.workout_type,
            'distance': s.distance,
            'structure': s.structure,
            'reasoning': s.reasoning
        })

    # Generate iCal file
    try:
        ical_content = generate_ics_file(
            suggestions_data,
            preferred_days=preferred_days,
            preferred_time=preferred_time,
            reminder_minutes=reminder_minutes
        )

        logger.info(f"Generated iCal file with {len(suggestions)} suggestions for user {user_id}")

        return Response(
            content=ical_content,
            media_type="text/calendar",
            headers={
                "Content-Disposition": "attachment; filename=suivi_course_workouts.ics"
            }
        )
    except Exception as e:
        logger.error(f"Error generating iCal file: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating calendar: {str(e)}")


@router.get("/calendar/suggestion/{suggestion_id}.ics")
async def export_single_suggestion(
    suggestion_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Export a single suggestion as iCal file."""
    # Get suggestion
    suggestion = db.query(Suggestion).filter(
        Suggestion.id == suggestion_id,
        Suggestion.user_id == user_id
    ).first()

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    # Get user preferences for time
    preferences = db.query(UserPreferences).filter(
        UserPreferences.user_id == user_id
    ).first()

    preferred_time = "18:00"
    reminder_minutes = [15, 60]
    if preferences:
        preferred_time = preferences.preferred_time or "18:00"
        reminder_minutes = preferences.reminder_minutes or []

    # Parse time
    try:
        hour, minute = map(int, preferred_time.split(":"))
    except (ValueError, AttributeError):
        hour, minute = 18, 0

    # Set for tomorrow at preferred time
    preferred_date = datetime.now().replace(
        hour=hour,
        minute=minute,
        second=0,
        microsecond=0
    ) + timedelta(days=1)

    # Convert to dict
    suggestion_data = {
        'id': suggestion.id,
        'workout_type': suggestion.workout_type,
        'distance': suggestion.distance,
        'structure': suggestion.structure,
        'reasoning': suggestion.reasoning
    }

    try:
        ical_content = generate_ics_for_suggestion(
            suggestion_data,
            preferred_date=preferred_date,
            reminder_minutes=reminder_minutes
        )

        logger.info(f"Generated iCal file for suggestion {suggestion_id}")

        return Response(
            content=ical_content,
            media_type="text/calendar",
            headers={
                "Content-Disposition": f"attachment; filename=workout_{suggestion_id}.ics"
            }
        )
    except Exception as e:
        logger.error(f"Error generating iCal file for suggestion {suggestion_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating calendar: {str(e)}")


@router.get("/calendar/webcal")
async def webcal_subscription(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Get webcal subscription URL for automatic calendar updates.
    This returns the same content as export.ics but with webcal:// protocol support.
    """
    # For now, just redirect to the export endpoint
    # In production, this should be a stable URL that calendar apps can subscribe to
    return {
        "webcal_url": f"webcal://localhost:8000/api/calendar/export.ics?user_id={user_id}",
        "http_url": f"http://localhost:8000/api/calendar/export.ics?user_id={user_id}",
        "instructions": {
            "apple_calendar": "Copy the webcal URL and go to File > New Calendar Subscription in Apple Calendar",
            "google_calendar": "Copy the http URL and add it via 'Add calendar' > 'From URL' in Google Calendar settings"
        }
    }
