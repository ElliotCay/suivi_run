"""
Injury-Aware Strengthening Service

Selects appropriate strengthening sessions based on user's injury history.
Prioritizes prevention and addresses recurring issues.
"""

import math
from typing import List, Dict
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from models import InjuryHistory, StrengtheningReminder


# Mapping from injury location to strengthening session types
INJURY_TO_STRENGTHENING_MAP = {
    "ankle": ["mollet_cheville"],
    "calf": ["mollet_cheville"],
    "achilles": ["mollet_cheville"],
    "it_band": ["tfl_hanche"],
    "knee": ["tfl_hanche"],
    "hip": ["tfl_hanche"],
    "tfl": ["tfl_hanche"],
    "hamstring": ["tfl_hanche"],
}


def get_strengthening_priorities(injuries: List[InjuryHistory]) -> List[str]:
    """
    Determine which strengthening sessions to prioritize based on injury history.

    Priority rules:
    1. Active injuries get highest priority
    2. Recurring injuries
    3. Severe injuries
    4. Recent injuries (within 6 months)

    Returns:
        Ordered list of strengthening types: ["tfl_hanche", "mollet_cheville"] or vice versa
    """
    if not injuries:
        # Default: alternate between both
        return ["tfl_hanche", "mollet_cheville"]

    # Score each strengthening type based on injury severity and recurrence
    strengthening_scores = {"tfl_hanche": 0, "mollet_cheville": 0}

    for injury in injuries:
        # Get strengthening types for this injury
        strengthening_types = INJURY_TO_STRENGTHENING_MAP.get(injury.location.lower(), [])

        # Calculate priority score
        score = 1

        if injury.status == "active":
            score += 10  # Active injuries get highest priority
        elif injury.status == "monitoring":
            score += 5  # Monitoring injuries still important

        if injury.recurrence_count > 0:
            score += 7  # Recurring injuries need ongoing work

        if injury.severity == "severe":
            score += 5
        elif injury.severity == "moderate":
            score += 3
        elif injury.severity == "minor":
            score += 1

        # Recency bonus (injuries within 6 months get extra priority)
        if injury.occurred_at:
            months_ago = (datetime.utcnow() - injury.occurred_at).days / 30
            if months_ago < 6:
                score += max(0, 5 - months_ago)  # Diminishing bonus

        # Add score to strengthening types
        for s_type in strengthening_types:
            strengthening_scores[s_type] += score

    # Sort by score (highest first)
    sorted_types = sorted(
        strengthening_scores.items(),
        key=lambda x: x[1],
        reverse=True
    )

    # Return ordered list
    result = [s_type for s_type, score in sorted_types if score > 0]

    # If no specific strengthening needed, return default
    if not result:
        return ["tfl_hanche", "mollet_cheville"]

    # If only one type, add the other as backup
    if len(result) == 1:
        other = "mollet_cheville" if result[0] == "tfl_hanche" else "tfl_hanche"
        result.append(other)

    return result


def select_strengthening_sessions(
    db: Session,
    user_id: int,
    block_id: int,
    start_date: datetime,
    end_date: datetime,
    preferred_days: List[int] = None  # Day offsets: [1, 3, 5] for Tuesday, Thursday, Saturday
) -> List[StrengtheningReminder]:
    """
    Select and create strengthening sessions for a training block based on injury history.

    Args:
        db: Database session
        user_id: User ID
        block_id: Training block ID
        start_date: Block start date
        end_date: Block end date
        preferred_days: List of day offsets (0-6) for strengthening sessions

    Returns:
        List of created StrengtheningReminder objects
    """
    # Get active/recurring injuries
    active_injuries = db.query(InjuryHistory).filter(
        InjuryHistory.user_id == user_id,
        (InjuryHistory.status.in_(["active", "monitoring"])) | (InjuryHistory.recurrence_count > 0)
    ).all()

    # Determine strengthening priorities
    priorities = get_strengthening_priorities(active_injuries)

    # Default to 2 sessions per week if not specified
    if not preferred_days:
        preferred_days = [2, 5]  # Wednesday and Saturday

    # Calculate total weeks (should be 4 for a block)
    # Use ceiling to ensure we cover the full block duration
    # e.g., 27 days = 3.85 weeks -> 4 weeks
    total_weeks = math.ceil((end_date - start_date).days / 7)

    # French day names
    day_names_fr = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

    # Session titles
    session_titles = {
        "tfl_hanche": "Renforcement TFL/Hanche",
        "mollet_cheville": "Renforcement Mollet/Cheville"
    }

    # Create strengthening reminders
    reminders = []

    for week in range(total_weeks):
        week_start = start_date + timedelta(weeks=week)

        # Create 2 sessions per week, alternating between priorities
        for i, day_offset in enumerate(preferred_days):
            # Alternate between priority types
            session_type = priorities[i % len(priorities)]

            session_date = week_start + timedelta(days=day_offset)

            # Don't schedule beyond block end
            if session_date > end_date:
                continue

            day_name = day_names_fr[day_offset]

            reminder = StrengtheningReminder(
                user_id=user_id,
                block_id=block_id,
                scheduled_date=session_date,
                day_of_week=day_name,
                session_type=session_type,
                title=session_titles[session_type],
                duration_minutes=15,
                completed=False
            )

            reminders.append(reminder)

    return reminders


def get_injury_summary_for_ai(db: Session, user_id: int) -> str:
    """
    Generate a concise injury summary for AI prompts.

    Returns:
        String describing current injury concerns and recommended strengthening.
    """
    # Get active/recurring injuries
    injuries = db.query(InjuryHistory).filter(
        InjuryHistory.user_id == user_id,
        (InjuryHistory.status.in_(["active", "monitoring"])) | (InjuryHistory.recurrence_count > 0)
    ).all()

    if not injuries:
        return "Aucune blessure active ou récurrente signalée."

    # Group by location
    injury_locations = {}
    for injury in injuries:
        loc = injury.location
        if loc not in injury_locations:
            injury_locations[loc] = {
                "count": 0,
                "recurring": False,
                "severity": "minor",
                "status": injury.status
            }

        injury_locations[loc]["count"] += 1
        if injury.recurrence_count > 0:
            injury_locations[loc]["recurring"] = True
        if injury.severity in ["severe", "moderate"]:
            injury_locations[loc]["severity"] = injury.severity

    # Build summary
    summary_parts = []
    for loc, info in injury_locations.items():
        status_str = "active" if info["status"] == "active" else "surveillance"
        recurring_str = " (récurrente)" if info["recurring"] else ""
        severity_str = f" [{info['severity']}]" if info["severity"] != "minor" else ""

        summary_parts.append(f"{loc} ({status_str}){recurring_str}{severity_str}")

    summary = "Blessures : " + ", ".join(summary_parts)

    # Add strengthening recommendation
    priorities = get_strengthening_priorities(injuries)
    strengthening_str = ", ".join([
        "TFL/Hanche" if p == "tfl_hanche" else "Mollet/Cheville"
        for p in priorities
    ])

    summary += f" | Renforcement recommandé : {strengthening_str}"

    return summary
