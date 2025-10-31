"""
Automatic personal record detection from workout data.
Identifies best times across standard distances with intelligent tolerance matching.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from models import Workout, PersonalRecord

logger = logging.getLogger(__name__)


# Distance definitions with tolerance ranges
DISTANCE_DEFINITIONS = [
    # (distance_key, target_km, min_km, max_km, label)
    ("400m", 0.4, 0.35, 0.45, "400 m"),
    ("800m", 0.8, 0.75, 0.85, "800 m"),
    ("1km", 1.0, 0.9, 1.1, "1 km"),
    ("1_mile", 1.609, 1.5, 1.7, "1 mile (1.6 km)"),
    ("2km", 2.0, 1.8, 2.2, "2 km"),
    ("3km", 3.0, 2.8, 3.2, "3 km"),
    ("5km", 5.0, 4.8, 5.3, "5 km"),
    ("10km", 10.0, 9.6, 10.5, "10 km"),
    ("semi", 21.1, 20.5, 21.8, "Semi-marathon (21.1 km)"),
    ("marathon", 42.2, 41.5, 43.0, "Marathon (42.2 km)"),
]


def detect_records_from_workouts(db: Session, user_id: int = 1) -> Dict[str, Dict]:
    """
    Scan all workouts and detect personal records for standard distances.

    Args:
        db: Database session
        user_id: User ID to scan workouts for

    Returns:
        Dictionary mapping distance keys to record data:
        {
            "5km": {
                "time_seconds": 1470,
                "date": "2024-10-15",
                "workout_id": 123,
                "distance_actual": 5.02
            },
            ...
        }
    """
    # Get all workouts with distance and duration data
    workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.distance.isnot(None),
        Workout.duration.isnot(None),
        Workout.distance > 0,
        Workout.duration > 0
    ).order_by(Workout.date.desc()).all()

    logger.info(f"Scanning {len(workouts)} workouts for records...")

    records_found = {}

    for distance_key, target_km, min_km, max_km, label in DISTANCE_DEFINITIONS:
        best_time = None
        best_workout = None

        for workout in workouts:
            # Check if workout distance matches this category
            if min_km <= workout.distance <= max_km:
                # Calculate time for this distance
                # If workout is slightly longer/shorter, normalize to target distance
                time_seconds = workout.duration

                # Optional: normalize time to exact target distance
                # This accounts for 5.02km being slightly slower than exact 5.00km
                if abs(workout.distance - target_km) > 0.01:
                    # Normalize: pace * target_distance
                    pace_per_km = workout.duration / workout.distance
                    time_seconds = int(pace_per_km * target_km)

                # Check if this is a new record
                if best_time is None or time_seconds < best_time:
                    best_time = time_seconds
                    best_workout = workout

        if best_workout:
            records_found[distance_key] = {
                "time_seconds": best_time,
                "date": best_workout.date.isoformat(),
                "workout_id": best_workout.id,
                "distance_actual": best_workout.distance,
                "label": label
            }
            logger.info(f"Found record for {label}: {best_time}s on {best_workout.date}")

    return records_found


def sync_records_to_database(db: Session, detected_records: Dict[str, Dict], user_id: int = 1) -> int:
    """
    Sync detected records to the PersonalRecord table.
    Creates new records or updates existing ones if better times are found.

    Args:
        db: Database session
        detected_records: Output from detect_records_from_workouts()
        user_id: User ID

    Returns:
        Number of records created/updated
    """
    updated_count = 0

    for distance_key, record_data in detected_records.items():
        time_seconds = record_data["time_seconds"]
        date_achieved = datetime.fromisoformat(record_data["date"])

        # Check existing record
        existing = db.query(PersonalRecord).filter(
            PersonalRecord.user_id == user_id,
            PersonalRecord.distance == distance_key,
            PersonalRecord.is_current == 1
        ).first()

        # If no record or new record is better
        if existing is None:
            # Create new record
            new_record = PersonalRecord(
                user_id=user_id,
                distance=distance_key,
                time_seconds=time_seconds,
                date_achieved=date_achieved,
                is_current=1,
                notes=f"Auto-détecté depuis workout #{record_data['workout_id']}"
            )
            db.add(new_record)
            updated_count += 1
            logger.info(f"Created new record for {distance_key}: {time_seconds}s")

        elif time_seconds < existing.time_seconds:
            # Supersede old record
            existing.is_current = 0
            existing.superseded_at = datetime.utcnow()

            # Create new better record
            new_record = PersonalRecord(
                user_id=user_id,
                distance=distance_key,
                time_seconds=time_seconds,
                date_achieved=date_achieved,
                is_current=1,
                notes=f"Auto-détecté depuis workout #{record_data['workout_id']}"
            )
            db.add(new_record)
            updated_count += 1
            logger.info(f"Updated record for {distance_key}: {existing.time_seconds}s → {time_seconds}s")

    db.commit()
    return updated_count
