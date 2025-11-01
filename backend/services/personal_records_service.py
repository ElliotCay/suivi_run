"""
Service for managing personal records from workout best efforts.
Automatically updates PRs when new workouts with better times are imported.
"""

from datetime import datetime
from typing import Dict, Optional
import logging

from sqlalchemy.orm import Session
from models import PersonalRecord

logger = logging.getLogger(__name__)


def update_personal_records_from_workout(
    db: Session,
    user_id: int,
    workout_date: datetime,
    best_efforts: Dict[str, Dict]
) -> Dict[str, bool]:
    """
    Update personal records based on workout best efforts from GPX data.

    This function is called after importing a workout with GPX data containing
    best efforts calculated by the Strava-like sliding window algorithm.

    Args:
        db: Database session
        user_id: User ID
        workout_date: Date when the workout was performed
        best_efforts: Dict mapping distance labels to effort data with keys:
            - time_seconds: Time in seconds for the distance
            - pace_seconds_per_km: Pace in seconds per km
            - distance_m: Distance in meters
            - label: Distance label (e.g., "1km", "5km")

    Returns:
        Dict mapping distance labels to boolean indicating if a new PR was set

    Example:
        best_efforts = {
            "1km": {
                "time_seconds": 240.5,
                "pace_seconds_per_km": 240.5,
                "distance_m": 1000,
                "label": "1km"
            },
            "5km": {
                "time_seconds": 1320.0,
                "pace_seconds_per_km": 264.0,
                "distance_m": 5000,
                "label": "5km"
            }
        }

        results = update_personal_records_from_workout(db, 1, datetime.now(), best_efforts)
        # Returns: {"1km": True, "5km": False}  # 1km was a new PR, 5km was not
    """
    if not best_efforts:
        logger.debug("No best efforts to process")
        return {}

    results = {}

    for distance_label, effort_data in best_efforts.items():
        time_seconds = effort_data.get('time_seconds')

        if not time_seconds or time_seconds <= 0:
            logger.warning(f"Invalid time for {distance_label}: {time_seconds}")
            continue

        # Convert to integer seconds for consistency with PersonalRecord model
        time_seconds_int = int(round(time_seconds))

        # Check if there's an existing current record for this distance
        existing_record = db.query(PersonalRecord).filter(
            PersonalRecord.user_id == user_id,
            PersonalRecord.distance == distance_label,
            PersonalRecord.is_current == 1
        ).first()

        # If no existing record or new time is better (lower), create new PR
        if not existing_record or time_seconds_int < existing_record.time_seconds:
            # Mark old record as superseded if it exists
            if existing_record:
                existing_record.is_current = 0
                existing_record.superseded_at = datetime.utcnow()
                logger.info(
                    f"New PR for {distance_label}: {format_time(existing_record.time_seconds)} "
                    f"-> {format_time(time_seconds_int)} "
                    f"(improvement: {existing_record.time_seconds - time_seconds_int}s)"
                )
            else:
                logger.info(f"First PR for {distance_label}: {format_time(time_seconds_int)}")

            # Create new current record
            new_record = PersonalRecord(
                user_id=user_id,
                distance=distance_label,
                time_seconds=time_seconds_int,
                date_achieved=workout_date,
                is_current=1,
                notes=f"Auto-detected from workout (Strava best effort)"
            )

            db.add(new_record)
            results[distance_label] = True
        else:
            # Not a new record
            results[distance_label] = False
            logger.debug(
                f"No PR for {distance_label}: {format_time(time_seconds_int)} "
                f"vs current {format_time(existing_record.time_seconds)}"
            )

    # Commit all changes at once
    if any(results.values()):
        db.commit()
        logger.info(f"Updated {sum(results.values())} personal records from workout")

    return results


def format_time(seconds: int) -> str:
    """
    Format seconds to MM:SS display format.

    Args:
        seconds: Time in seconds

    Returns:
        Formatted string in MM:SS format
    """
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}:{secs:02d}"


def get_current_personal_records(db: Session, user_id: int) -> Dict[str, Dict]:
    """
    Get all current personal records for a user.

    Args:
        db: Database session
        user_id: User ID

    Returns:
        Dict mapping distance labels to record data
    """
    records = db.query(PersonalRecord).filter(
        PersonalRecord.user_id == user_id,
        PersonalRecord.is_current == 1
    ).all()

    result = {}
    for record in records:
        result[record.distance] = {
            'time_seconds': record.time_seconds,
            'time_display': format_time(record.time_seconds),
            'date_achieved': record.date_achieved,
            'notes': record.notes
        }

    return result


def get_personal_record_history(
    db: Session,
    user_id: int,
    distance: str
) -> list[Dict]:
    """
    Get the full history of personal records for a specific distance.

    Args:
        db: Database session
        user_id: User ID
        distance: Distance label (e.g., "1km", "5km")

    Returns:
        List of records ordered by date (most recent first)
    """
    records = db.query(PersonalRecord).filter(
        PersonalRecord.user_id == user_id,
        PersonalRecord.distance == distance
    ).order_by(PersonalRecord.date_achieved.desc()).all()

    result = []
    for record in records:
        result.append({
            'id': record.id,
            'time_seconds': record.time_seconds,
            'time_display': format_time(record.time_seconds),
            'date_achieved': record.date_achieved,
            'is_current': bool(record.is_current),
            'notes': record.notes,
            'created_at': record.created_at,
            'superseded_at': record.superseded_at
        })

    return result
