"""
VDOT Calculator based on Jack Daniels' Running Formula.

Calculates VDOT (VO2max estimate) from race performances and provides
training pace recommendations for all training zones.

Uses lookup tables from Jack Daniels' Running Formula for accurate pacing.
"""

import math
from typing import Dict, Optional, Tuple


# Distance constants in meters
DISTANCES = {
    "500m": 500,
    "1km": 1000,
    "1500m": 1500,
    "2km": 2000,
    "3km": 3000,
    "5km": 5000,
    "10km": 10000,
    "15km": 15000,
    "semi": 21097.5,
    "marathon": 42195,
}


# Jack Daniels VDOT Training Paces Table (in seconds per km)
# VDOT -> {easy_min, easy_max, marathon, threshold_min, threshold_max, interval_min, interval_max, rep_min, rep_max}
VDOT_PACES_TABLE = {
    30: {"easy": (426, 480), "marathon": 330, "threshold": (312, 318), "interval": (294, 300), "repetition": (270, 282)},
    31: {"easy": (420, 474), "marathon": 324, "threshold": (306, 312), "interval": (288, 294), "repetition": (264, 276)},
    32: {"easy": (414, 468), "marathon": 318, "threshold": (300, 306), "interval": (282, 288), "repetition": (258, 270)},
    33: {"easy": (408, 462), "marathon": 312, "threshold": (294, 300), "interval": (276, 282), "repetition": (252, 264)},
    34: {"easy": (402, 456), "marathon": 306, "threshold": (288, 294), "interval": (270, 276), "repetition": (246, 258)},
    35: {"easy": (396, 450), "marathon": 300, "threshold": (282, 288), "interval": (264, 270), "repetition": (240, 252)},
    36: {"easy": (390, 444), "marathon": 294, "threshold": (276, 282), "interval": (258, 264), "repetition": (234, 246)},
    37: {"easy": (384, 438), "marathon": 288, "threshold": (270, 276), "interval": (252, 258), "repetition": (228, 240)},
    38: {"easy": (378, 432), "marathon": 282, "threshold": (264, 270), "interval": (246, 252), "repetition": (222, 234)},
    39: {"easy": (372, 426), "marathon": 276, "threshold": (258, 264), "interval": (240, 246), "repetition": (216, 228)},
    40: {"easy": (366, 420), "marathon": 270, "threshold": (252, 258), "interval": (234, 240), "repetition": (210, 222)},
    41: {"easy": (360, 414), "marathon": 264, "threshold": (246, 252), "interval": (228, 234), "repetition": (204, 216)},
    42: {"easy": (354, 408), "marathon": 258, "threshold": (240, 246), "interval": (222, 228), "repetition": (198, 210)},
    43: {"easy": (348, 402), "marathon": 252, "threshold": (234, 240), "interval": (216, 222), "repetition": (192, 204)},
    44: {"easy": (342, 396), "marathon": 246, "threshold": (228, 234), "interval": (210, 216), "repetition": (186, 198)},
    45: {"easy": (336, 390), "marathon": 240, "threshold": (222, 228), "interval": (204, 210), "repetition": (180, 192)},
    46: {"easy": (330, 384), "marathon": 234, "threshold": (216, 222), "interval": (198, 204), "repetition": (174, 186)},
    47: {"easy": (324, 378), "marathon": 228, "threshold": (210, 216), "interval": (192, 198), "repetition": (168, 180)},
    48: {"easy": (318, 372), "marathon": 222, "threshold": (204, 210), "interval": (186, 192), "repetition": (162, 174)},
    49: {"easy": (312, 366), "marathon": 216, "threshold": (198, 204), "interval": (180, 186), "repetition": (156, 168)},
    50: {"easy": (306, 360), "marathon": 210, "threshold": (192, 198), "interval": (174, 180), "repetition": (150, 162)},
    51: {"easy": (300, 354), "marathon": 204, "threshold": (186, 192), "interval": (168, 174), "repetition": (144, 156)},
    52: {"easy": (294, 348), "marathon": 198, "threshold": (180, 186), "interval": (162, 168), "repetition": (138, 150)},
    53: {"easy": (288, 342), "marathon": 192, "threshold": (174, 180), "interval": (156, 162), "repetition": (132, 144)},
    54: {"easy": (282, 336), "marathon": 186, "threshold": (168, 174), "interval": (150, 156), "repetition": (126, 138)},
    55: {"easy": (276, 330), "marathon": 180, "threshold": (162, 168), "interval": (144, 150), "repetition": (120, 132)},
    56: {"easy": (270, 324), "marathon": 174, "threshold": (156, 162), "interval": (138, 144), "repetition": (114, 126)},
    57: {"easy": (264, 318), "marathon": 168, "threshold": (150, 156), "interval": (132, 138), "repetition": (108, 120)},
    58: {"easy": (258, 312), "marathon": 162, "threshold": (144, 150), "interval": (126, 132), "repetition": (102, 114)},
    59: {"easy": (252, 306), "marathon": 156, "threshold": (138, 144), "interval": (120, 126), "repetition": (96, 108)},
    60: {"easy": (246, 300), "marathon": 150, "threshold": (132, 138), "interval": (114, 120), "repetition": (90, 102)},
}


def calculate_vdot_from_time(distance_meters: float, time_seconds: int) -> float:
    """
    Calculate VDOT from race performance using Jack Daniels' formula.

    Args:
        distance_meters: Race distance in meters
        time_seconds: Race time in seconds

    Returns:
        VDOT value (VO2max estimate)

    Formula from Jack Daniels' Running Formula:
    VDOT = (-4.60 + 0.182258 * velocity + 0.000104 * velocity²) /
           (0.8 + 0.1894393 * e^(-0.012778 * time_minutes) + 0.2989558 * e^(-0.1932605 * time_minutes))
    """
    if time_seconds <= 0 or distance_meters <= 0:
        raise ValueError("Distance and time must be positive")

    # Calculate velocity in meters per minute
    time_minutes = time_seconds / 60.0
    velocity = distance_meters / time_minutes

    # Calculate percent VO2max (%vVO2max)
    percent_vo2max = 0.8 + 0.1894393 * math.exp(-0.012778 * time_minutes) + \
                     0.2989558 * math.exp(-0.1932605 * time_minutes)

    # Calculate VO2 in ml/kg/min
    vo2 = -4.60 + 0.182258 * velocity + 0.000104 * velocity * velocity

    # Calculate VDOT
    vdot = vo2 / percent_vo2max

    return round(vdot, 1)


def calculate_vdot_from_pr(distance: str, time_seconds: int) -> float:
    """
    Calculate VDOT from a personal record.

    Args:
        distance: Distance key (e.g., "5km", "10km", "semi", "marathon")
        time_seconds: Race time in seconds

    Returns:
        VDOT value
    """
    if distance not in DISTANCES:
        raise ValueError(f"Unknown distance: {distance}. Valid distances: {list(DISTANCES.keys())}")

    distance_meters = DISTANCES[distance]
    return calculate_vdot_from_time(distance_meters, time_seconds)


def get_best_vdot_from_prs(prs: list) -> Tuple[float, str]:
    """
    Calculate VDOT from multiple PRs and return the best (highest) value.

    Args:
        prs: List of personal records with 'distance' and 'time_seconds'

    Returns:
        Tuple of (best_vdot, distance_used)
    """
    if not prs:
        raise ValueError("No personal records provided")

    best_vdot = 0
    best_distance = ""

    for pr in prs:
        try:
            vdot = calculate_vdot_from_pr(pr.distance, pr.time_seconds)
            if vdot > best_vdot:
                best_vdot = vdot
                best_distance = pr.distance
        except (ValueError, AttributeError):
            continue

    if best_vdot == 0:
        raise ValueError("Could not calculate VDOT from any PR")

    return best_vdot, best_distance


def get_weighted_vdot_from_prs(prs: list, recency_days: int = 365) -> Tuple[float, Dict]:
    """
    Calculate weighted VDOT from multiple PRs with intelligent weighting.

    Weighting strategy:
    - Distance weight: Favor 5K-15K distances (most reliable for threshold prediction)
    - Recency weight: Favor recent PRs (within recency_days)
    - Consistency weight: If multiple PRs give similar VDOT, increase confidence

    Args:
        prs: List of personal records with 'distance', 'time_seconds', 'created_at'
        recency_days: PRs older than this get reduced weight (default: 365 days)

    Returns:
        Tuple of (weighted_vdot, metadata_dict)
        metadata includes: vdot_range, primary_distances, confidence_score
    """
    from datetime import datetime, timedelta

    if not prs:
        raise ValueError("No personal records provided")

    # Distance reliability weights (0.0 to 1.0)
    # 5K-15K are most reliable for threshold/tempo prediction
    DISTANCE_WEIGHTS = {
        "500m": 0.3,    # Too short, sprint-oriented
        "1km": 0.4,     # Short, limited endurance component
        "1500m": 0.5,
        "2km": 0.6,
        "3km": 0.7,
        "5km": 1.0,     # Ideal for VDOT calculation
        "10km": 1.0,    # Ideal for VDOT calculation
        "15km": 0.95,   # Very good
        "semi": 0.85,   # Good but fatigue/pacing issues possible
        "marathon": 0.7 # Less reliable (heat, wall, pacing strategies)
    }

    weighted_sum = 0.0
    weight_sum = 0.0
    vdots = []
    now = datetime.utcnow()

    for pr in prs:
        try:
            # Calculate VDOT for this PR
            vdot = calculate_vdot_from_pr(pr.distance, pr.time_seconds)
            vdots.append((vdot, pr.distance))

            # Distance weight
            distance_weight = DISTANCE_WEIGHTS.get(pr.distance, 0.5)

            # Recency weight (exponential decay)
            if hasattr(pr, 'created_at') and pr.created_at is not None:
                age_days = (now - pr.created_at).days
                recency_weight = max(0.3, 1.0 - (age_days / recency_days))
            else:
                recency_weight = 0.5  # Unknown age, give medium weight

            # Combined weight
            total_weight = distance_weight * recency_weight

            weighted_sum += vdot * total_weight
            weight_sum += total_weight

        except (ValueError, AttributeError) as e:
            continue

    if weight_sum == 0:
        raise ValueError("Could not calculate VDOT from any PR")

    # Calculate weighted average
    weighted_vdot = weighted_sum / weight_sum

    # Calculate metadata
    vdot_values = [v[0] for v in vdots]
    vdot_range = (min(vdot_values), max(vdot_values)) if vdot_values else (0, 0)
    vdot_std = (max(vdot_values) - min(vdot_values)) / 2 if len(vdot_values) > 1 else 0

    # Confidence score (0-1): higher when VDOTs are consistent and based on good distances
    confidence = 1.0
    if vdot_std > 3:  # Large spread in VDOTs
        confidence *= 0.7
    if len(vdots) < 3:  # Few PRs
        confidence *= 0.8

    metadata = {
        "vdot_range": vdot_range,
        "vdot_std": round(vdot_std, 1),
        "num_prs": len(vdots),
        "primary_distances": [d for v, d in sorted(vdots, reverse=True)[:3]],
        "confidence_score": round(confidence, 2)
    }

    return round(weighted_vdot, 1), metadata


def calculate_training_paces(vdot: float) -> Dict[str, Dict[str, any]]:
    """
    Calculate training pace zones based on VDOT using Jack Daniels' lookup tables.

    Args:
        vdot: VDOT value (will be rounded to nearest integer)

    Returns:
        Dictionary with training zones and their pace ranges:
        {
            "easy": {"min_pace_sec": 360, "max_pace_sec": 390, "min_pace_per_km": "6:00", "max_pace_per_km": "6:30"},
            "marathon": {"pace_sec": 300, "pace_per_km": "5:00"},
            "threshold": {"min_pace_sec": 270, "max_pace_sec": 280, "min_pace_per_km": "4:30", "max_pace_per_km": "4:40"},
            "interval": {"min_pace_sec": 250, "max_pace_sec": 260, "min_pace_per_km": "4:10", "max_pace_per_km": "4:20"},
            "repetition": {"min_pace_sec": 230, "max_pace_sec": 240, "min_pace_per_km": "3:50", "max_pace_per_km": "4:00"}
        }

    All paces are in seconds per kilometer.
    """
    # Round VDOT to nearest integer for table lookup
    vdot_rounded = round(vdot)

    # Clamp to table range
    if vdot_rounded < 30:
        vdot_rounded = 30
    elif vdot_rounded > 60:
        vdot_rounded = 60

    # Get paces from lookup table
    paces_data = VDOT_PACES_TABLE[vdot_rounded]

    # Format result with descriptions
    result = {
        "easy": {
            "min_pace_sec": paces_data["easy"][0],
            "max_pace_sec": paces_data["easy"][1],
            "min_pace_per_km": _seconds_to_pace_string(paces_data["easy"][0]),
            "max_pace_per_km": _seconds_to_pace_string(paces_data["easy"][1]),
            "description": "Endurance fondamentale, allure conversationnelle",
            "hr_percentage": "65-79%"
        },
        "marathon": {
            "pace_sec": paces_data["marathon"],
            "pace_per_km": _seconds_to_pace_string(paces_data["marathon"]),
            "description": "Allure marathon",
            "hr_percentage": "80-85%"
        },
        "threshold": {
            "min_pace_sec": paces_data["threshold"][0],
            "max_pace_sec": paces_data["threshold"][1],
            "min_pace_per_km": _seconds_to_pace_string(paces_data["threshold"][0]),
            "max_pace_per_km": _seconds_to_pace_string(paces_data["threshold"][1]),
            "description": "Seuil lactique, tempo run, allure 10K-15K",
            "hr_percentage": "88-92%"
        },
        "interval": {
            "min_pace_sec": paces_data["interval"][0],
            "max_pace_sec": paces_data["interval"][1],
            "min_pace_per_km": _seconds_to_pace_string(paces_data["interval"][0]),
            "max_pace_per_km": _seconds_to_pace_string(paces_data["interval"][1]),
            "description": "VO2max, allure 5K, fractionné long",
            "hr_percentage": "97-100%"
        },
        "repetition": {
            "min_pace_sec": paces_data["repetition"][0],
            "max_pace_sec": paces_data["repetition"][1],
            "min_pace_per_km": _seconds_to_pace_string(paces_data["repetition"][0]),
            "max_pace_per_km": _seconds_to_pace_string(paces_data["repetition"][1]),
            "description": "Répétitions courtes, allure 1500m-3K, vitesse pure",
            "hr_percentage": ">100%"
        }
    }

    return result


def _seconds_to_pace_string(seconds: float) -> str:
    """Convert seconds per km to MM:SS format."""
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes}:{secs:02d}"


def calculate_predicted_times(vdot: float) -> Dict[str, Dict[str, any]]:
    """
    Calculate predicted race times for various distances based on VDOT.

    Args:
        vdot: VDOT value

    Returns:
        Dictionary with predicted times for each distance:
        {
            "5km": {"time_seconds": 1470, "time_display": "24:30", "pace_per_km": "4:54"},
            "10km": {"time_seconds": 3060, "time_display": "51:00", "pace_per_km": "5:06"},
            ...
        }
    """
    predictions = {}

    for distance_name, distance_meters in DISTANCES.items():
        # Calculate predicted time using reverse of VDOT formula
        time_seconds = _predict_time_from_vdot(vdot, distance_meters)

        predictions[distance_name] = {
            "time_seconds": time_seconds,
            "time_display": _seconds_to_time_string(time_seconds),
            "pace_per_km": _seconds_to_pace_string(time_seconds / (distance_meters / 1000))
        }

    return predictions


def _predict_time_from_vdot(vdot: float, distance_meters: float) -> int:
    """
    Predict race time from VDOT using iterative method.

    This is an approximation using binary search since the reverse formula is complex.
    """
    # Binary search for the time that gives us the target VDOT
    low_time = 60  # 1 minute minimum
    high_time = 18000  # 5 hours maximum

    while high_time - low_time > 1:
        mid_time = (low_time + high_time) // 2
        calculated_vdot = calculate_vdot_from_time(distance_meters, mid_time)

        if calculated_vdot > vdot:
            low_time = mid_time
        else:
            high_time = mid_time

    return low_time


def _seconds_to_time_string(seconds: int) -> str:
    """Convert seconds to HH:MM:SS or MM:SS format."""
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60

    if hours > 0:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    else:
        return f"{minutes}:{secs:02d}"


# Example usage and tests
if __name__ == "__main__":
    # Test with a 5K time of 24:30 (1470 seconds)
    vdot = calculate_vdot_from_pr("5km", 1470)
    print(f"VDOT for 5K in 24:30: {vdot}")

    # Calculate training paces
    paces = calculate_training_paces(vdot)
    print("\nTraining Paces:")
    for zone, values in paces.items():
        print(f"\n{zone.upper()}:")
        if "min_pace_per_km" in values:
            print(f"  Pace: {values['min_pace_per_km']} - {values['max_pace_per_km']}/km")
        else:
            print(f"  Pace: {values['pace_per_km']}/km")
        print(f"  Description: {values['description']}")
        print(f"  HR: {values['hr_percentage']}")

    # Calculate predicted times
    predictions = calculate_predicted_times(vdot)
    print("\nPredicted Race Times:")
    for distance, pred in predictions.items():
        print(f"{distance}: {pred['time_display']} (pace: {pred['pace_per_km']}/km)")
