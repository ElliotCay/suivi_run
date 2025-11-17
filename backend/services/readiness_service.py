"""
Service for calculating daily Readiness Score (100% algorithmic).

The Readiness Score is based on 5 factors:
1. Resting Heart Rate (FC repos)
2. Training Load Ratio (7d/28d volume)
3. Recovery since last hard session
4. Missed sessions
5. Pace progression (form)
"""

from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from models import Workout, User
import logging

logger = logging.getLogger(__name__)


def calculate_readiness_score(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Calculate the daily readiness score for a user.

    Returns a dict with:
    - score: int (0-100)
    - level: str (excellent, good, moderate, fatigue, rest)
    - emoji: str
    - message: str
    - details: dict with breakdown of each factor
    - available_criteria: int (how many criteria had data)
    """

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)
    four_weeks_ago = now - timedelta(days=28)

    # Get user's FCmax (or estimate if not set)
    user_fcmax = user.fcmax if user.fcmax else (220 - user.age if user.age else 190)

    # Get workouts for calculations
    recent_workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= four_weeks_ago
    ).order_by(Workout.date.desc()).all()

    # Initialize score and penalties
    score = 100
    penalties = {}
    bonuses = {}
    criteria_count = 0

    # Factor 1: Resting Heart Rate (not implemented yet - requires Apple Health HR data)
    # We'll skip this for now and note it in available_criteria

    # Factor 2: Training Load Ratio (7d/28d)
    penalty_volume, volume_details = _calculate_volume_penalty(recent_workouts, seven_days_ago)
    if volume_details:
        penalties['volume'] = penalty_volume
        criteria_count += 1

    # Factor 3: Recovery since last hard session
    penalty_recovery, recovery_details = _calculate_recovery_penalty(recent_workouts, now, user_fcmax)
    if recovery_details:
        penalties['recovery'] = penalty_recovery
        criteria_count += 1

    # Factor 4: Missed sessions
    # Note: This requires planned sessions to be in the database
    # For now, we'll skip this and implement it when we have training plans

    # Factor 5: Pace progression
    bonus_pace, pace_details = _calculate_pace_bonus(recent_workouts, seven_days_ago)
    if pace_details:
        bonuses['pace'] = bonus_pace
        criteria_count += 1

    # Calculate final score
    total_penalty = sum(penalties.values())
    total_bonus = sum(bonuses.values())
    final_score = score - total_penalty + total_bonus
    final_score = max(0, min(100, final_score))  # Clamp between 0-100

    # Determine level and message
    level, emoji, message = _get_score_interpretation(final_score)

    return {
        "score": final_score,
        "level": level,
        "emoji": emoji,
        "message": message,
        "details": {
            "volume": volume_details,
            "recovery": recovery_details,
            "pace": pace_details,
        },
        "penalties": penalties,
        "bonuses": bonuses,
        "available_criteria": criteria_count,
        "max_criteria": 5  # Total possible criteria (including HR and missed sessions)
    }


def _calculate_volume_penalty(workouts: List[Workout], seven_days_ago: datetime) -> tuple[int, Optional[Dict]]:
    """
    Calculate penalty based on 7d/28d volume ratio.

    Returns: (penalty_points, details_dict)
    """
    if not workouts or len(workouts) == 0:
        return 0, None

    # Calculate volumes
    last_7_days = [w for w in workouts if w.date >= seven_days_ago]
    acute_volume = sum(w.distance or 0 for w in last_7_days)
    chronic_volume = sum(w.distance or 0 for w in workouts) / 4  # 28 days / 4 weeks

    if chronic_volume == 0:
        return 0, None

    ratio = acute_volume / chronic_volume

    # Apply penalties according to roadmap
    penalty = 0
    status = "optimal"

    if ratio > 1.5:
        penalty = 20
        status = "surcharge"
    elif ratio < 0.5:
        penalty = 10
        status = "sous-entraînement"
    elif 0.8 <= ratio <= 1.2:
        penalty = 0
        status = "optimal"

    details = {
        "acute_volume_km": round(acute_volume, 1),
        "chronic_volume_km": round(chronic_volume, 1),
        "ratio": round(ratio, 2),
        "penalty": penalty,
        "status": status
    }

    return penalty, details


def _calculate_recovery_penalty(workouts: List[Workout], now: datetime, user_fcmax: int) -> tuple[int, Optional[Dict]]:
    """
    Calculate penalty based on recovery time since last hard session.
    Hard sessions are: VMA (interval) or Tempo (threshold).

    We consider a session "hard" if:
    - Type explicitly marked as VMA, interval, tempo, threshold, fractionné, seuil
    - OR average HR > 85% of user's FCmax (Zone 4+)
    - OR average pace is significantly faster than usual (top 25% of recent paces)

    Apple Watch zones for reference:
    - Zone 1: 50-60% FCmax (Échauffement)
    - Zone 2: 60-70% FCmax (Endurance)
    - Zone 3: 70-80% FCmax (Aérobie)
    - Zone 4: 80-90% FCmax (Seuil)
    - Zone 5: 90-100% FCmax (VMA)

    Returns: (penalty_points, details_dict)
    """
    if not workouts:
        return 0, None

    # Find last hard session
    hard_types = ['vma', 'interval', 'tempo', 'threshold', 'fractionné', 'seuil']
    last_hard_session = None

    # Calculate HR threshold for "hard" (85% FCmax = high Zone 4)
    hr_threshold = user_fcmax * 0.85

    # Calculate threshold pace (75th percentile of recent paces - faster is lower number)
    workouts_with_pace = [w for w in workouts if w.avg_pace and w.avg_pace > 0]
    pace_threshold = None
    if len(workouts_with_pace) >= 4:
        paces = sorted([w.avg_pace for w in workouts_with_pace])
        pace_threshold = paces[len(paces) // 4]  # 25th percentile (faster paces)

    for workout in workouts:
        # Check if explicitly marked as hard
        is_hard_type = workout.workout_type and any(ht in workout.workout_type.lower() for ht in hard_types)

        # Check if HR indicates hard effort (> 85% FCmax = Zone 4+)
        is_hard_hr = False
        if workout.avg_hr and workout.avg_hr > hr_threshold:
            is_hard_hr = True

        # Check if pace indicates hard effort (faster than 75th percentile)
        is_hard_pace = False
        if pace_threshold and workout.avg_pace and workout.avg_pace < pace_threshold:
            is_hard_pace = True

        if is_hard_type or is_hard_hr or is_hard_pace:
            last_hard_session = workout
            break

    if not last_hard_session:
        # No hard session found in last 28 days - fully recovered
        return 0, {
            "last_hard_session": None,
            "hours_since": None,
            "penalty": 0,
            "status": "fully_recovered"
        }

    # Calculate hours since last hard session
    hours_since = (now - last_hard_session.date).total_seconds() / 3600

    # Apply penalties
    penalty = 0
    status = "recovered"

    if hours_since < 24:
        penalty = 30
        status = "insufficient"
    elif hours_since < 48:
        penalty = 15
        status = "partial"
    else:
        penalty = 0
        status = "recovered"

    details = {
        "last_hard_session_date": last_hard_session.date.isoformat(),
        "last_hard_session_type": last_hard_session.workout_type,
        "hours_since": round(hours_since, 1),
        "penalty": penalty,
        "status": status
    }

    return penalty, details


def _calculate_pace_bonus(workouts: List[Workout], seven_days_ago: datetime) -> tuple[int, Optional[Dict]]:
    """
    Calculate bonus based on pace progression (form indicator).

    Returns: (bonus_points, details_dict)
    """
    if not workouts or len(workouts) < 2:
        return 0, None

    # Filter workouts with pace data
    workouts_with_pace = [w for w in workouts if w.avg_pace and w.avg_pace > 0]

    if len(workouts_with_pace) < 2:
        return 0, None

    # Calculate average pace for last 7 days and last 28 days
    last_7_days = [w for w in workouts_with_pace if w.date >= seven_days_ago]

    if not last_7_days:
        return 0, None

    avg_pace_7d = sum(w.avg_pace for w in last_7_days) / len(last_7_days)
    avg_pace_28d = sum(w.avg_pace for w in workouts_with_pace) / len(workouts_with_pace)

    # Calculate difference (negative means faster = better)
    pace_diff_seconds = avg_pace_7d - avg_pace_28d

    # Apply bonus if getting faster
    bonus = 0
    status = "stable"

    if pace_diff_seconds < -10:  # 10+ seconds faster per km
        bonus = 10
        status = "improving"
    elif abs(pace_diff_seconds) <= 5:  # ±5 seconds
        bonus = 0
        status = "stable"
    # No penalty for getting slower (already captured by fatigue)

    details = {
        "avg_pace_7d_sec_per_km": round(avg_pace_7d, 1),
        "avg_pace_28d_sec_per_km": round(avg_pace_28d, 1),
        "diff_seconds": round(pace_diff_seconds, 1),
        "bonus": bonus,
        "status": status
    }

    return bonus, details


def _get_score_interpretation(score: int) -> tuple[str, str, str]:
    """
    Convert score to level, emoji, and message.

    Returns: (level, emoji, message)
    """
    if score >= 90:
        return "excellent", "💚", "Forme excellente - Tu peux forcer aujourd'hui"
    elif score >= 75:
        return "good", "🟢", "Bonne forme - Séance qualité possible"
    elif score >= 60:
        return "moderate", "🟡", "Fatigue légère - Privilégie endurance facile"
    elif score >= 45:
        return "fatigue", "🟠", "Fatigue modérée - Séance courte ou repos actif"
    else:
        return "rest", "🔴", "Repos recommandé - Ton corps a besoin de récupération"
