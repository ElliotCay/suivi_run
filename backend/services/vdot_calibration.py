"""
VDOT Calibration Service

Calibrates training zones based on actual workout performances.
Adjusts theoretical VDOT zones to match real-world capabilities.
"""

from typing import Dict, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import Workout, User, PersonalRecord, TrainingZone
from services.vdot_calculator import (
    calculate_vdot_from_time,
    calculate_training_paces,
    get_weighted_vdot_from_prs
)


def calculate_effective_vdot_from_workouts(
    user_id: int,
    db: Session,
    lookback_days: int = 90
) -> Optional[Tuple[float, Dict]]:
    """
    Calculate "effective VDOT" based on recent threshold/tempo workout performances.

    This gives us the VDOT that matches what the runner can actually sustain
    in training, not just theoretical race predictions.

    Args:
        user_id: User ID
        db: Database session
        lookback_days: How far back to look for workouts (default: 90 days)

    Returns:
        Tuple of (effective_vdot, metadata) or None if insufficient data
        metadata includes: sample_size, avg_pace, consistency_score
    """
    cutoff_date = datetime.utcnow() - timedelta(days=lookback_days)

    # Get recent threshold/tempo workouts (10km+ to ensure it's true threshold effort)
    # Include both French types and legacy English types for backward compatibility
    threshold_workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= cutoff_date,
        Workout.workout_type.in_(["tempo", "threshold"]),  # French + legacy English
        Workout.distance >= 8.0,  # At least 8km to be a real threshold effort
        Workout.avg_pace.isnot(None),
        Workout.avg_hr.isnot(None)  # Must have HR data for quality control
    ).order_by(Workout.date.desc()).limit(10).all()

    if len(threshold_workouts) < 3:
        return None  # Not enough data

    # Filter out outliers (very slow or very fast - might be errors or special conditions)
    paces = [w.avg_pace for w in threshold_workouts]
    avg_pace = sum(paces) / len(paces)
    std_pace = (max(paces) - min(paces)) / 2

    # Keep workouts within 1.5 std deviations
    filtered_workouts = [
        w for w in threshold_workouts
        if abs(w.avg_pace - avg_pace) <= 1.5 * std_pace
    ]

    if len(filtered_workouts) < 2:
        return None

    # For each workout, estimate what VDOT would predict this pace at threshold
    # We reverse-engineer: "What VDOT gives threshold pace = observed pace?"
    effective_vdots = []

    for workout in filtered_workouts:
        # Assume workout was at threshold effort (88-92% HR max or ~10K race pace)
        # We need to find VDOT where threshold pace = workout.avg_pace

        # Binary search for VDOT that matches this pace
        low_vdot, high_vdot = 25, 70
        target_pace = workout.avg_pace

        for _ in range(20):  # Binary search iterations
            mid_vdot = (low_vdot + high_vdot) / 2
            paces = calculate_training_paces(mid_vdot)
            threshold_mid = (paces['threshold']['min_pace_sec'] + paces['threshold']['max_pace_sec']) / 2

            if threshold_mid < target_pace:
                high_vdot = mid_vdot
            else:
                low_vdot = mid_vdot

        effective_vdots.append(mid_vdot)

    # Calculate weighted average (more recent = higher weight)
    weighted_sum = 0
    weight_sum = 0

    for i, vdot in enumerate(effective_vdots):
        # More recent workouts get higher weight
        recency_weight = 1.0 - (i * 0.1)  # First workout gets 1.0, second 0.9, etc.
        recency_weight = max(0.5, recency_weight)

        weighted_sum += vdot * recency_weight
        weight_sum += recency_weight

    effective_vdot = weighted_sum / weight_sum

    # Calculate metadata
    metadata = {
        "sample_size": len(filtered_workouts),
        "avg_pace_sec": round(avg_pace, 1),
        "avg_pace_display": f"{int(avg_pace // 60)}:{int(avg_pace % 60):02d}",
        "consistency_score": round(1.0 - min(std_pace / avg_pace, 0.5), 2),
        "vdot_range": (round(min(effective_vdots), 1), round(max(effective_vdots), 1)),
        "lookback_days": lookback_days
    }

    return round(effective_vdot, 1), metadata


def get_calibrated_vdot(user_id: int, db: Session) -> Tuple[float, Dict]:
    """
    Get the best VDOT estimate by combining PR-based VDOT with workout-based calibration.

    Strategy:
    1. Calculate theoretical VDOT from PRs (weighted by distance quality)
    2. Calculate effective VDOT from recent threshold workouts
    3. Blend them intelligently:
       - If effective VDOT exists and is consistent: 70% effective, 30% theoretical
       - If effective VDOT is weak data: 40% effective, 60% theoretical
       - If no effective VDOT: 100% theoretical

    Args:
        user_id: User ID
        db: Database session

    Returns:
        Tuple of (calibrated_vdot, detailed_metadata)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} not found")

    # Get all PRs
    prs = db.query(PersonalRecord).filter(PersonalRecord.user_id == user_id).all()

    if not prs:
        raise ValueError("No personal records found for user")

    # Calculate weighted VDOT from PRs
    theoretical_vdot, pr_metadata = get_weighted_vdot_from_prs(prs)

    # Try to calculate effective VDOT from workouts
    effective_result = calculate_effective_vdot_from_workouts(user_id, db)

    if effective_result:
        effective_vdot, workout_metadata = effective_result

        # Determine blend ratio based on data quality
        if workout_metadata['sample_size'] >= 5 and workout_metadata['consistency_score'] > 0.8:
            # Strong workout data - trust it more
            effective_weight = 0.70
        elif workout_metadata['sample_size'] >= 3:
            # Decent workout data
            effective_weight = 0.50
        else:
            # Weak workout data
            effective_weight = 0.30

        theoretical_weight = 1.0 - effective_weight

        # Blend VDOTs
        calibrated_vdot = (effective_vdot * effective_weight +
                          theoretical_vdot * theoretical_weight)

        metadata = {
            "vdot_type": "calibrated",
            "theoretical_vdot": theoretical_vdot,
            "effective_vdot": effective_vdot,
            "calibrated_vdot": round(calibrated_vdot, 1),
            "blend_ratio": {
                "effective": effective_weight,
                "theoretical": theoretical_weight
            },
            "pr_data": pr_metadata,
            "workout_data": workout_metadata,
            "adjustment_pct": round(((calibrated_vdot - theoretical_vdot) / theoretical_vdot) * 100, 1),
            "confidence": "high" if effective_weight >= 0.6 else "medium"
        }

    else:
        # No workout data - use theoretical only
        calibrated_vdot = theoretical_vdot
        metadata = {
            "vdot_type": "theoretical_only",
            "theoretical_vdot": theoretical_vdot,
            "effective_vdot": None,
            "calibrated_vdot": round(calibrated_vdot, 1),
            "pr_data": pr_metadata,
            "workout_data": None,
            "adjustment_pct": 0.0,
            "confidence": "low" if pr_metadata.get('num_prs', 0) < 3 else "medium"
        }

    return round(calibrated_vdot, 1), metadata


def update_user_training_zones(user_id: int, db: Session, force_recalculate: bool = False) -> TrainingZone:
    """
    Update user's training zones using calibrated VDOT.

    Args:
        user_id: User ID
        db: Database session
        force_recalculate: If True, recalculate even if zones were recently updated

    Returns:
        Updated TrainingZone object
    """
    # Check if zones were recently updated (skip if within 7 days unless forced)
    existing_zone = db.query(TrainingZone).filter(TrainingZone.user_id == user_id).first()

    if existing_zone and not force_recalculate:
        if hasattr(existing_zone, 'updated_at'):
            days_since_update = (datetime.utcnow() - existing_zone.updated_at).days
            if days_since_update < 7:
                return existing_zone  # Recently updated, no need to recalculate

    # Get calibrated VDOT
    calibrated_vdot, metadata = get_calibrated_vdot(user_id, db)

    # Calculate training paces
    paces = calculate_training_paces(calibrated_vdot)

    # Update or create TrainingZone
    if existing_zone:
        zone = existing_zone
    else:
        zone = TrainingZone(user_id=user_id)
        db.add(zone)

    # Update all zone paces
    zone.vdot = calibrated_vdot
    zone.easy_min_pace_sec = paces['easy']['min_pace_sec']
    zone.easy_max_pace_sec = paces['easy']['max_pace_sec']
    zone.marathon_pace_sec = paces['marathon']['pace_sec']
    zone.threshold_min_pace_sec = paces['threshold']['min_pace_sec']
    zone.threshold_max_pace_sec = paces['threshold']['max_pace_sec']
    zone.interval_min_pace_sec = paces['interval']['min_pace_sec']
    zone.interval_max_pace_sec = paces['interval']['max_pace_sec']
    zone.repetition_min_pace_sec = paces['repetition']['min_pace_sec']
    zone.repetition_max_pace_sec = paces['repetition']['max_pace_sec']

    # Store calibration metadata as JSON if column exists
    if hasattr(zone, 'calibration_metadata'):
        zone.calibration_metadata = metadata

    if hasattr(zone, 'updated_at'):
        zone.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(zone)

    return zone
