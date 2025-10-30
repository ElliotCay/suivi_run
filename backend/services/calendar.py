"""
Calendar service for generating iCal files for workout suggestions.
"""

from datetime import datetime, timedelta
from typing import List, Optional
import uuid
import logging

from icalendar import Calendar, Event, Alarm

logger = logging.getLogger(__name__)


def get_next_preferred_day(
    preferred_days: List[str],
    start_date: datetime = None
) -> datetime:
    """
    Get the next occurrence of a preferred day.

    Args:
        preferred_days: List of day names (e.g., ["monday", "wednesday", "friday"])
        start_date: Starting date to search from (defaults to today)

    Returns:
        datetime: Next preferred day
    """
    if not preferred_days:
        # Default to next day if no preferences
        return (start_date or datetime.now()) + timedelta(days=1)

    if start_date is None:
        start_date = datetime.now()

    day_map = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
        "friday": 4, "saturday": 5, "sunday": 6
    }

    # Convert preferred days to weekday numbers
    preferred_weekdays = [day_map[day.lower()] for day in preferred_days if day.lower() in day_map]

    if not preferred_weekdays:
        return start_date + timedelta(days=1)

    # Sort to find the closest next day
    preferred_weekdays.sort()
    current_weekday = start_date.weekday()

    # Find next preferred day
    for weekday in preferred_weekdays:
        if weekday > current_weekday:
            days_ahead = weekday - current_weekday
            return start_date + timedelta(days=days_ahead)

    # If no day this week, get first day next week
    days_ahead = (7 - current_weekday) + preferred_weekdays[0]
    return start_date + timedelta(days=days_ahead)


def parse_time(time_str: str) -> tuple:
    """
    Parse time string to hour and minute.

    Args:
        time_str: Time string in format "HH:MM"

    Returns:
        tuple: (hour, minute)
    """
    try:
        hour, minute = map(int, time_str.split(":"))
        return hour, minute
    except (ValueError, AttributeError):
        return 18, 0  # Default to 6 PM


def estimate_duration(suggestion: dict) -> int:
    """
    Estimate workout duration in minutes from suggestion structure.

    Args:
        suggestion: Suggestion data with structure field

    Returns:
        int: Estimated duration in minutes
    """
    structure = suggestion.get("structure", {})

    # Try to extract duration from structure
    if isinstance(structure, dict):
        # Check for explicit duration
        if "duree_min" in structure:
            return structure["duree_min"]

        # Check workout type and distance
        workout_type = structure.get("type", "").lower()
        distance = structure.get("distance_km", 0)

        # Rough estimates based on type and distance
        if "vma" in workout_type or "fractionne" in workout_type:
            # High intensity: ~5 min/km + warmup/cooldown
            return int(distance * 5) + 25
        elif "tempo" in workout_type or "seuil" in workout_type:
            # Medium intensity: ~4.5 min/km + warmup/cooldown
            return int(distance * 4.5) + 20
        elif "longue" in workout_type or "long" in workout_type:
            # Long run: ~6 min/km
            return int(distance * 6)
        else:
            # Easy run: ~5.5 min/km
            return int(distance * 5.5)

    return 45  # Default 45 minutes


def build_event_description(suggestion: dict) -> str:
    """
    Build detailed event description from suggestion structure.

    Args:
        suggestion: Suggestion data with structure field

    Returns:
        str: Formatted description
    """
    structure = suggestion.get("structure", {})
    reasoning = suggestion.get("reasoning", "")

    description_parts = []

    # Add reasoning if available
    if reasoning:
        description_parts.append(f"Objectif: {reasoning}\n")

    # Add warmup
    if isinstance(structure, dict):
        echauffement = structure.get("echauffement", structure.get("warmup"))
        if echauffement:
            description_parts.append(f"Echauffement: {echauffement}")

        # Add main workout
        series = structure.get("series", structure.get("intervals"))
        if series:
            description_parts.append(f"Series: {series}")

        corps = structure.get("corps", structure.get("main_set"))
        if corps:
            description_parts.append(f"Corps de seance: {corps}")

        # Add cooldown
        retour_calme = structure.get("retour_calme", structure.get("cooldown"))
        if retour_calme:
            description_parts.append(f"Retour au calme: {retour_calme}")

    return "\n".join(description_parts) if description_parts else "Seance d'entrainement"


def generate_ics_for_suggestion(
    suggestion: dict,
    preferred_date: datetime,
    reminder_minutes: Optional[List[int]] = None
) -> bytes:
    """
    Generate iCal file for a single suggestion.

    Args:
        suggestion: Suggestion dict with structure and metadata
        preferred_date: Date/time for the workout
        reminder_minutes: List of reminder offsets in minutes (e.g., [15, 60, 1440])

    Returns:
        bytes: iCal file content
    """
    cal = Calendar()
    cal.add('prodid', '-//Suivi Course//FR')
    cal.add('version', '2.0')

    event = Event()

    # Generate unique ID
    suggestion_id = suggestion.get('id', str(uuid.uuid4()))
    event.add('uid', f'suggestion-{suggestion_id}@suivi-course')

    # Set times
    duration_minutes = estimate_duration(suggestion)
    event.add('dtstart', preferred_date)
    event.add('dtend', preferred_date + timedelta(minutes=duration_minutes))

    # Set title
    structure = suggestion.get('structure', {})
    workout_type = structure.get('type', suggestion.get('workout_type', 'Entrainement'))
    distance = structure.get('distance_km', suggestion.get('distance'))

    if distance:
        title = f"{workout_type} - {distance}km"
    else:
        title = workout_type
    event.add('summary', title)

    # Set description
    description = build_event_description(suggestion)
    event.add('description', description)

    # Set location
    event.add('location', 'Course a pied')

    # Add reminders
    if reminder_minutes:
        for minutes in reminder_minutes:
            alarm = Alarm()
            alarm.add('trigger', timedelta(minutes=-minutes))
            alarm.add('action', 'DISPLAY')
            alarm.add('description', f'Rappel: {title}')
            event.add_component(alarm)

    cal.add_component(event)

    return cal.to_ical()


def generate_ics_file(
    suggestions: List[dict],
    preferred_days: Optional[List[str]] = None,
    preferred_time: Optional[str] = None,
    reminder_minutes: Optional[List[int]] = None
) -> bytes:
    """
    Generate iCal file for multiple suggestions.

    Args:
        suggestions: List of suggestion dicts
        preferred_days: List of preferred workout days
        preferred_time: Preferred workout time (HH:MM)
        reminder_minutes: List of reminder offsets in minutes

    Returns:
        bytes: iCal file content
    """
    cal = Calendar()
    cal.add('prodid', '-//Suivi Course//FR')
    cal.add('version', '2.0')
    cal.add('calscale', 'GREGORIAN')
    cal.add('method', 'PUBLISH')
    cal.add('x-wr-calname', 'Suivi Course - Entrainements')
    cal.add('x-wr-timezone', 'Europe/Paris')
    cal.add('x-wr-caldesc', 'Suggestions d\'entrainement pour la course a pied')

    # Parse preferred time
    hour, minute = parse_time(preferred_time or "18:00")

    # Generate events for each suggestion
    current_date = datetime.now().replace(hour=hour, minute=minute, second=0, microsecond=0)

    for suggestion in suggestions:
        # Get next preferred day
        current_date = get_next_preferred_day(preferred_days or [], current_date)

        # Create event
        event = Event()

        # Generate unique ID
        suggestion_id = suggestion.get('id', str(uuid.uuid4()))
        event.add('uid', f'suggestion-{suggestion_id}@suivi-course')

        # Set times
        duration_minutes = estimate_duration(suggestion)
        event.add('dtstart', current_date)
        event.add('dtend', current_date + timedelta(minutes=duration_minutes))
        event.add('dtstamp', datetime.utcnow())

        # Set title
        structure = suggestion.get('structure', {})
        workout_type = structure.get('type', suggestion.get('workout_type', 'Entrainement'))
        distance = structure.get('distance_km', suggestion.get('distance'))

        if distance:
            title = f"{workout_type} - {distance}km"
        else:
            title = workout_type
        event.add('summary', title)

        # Set description
        description = build_event_description(suggestion)
        event.add('description', description)

        # Set location
        event.add('location', 'Course a pied')

        # Add status
        event.add('status', 'CONFIRMED')

        # Add reminders
        if reminder_minutes:
            for minutes in reminder_minutes:
                alarm = Alarm()
                alarm.add('trigger', timedelta(minutes=-minutes))
                alarm.add('action', 'DISPLAY')
                alarm.add('description', f'Rappel: {title}')
                event.add_component(alarm)

        cal.add_component(event)

        # Move to next day for next workout
        current_date = current_date + timedelta(days=1)

    logger.info(f"Generated iCal file with {len(suggestions)} events")
    return cal.to_ical()
