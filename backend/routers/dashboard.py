"""
Dashboard router for analytics and summary data.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from sqlalchemy import func, and_
from typing import Dict, Any, List, Optional
import logging

from database import get_db
from models import Workout

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/dashboard/summary")
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Get current week summary."""
    today = date.today()
    week_start = today - timedelta(days=today.weekday())

    # Workouts this week
    this_week_workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= week_start
    ).all()

    # Calculate stats
    total_km = sum(w.distance for w in this_week_workouts if w.distance)
    count = len(this_week_workouts)
    avg_hr = sum(w.avg_hr for w in this_week_workouts if w.avg_hr) / count if count > 0 else None

    # Total all-time stats
    all_workouts = db.query(Workout).filter(Workout.user_id == user_id).all()
    total_all_time_km = sum(w.distance for w in all_workouts if w.distance)
    total_all_time_count = len(all_workouts)

    return {
        "week_volume_km": round(total_km, 2),
        "workout_count": count,
        "avg_heart_rate": round(avg_hr, 0) if avg_hr else None,
        "week_start": week_start.isoformat(),
        "total_all_time_km": round(total_all_time_km, 2),
        "total_workouts": total_all_time_count
    }


@router.get("/dashboard/volume-history")
async def get_volume_history(
    weeks: int = 8,
    db: Session = Depends(get_db),
    user_id: int = 1,
):
    """Get weekly volume history for charts."""
    from datetime import timedelta

    today = date.today()
    start_date = today - timedelta(weeks=weeks * 7)

    workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= start_date
    ).all()

    # Group by ISO week
    weekly_data = {}
    for workout in workouts:
        year, week, _ = workout.date.isocalendar()
        week_key = f"{year}-W{week:02d}"

        if week_key not in weekly_data:
            weekly_data[week_key] = {
                "week": week_key,
                "total_distance": 0,
                "workout_count": 0
            }

        weekly_data[week_key]["total_distance"] += workout.distance or 0
        weekly_data[week_key]["workout_count"] += 1

    # Sort and format
    result = sorted(weekly_data.values(), key=lambda x: x["week"])

    # Round distances
    for week in result:
        week["total_distance"] = round(week["total_distance"], 2)

    return result


@router.get("/dashboard/workout-types")
async def get_workout_types_distribution(
    db: Session = Depends(get_db),
    user_id: int = 1,
):
    """Get distribution of workout types."""
    workouts = db.query(Workout).filter(Workout.user_id == user_id).all()

    type_counts = {}
    for w in workouts:
        wtype = w.workout_type or "non_defini"
        type_counts[wtype] = type_counts.get(wtype, 0) + 1

    return [
        {"type": k, "count": v}
        for k, v in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)
    ]


@router.get("/dashboard/personal-records")
async def get_personal_records(
    db: Session = Depends(get_db),
    user_id: int = 1,
):
    """
    Get personal records (best pace) for standard distances.

    Distances: 500m, 1km, 2km, 5km, 10km, 15km, semi (21.1km), marathon (42.2km)
    """
    # Define distance ranges (in km) with tolerance
    distance_targets = [
        {"name": "500m", "target": 0.5, "min": 0.4, "max": 0.6},
        {"name": "1km", "target": 1.0, "min": 0.9, "max": 1.1},
        {"name": "2km", "target": 2.0, "min": 1.8, "max": 2.2},
        {"name": "5km", "target": 5.0, "min": 4.5, "max": 5.5},
        {"name": "10km", "target": 10.0, "min": 9.5, "max": 10.5},
        {"name": "15km", "target": 15.0, "min": 14.5, "max": 15.5},
        {"name": "semi", "target": 21.1, "min": 20.5, "max": 21.7},
        {"name": "marathon", "target": 42.2, "min": 41.5, "max": 43.0},
    ]

    records = []

    for distance_config in distance_targets:
        # Query workouts within distance range that have pace data
        workouts_in_range = db.query(Workout).filter(
            and_(
                Workout.user_id == user_id,
                Workout.distance >= distance_config["min"],
                Workout.distance <= distance_config["max"],
                Workout.avg_pace.isnot(None),
                Workout.avg_pace > 0
            )
        ).all()

        if workouts_in_range:
            # Find workout with best (minimum) pace
            best_workout = min(workouts_in_range, key=lambda w: w.avg_pace)

            # Convert pace to minutes:seconds format
            pace_seconds = best_workout.avg_pace
            pace_minutes = int(pace_seconds // 60)
            pace_secs = int(pace_seconds % 60)

            records.append({
                "distance": distance_config["name"],
                "target_km": distance_config["target"],
                "best_pace_seconds_per_km": pace_seconds,
                "best_pace_display": f"{pace_minutes}:{pace_secs:02d}",
                "date": best_workout.date.isoformat(),
                "actual_distance": round(best_workout.distance, 2),
                "workout_type": best_workout.workout_type
            })
        else:
            # No record for this distance yet
            records.append({
                "distance": distance_config["name"],
                "target_km": distance_config["target"],
                "best_pace_seconds_per_km": None,
                "best_pace_display": None,
                "date": None,
                "actual_distance": None,
                "workout_type": None
            })

    return records


@router.get("/dashboard/pace-by-type")
async def get_pace_by_workout_type(
    db: Session = Depends(get_db),
    user_id: int = 1,
):
    """
    Get average pace for each workout type.

    Returns pace statistics grouped by workout type.
    """
    workouts = db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            Workout.avg_pace.isnot(None),
            Workout.avg_pace > 0,
            Workout.workout_type.isnot(None)
        )
    ).all()

    # Group by workout type
    type_stats: Dict[str, List[float]] = {}
    for workout in workouts:
        wtype = workout.workout_type
        if wtype not in type_stats:
            type_stats[wtype] = []
        type_stats[wtype].append(workout.avg_pace)

    # Calculate statistics for each type
    result = []
    for wtype, paces in type_stats.items():
        avg_pace = sum(paces) / len(paces)
        min_pace = min(paces)
        max_pace = max(paces)
        count = len(paces)

        # Format pace display
        avg_minutes = int(avg_pace // 60)
        avg_seconds = int(avg_pace % 60)

        result.append({
            "workout_type": wtype,
            "avg_pace_seconds_per_km": round(avg_pace, 2),
            "avg_pace_display": f"{avg_minutes}:{avg_seconds:02d}",
            "min_pace_seconds_per_km": round(min_pace, 2),
            "max_pace_seconds_per_km": round(max_pace, 2),
            "workout_count": count
        })

    # Sort by workout type (facile, tempo, fractionne, longue)
    type_order = {"facile": 1, "tempo": 2, "fractionne": 3, "longue": 4}
    result.sort(key=lambda x: type_order.get(x["workout_type"], 999))

    return result


@router.get("/dashboard/pace-progression-by-type")
async def get_pace_progression_by_type(
    db: Session = Depends(get_db),
    user_id: int = 1,
    weeks: int = 8,
):
    """
    Get pace progression over time for each workout type.

    Returns weekly pace averages for each workout type.
    """
    from datetime import timedelta

    today = date.today()
    start_date = today - timedelta(weeks=weeks * 7)

    workouts = db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= start_date,
            Workout.avg_pace.isnot(None),
            Workout.avg_pace > 0,
            Workout.workout_type.isnot(None)
        )
    ).all()

    # Group by workout type and ISO week
    type_week_data: Dict[str, Dict[str, List[float]]] = {}

    for workout in workouts:
        wtype = workout.workout_type
        year, week, _ = workout.date.isocalendar()
        week_key = f"{year}-W{week:02d}"

        if wtype not in type_week_data:
            type_week_data[wtype] = {}
        if week_key not in type_week_data[wtype]:
            type_week_data[wtype][week_key] = []

        type_week_data[wtype][week_key].append(workout.avg_pace)

    # Calculate weekly averages for each type
    result = []
    for wtype, weekly_paces in type_week_data.items():
        progression = []
        for week_key, paces in sorted(weekly_paces.items()):
            avg_pace = sum(paces) / len(paces)
            progression.append({
                "week": week_key,
                "avg_pace_seconds_per_km": round(avg_pace, 2),
                "workout_count": len(paces)
            })

        result.append({
            "workout_type": wtype,
            "progression": progression
        })

    # Sort by workout type
    type_order = {"facile": 1, "tempo": 2, "fractionne": 3, "longue": 4}
    result.sort(key=lambda x: type_order.get(x["workout_type"], 999))

    return result


@router.get("/dashboard/training-load")
async def get_training_load(
    db: Session = Depends(get_db),
    user_id: int = 1,
):
    """
    Calculate training load using acute (7-day) and chronic (28-day) workload ratio.

    Returns:
    - acute_load: Total distance in last 7 days
    - chronic_load: Average weekly distance over last 28 days
    - ratio: Acute/Chronic ratio (optimal: 0.8-1.3)
    - status: "optimal", "low", "high_risk"
    """
    today = date.today()
    seven_days_ago = today - timedelta(days=7)
    twenty_eight_days_ago = today - timedelta(days=28)

    # Last 7 days (acute load)
    acute_workouts = db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= seven_days_ago,
            Workout.distance.isnot(None)
        )
    ).all()
    acute_load = sum(w.distance for w in acute_workouts)

    # Last 28 days (chronic load)
    chronic_workouts = db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= twenty_eight_days_ago,
            Workout.distance.isnot(None)
        )
    ).all()
    chronic_total = sum(w.distance for w in chronic_workouts)
    chronic_load = chronic_total / 4  # Average per week over 4 weeks

    # Calculate ratio
    ratio = None
    status = "unknown"
    if chronic_load > 0:
        ratio = acute_load / chronic_load
        if 0.8 <= ratio <= 1.3:
            status = "optimal"
        elif ratio < 0.8:
            status = "low"
        else:
            status = "high_risk"

    return {
        "acute_load_km": round(acute_load, 2),
        "chronic_load_km": round(chronic_load, 2),
        "ratio": round(ratio, 2) if ratio else None,
        "status": status,
        "last_7_days_count": len(acute_workouts),
        "last_28_days_count": len(chronic_workouts)
    }


@router.get("/dashboard/volume-progression-alert")
async def get_volume_progression_alert(
    db: Session = Depends(get_db),
    user_id: int = 1,
):
    """
    Check if weekly volume progression exceeds 10% (injury risk threshold).

    Compares current week to previous week.
    """
    today = date.today()
    current_week_start = today - timedelta(days=today.weekday())
    previous_week_start = current_week_start - timedelta(days=7)

    # Current week
    current_week_workouts = db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= current_week_start,
            Workout.distance.isnot(None)
        )
    ).all()
    current_volume = sum(w.distance for w in current_week_workouts)

    # Previous week
    previous_week_workouts = db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= previous_week_start,
            Workout.date < current_week_start,
            Workout.distance.isnot(None)
        )
    ).all()
    previous_volume = sum(w.distance for w in previous_week_workouts)

    # Calculate progression
    progression_pct = None
    alert = False
    if previous_volume > 0:
        progression_pct = ((current_volume - previous_volume) / previous_volume) * 100
        alert = progression_pct > 10

    return {
        "current_week_km": round(current_volume, 2),
        "previous_week_km": round(previous_volume, 2),
        "progression_percent": round(progression_pct, 1) if progression_pct else None,
        "alert": alert,
        "status": "warning" if alert else "ok",
        "message": f"Progression de {progression_pct:.1f}% - Risque de blessure !" if alert and progression_pct else
                   f"Progression de {progression_pct:.1f}% - Dans la norme" if progression_pct else
                   "Pas assez de données pour calculer la progression"
    }
