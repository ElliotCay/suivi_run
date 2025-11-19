"""
Workout characterization service using best efforts and training zones.

This service automatically determines the workout type (easy, threshold, interval, long, recovery)
by analyzing best efforts from Strava instead of relying on global average pace.
"""

import logging
from typing import Dict, Optional, Tuple
from sqlalchemy.orm import Session

from models import Workout, TrainingZone

logger = logging.getLogger(__name__)


def get_user_training_zones(db: Session, user_id: int) -> Optional[TrainingZone]:
    """
    Get current training zones for a user.

    Args:
        db: Database session
        user_id: User ID

    Returns:
        TrainingZone or None if not found
    """
    return db.query(TrainingZone).filter(
        TrainingZone.user_id == user_id,
        TrainingZone.is_current == True
    ).first()


def characterize_workout_from_best_efforts(
    workout: Workout,
    zones: Optional[TrainingZone] = None
) -> Tuple[str, Dict]:
    """
    Characterize a workout based on best efforts and distance.

    Uses best_efforts from Strava to determine workout type more accurately
    than using global average pace.

    Args:
        workout: Workout object with raw_data.best_efforts
        zones: Optional TrainingZone object for pace comparison

    Returns:
        Tuple of (workout_type, analysis_details)
        workout_type: "easy", "threshold", "interval", "long", "recovery", "race"
        analysis_details: Dict with characterization reasoning
    """

    # Extract best efforts
    if not workout.raw_data or "best_efforts" not in workout.raw_data:
        logger.warning(f"Workout {workout.id} has no best_efforts data, using fallback characterization")
        return _characterize_without_best_efforts(workout, zones)

    best_efforts = workout.raw_data["best_efforts"]
    distance_km = workout.distance or 0
    avg_pace_sec = workout.avg_pace or 0

    logger.info(f"Characterizing workout {workout.id}: {distance_km:.2f}km, avg_pace={avg_pace_sec:.1f}s/km")
    logger.info(f"Best efforts available: {list(best_efforts.keys())}")

    # Analysis metrics
    analysis = {
        "distance_km": distance_km,
        "avg_pace_sec_per_km": avg_pace_sec,
        "best_efforts": {}
    }

    # Extract key best efforts for analysis
    efforts_to_analyze = ["500m", "1km", "2km", "5km", "10km"]
    for effort in efforts_to_analyze:
        if effort in best_efforts:
            effort_data = best_efforts[effort]
            effort_time_sec = effort_data.get("time_seconds")
            effort_distance_km = _distance_label_to_km(effort)

            if effort_time_sec and effort_distance_km:
                effort_pace = effort_time_sec / effort_distance_km
                analysis["best_efforts"][effort] = {
                    "time_seconds": effort_time_sec,
                    "pace_sec_per_km": effort_pace
                }

    # Calculate pace variance (how much best efforts vary from average)
    if analysis["best_efforts"]:
        pace_variance = _calculate_pace_variance(analysis["best_efforts"], avg_pace_sec)
        analysis["pace_variance_percent"] = pace_variance
        logger.info(f"Pace variance: {pace_variance:.1f}%")
    else:
        pace_variance = 0

    # --- CHARACTERIZATION LOGIC ---

    # 1. RACE: Short distance (<= 15km) + very high intensity + low variance
    if distance_km <= 15 and pace_variance < 5:
        if "5km" in analysis["best_efforts"]:
            km5_pace = analysis["best_efforts"]["5km"]["pace_sec_per_km"]
            # If 5km best effort is within 3% of average pace, likely a race pace effort
            if abs(km5_pace - avg_pace_sec) / avg_pace_sec < 0.03:
                if zones and avg_pace_sec < zones.interval_max_pace_sec:
                    analysis["reasoning"] = "Race pace detected: short distance, sustained high intensity, minimal pace variation"
                    logger.info(f"  -> Characterized as RACE")
                    return "race", analysis

    # 2. INTERVAL/VMA: High pace variance (20%+) or very fast best efforts
    if pace_variance >= 20:
        analysis["reasoning"] = f"Interval training detected: high pace variance ({pace_variance:.1f}%), indicating speed variations"
        logger.info(f"  -> Characterized as INTERVAL (high variance)")
        return "interval", analysis

    # If we have fast short efforts (500m, 1km) significantly faster than average
    if "1km" in analysis["best_efforts"]:
        km1_pace = analysis["best_efforts"]["1km"]["pace_sec_per_km"]
        pace_diff_pct = ((avg_pace_sec - km1_pace) / avg_pace_sec) * 100

        if pace_diff_pct >= 15:  # 1km effort is 15%+ faster than average
            analysis["reasoning"] = f"Interval training detected: 1km best effort is {pace_diff_pct:.1f}% faster than average pace"
            logger.info(f"  -> Characterized as INTERVAL (fast 1km effort)")
            return "interval", analysis

    # 3. THRESHOLD/TEMPO: Sustained effort at threshold pace
    if zones:
        # Check if average pace is in threshold zone
        if zones.threshold_min_pace_sec <= avg_pace_sec <= zones.threshold_max_pace_sec:
            # If distance is >= 5km and pace is sustained
            if distance_km >= 5 and pace_variance < 10:
                analysis["reasoning"] = f"Threshold run detected: sustained pace in tempo zone ({zones.threshold_min_pace_sec}s-{zones.threshold_max_pace_sec}s per km), low variance"
                logger.info(f"  -> Characterized as THRESHOLD")
                return "threshold", analysis

        # Alternative: check if 5km or 10km best effort is at threshold pace
        for effort_label in ["5km", "10km"]:
            if effort_label in analysis["best_efforts"]:
                effort_pace = analysis["best_efforts"][effort_label]["pace_sec_per_km"]
                if zones.threshold_min_pace_sec <= effort_pace <= zones.threshold_max_pace_sec:
                    if abs(effort_pace - avg_pace_sec) / avg_pace_sec < 0.10:  # Within 10% of avg
                        analysis["reasoning"] = f"Threshold run detected: {effort_label} best effort at tempo pace"
                        logger.info(f"  -> Characterized as THRESHOLD (via {effort_label})")
                        return "threshold", analysis

    # 4. LONG RUN: Distance >= 12km at easy-to-moderate pace
    if distance_km >= 12:
        if zones:
            # Check if pace is in easy or marathon zone
            if avg_pace_sec >= zones.easy_min_pace_sec or \
               (zones.marathon_pace_sec - 30 <= avg_pace_sec <= zones.marathon_pace_sec + 30):
                analysis["reasoning"] = f"Long run detected: {distance_km:.1f}km at controlled pace"
                logger.info(f"  -> Characterized as LONG")
                return "long", analysis
        else:
            # Without zones, use distance threshold
            if pace_variance < 10:  # Consistent pace
                analysis["reasoning"] = f"Long run detected: {distance_km:.1f}km at consistent pace"
                logger.info(f"  -> Characterized as LONG")
                return "long", analysis

    # 5. RECOVERY: Very slow pace
    if zones and avg_pace_sec > zones.easy_max_pace_sec + 30:
        analysis["reasoning"] = f"Recovery run detected: pace slower than easy zone"
        logger.info(f"  -> Characterized as RECOVERY")
        return "recovery", analysis

    # 6. EASY RUN: Default for moderate pace with low variance
    if zones:
        if zones.easy_min_pace_sec <= avg_pace_sec <= zones.easy_max_pace_sec:
            analysis["reasoning"] = f"Easy run detected: pace in endurance zone ({zones.easy_min_pace_sec}s-{zones.easy_max_pace_sec}s per km)"
            logger.info(f"  -> Characterized as EASY")
            return "easy", analysis

    # If distance is < 12km and pace is moderate with low variance
    if distance_km < 12 and pace_variance < 15:
        analysis["reasoning"] = f"Easy run detected: moderate distance ({distance_km:.1f}km) at steady pace"
        logger.info(f"  -> Characterized as EASY (default)")
        return "easy", analysis

    # Default fallback
    analysis["reasoning"] = "Unable to characterize precisely, defaulting to easy run"
    logger.info(f"  -> Characterized as EASY (fallback)")
    return "easy", analysis


def _characterize_without_best_efforts(
    workout: Workout,
    zones: Optional[TrainingZone]
) -> Tuple[str, Dict]:
    """
    Fallback characterization using only average pace and distance.

    Used when best_efforts are not available (e.g., Apple Health imports).
    """
    distance_km = workout.distance or 0
    avg_pace_sec = workout.avg_pace or 0

    analysis = {
        "distance_km": distance_km,
        "avg_pace_sec_per_km": avg_pace_sec,
        "best_efforts": {},
        "fallback_mode": True
    }

    # Long run detection
    if distance_km >= 12:
        analysis["reasoning"] = f"Long run detected (fallback): {distance_km:.1f}km"
        return "long", analysis

    # Use training zones if available
    if zones and avg_pace_sec > 0:
        if avg_pace_sec < zones.interval_min_pace_sec:
            analysis["reasoning"] = "Interval pace detected (fallback)"
            return "interval", analysis
        elif zones.threshold_min_pace_sec <= avg_pace_sec <= zones.threshold_max_pace_sec:
            analysis["reasoning"] = "Threshold pace detected (fallback)"
            return "threshold", analysis
        elif zones.easy_min_pace_sec <= avg_pace_sec <= zones.easy_max_pace_sec:
            analysis["reasoning"] = "Easy pace detected (fallback)"
            return "easy", analysis
        elif avg_pace_sec > zones.easy_max_pace_sec + 30:
            analysis["reasoning"] = "Recovery pace detected (fallback)"
            return "recovery", analysis

    # Default
    analysis["reasoning"] = "Easy run (fallback, no zones available)"
    return "easy", analysis


def _distance_label_to_km(label: str) -> Optional[float]:
    """
    Convert distance label (e.g., "500m", "5km") to kilometers.

    Args:
        label: Distance label string

    Returns:
        Distance in km or None if invalid
    """
    label = label.lower().strip()

    if label.endswith("km"):
        try:
            return float(label[:-2])
        except ValueError:
            return None
    elif label.endswith("m"):
        try:
            meters = float(label[:-1])
            return meters / 1000.0
        except ValueError:
            return None

    return None


def _calculate_pace_variance(best_efforts: Dict, avg_pace: float) -> float:
    """
    Calculate pace variance as percentage.

    High variance (>20%) indicates interval training.
    Low variance (<10%) indicates steady-state running.

    Args:
        best_efforts: Dict of best efforts with pace_sec_per_km
        avg_pace: Average pace in seconds per km

    Returns:
        Variance as percentage
    """
    if not best_efforts or avg_pace == 0:
        return 0.0

    paces = [effort["pace_sec_per_km"] for effort in best_efforts.values()]

    if not paces:
        return 0.0

    # Calculate standard deviation of paces
    mean_pace = sum(paces) / len(paces)
    variance = sum((p - mean_pace) ** 2 for p in paces) / len(paces)
    std_dev = variance ** 0.5

    # Express as percentage of average
    variance_pct = (std_dev / avg_pace) * 100 if avg_pace > 0 else 0

    return variance_pct


def auto_characterize_workout(db: Session, workout_id: int) -> Optional[str]:
    """
    Automatically characterize a workout and update its workout_type.

    Args:
        db: Database session
        workout_id: Workout ID to characterize

    Returns:
        Workout type string or None if failed
    """
    workout = db.query(Workout).filter(Workout.id == workout_id).first()

    if not workout:
        logger.error(f"Workout {workout_id} not found")
        return None

    # Get user's training zones
    zones = get_user_training_zones(db, workout.user_id)

    # Characterize
    workout_type, analysis = characterize_workout_from_best_efforts(workout, zones)

    # Update workout
    workout.workout_type = workout_type

    # Store analysis in raw_data
    if not workout.raw_data:
        workout.raw_data = {}

    workout.raw_data["characterization_analysis"] = analysis

    db.commit()
    db.refresh(workout)

    logger.info(f"Workout {workout_id} characterized as '{workout_type}': {analysis.get('reasoning')}")

    return workout_type


def bulk_characterize_workouts(db: Session, user_id: int, limit: int = 100) -> Dict:
    """
    Characterize all uncharacterized workouts for a user.

    Args:
        db: Database session
        user_id: User ID
        limit: Maximum number of workouts to process

    Returns:
        Summary dict with counts
    """
    # Get workouts without workout_type or with type="undefined"
    workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        (Workout.workout_type == None) | (Workout.workout_type == "undefined")
    ).order_by(Workout.date.desc()).limit(limit).all()

    if not workouts:
        logger.info(f"No workouts to characterize for user {user_id}")
        return {
            "total": 0,
            "characterized": 0,
            "breakdown": {}
        }

    logger.info(f"Characterizing {len(workouts)} workouts for user {user_id}")

    # Get zones once
    zones = get_user_training_zones(db, user_id)

    breakdown = {}
    characterized_count = 0

    for workout in workouts:
        try:
            workout_type, analysis = characterize_workout_from_best_efforts(workout, zones)

            # Update workout
            workout.workout_type = workout_type

            # Store analysis
            if not workout.raw_data:
                workout.raw_data = {}
            workout.raw_data["characterization_analysis"] = analysis

            # Count
            breakdown[workout_type] = breakdown.get(workout_type, 0) + 1
            characterized_count += 1

        except Exception as e:
            logger.error(f"Failed to characterize workout {workout.id}: {e}")
            continue

    db.commit()

    logger.info(f"Characterized {characterized_count}/{len(workouts)} workouts")
    logger.info(f"Breakdown: {breakdown}")

    return {
        "total": len(workouts),
        "characterized": characterized_count,
        "breakdown": breakdown
    }
