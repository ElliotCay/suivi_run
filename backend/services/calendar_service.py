"""
Service pour créer des événements de calendrier (.ics) pour les suggestions d'entraînement.
"""

from datetime import datetime, timedelta
from typing import Dict, List
import uuid


def create_ics_event(suggestion: Dict, scheduled_date: datetime) -> str:
    """
    Crée un fichier .ics pour une suggestion d'entraînement.

    Args:
        suggestion: Dict contenant la suggestion (structure, distance, type, etc.)
        scheduled_date: Date et heure de la séance planifiée

    Returns:
        Contenu du fichier .ics
    """
    # Générer un UID unique pour l'événement
    event_uid = f"workout-{suggestion.get('id', uuid.uuid4())}@suivi-course.local"

    # Extraire les infos de la suggestion
    structure = suggestion.get('structure', {})
    workout_type = structure.get('type', suggestion.get('workout_type', 'Course'))
    distance_km = structure.get('distance_km', suggestion.get('distance', 0))
    allure_cible = structure.get('allure_cible', '')
    workout_structure = structure.get('structure', '')

    # Titre de l'événement
    summary = f"🏃 {workout_type.capitalize()} - {distance_km}km"

    # Description : seulement le déroulé (pas les raisons)
    description_lines = []
    if allure_cible:
        description_lines.append(f"Allure cible: {allure_cible}")
    if workout_structure:
        description_lines.append(f"\\n{workout_structure}")

    description = "\\n".join(description_lines)

    # Durée estimée (environ 6-7 min/km pour l'estimation)
    estimated_duration_minutes = int(distance_km * 6.5)
    end_date = scheduled_date + timedelta(minutes=estimated_duration_minutes)

    # Formater les dates au format iCalendar
    dtstart = scheduled_date.strftime("%Y%m%dT%H%M%S")
    dtend = end_date.strftime("%Y%m%dT%H%M%S")
    dtstamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    # Créer le contenu .ics
    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Suivi Course//Workout Planner//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:{event_uid}
DTSTAMP:{dtstamp}
DTSTART:{dtstart}
DTEND:{dtend}
SUMMARY:{summary}
DESCRIPTION:{description}
LOCATION:À définir
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT30M
DESCRIPTION:Rappel: {summary} dans 30 minutes
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR"""

    return ics_content, event_uid


def create_calendar_feed(suggestions: List[Dict]) -> str:
    """
    Crée un flux de calendrier iCal contenant toutes les suggestions planifiées.

    Args:
        suggestions: Liste de dicts contenant les suggestions avec scheduled_date

    Returns:
        Contenu du fichier .ics avec tous les événements
    """
    dtstamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

    # En-tête du calendrier
    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Suivi Course//Workout Calendar//FR
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Entraînements Course
X-WR-CALDESC:Suggestions d'entraînement planifiées
X-WR-TIMEZONE:Europe/Paris
"""

    # Ajouter chaque suggestion planifiée comme événement
    for suggestion in suggestions:
        scheduled_date = suggestion.get('scheduled_date')
        if not scheduled_date:
            continue

        # Parser la date si c'est une string
        if isinstance(scheduled_date, str):
            scheduled_date = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))

        # Extraire les infos
        structure = suggestion.get('structure', {})
        workout_type = structure.get('type', suggestion.get('workout_type', 'Course'))
        distance_km = structure.get('distance_km', suggestion.get('distance', 0))
        allure_cible = structure.get('allure_cible', '')
        workout_structure = structure.get('structure', '')

        # UID unique
        event_uid = f"workout-{suggestion.get('id')}@suivi-course.local"

        # Titre
        summary = f"🏃 {workout_type.capitalize()} - {distance_km}km"

        # Description
        description_lines = []
        if allure_cible:
            description_lines.append(f"Allure cible: {allure_cible}")
        if workout_structure:
            description_lines.append(f"\\n{workout_structure}")
        description = "\\n".join(description_lines)

        # Durée estimée
        estimated_duration_minutes = int(distance_km * 6.5)
        end_date = scheduled_date + timedelta(minutes=estimated_duration_minutes)

        # Formater les dates
        dtstart = scheduled_date.strftime("%Y%m%dT%H%M%S")
        dtend = end_date.strftime("%Y%m%dT%H%M%S")

        # Ajouter l'événement
        ics_content += f"""BEGIN:VEVENT
UID:{event_uid}
DTSTAMP:{dtstamp}
DTSTART:{dtstart}
DTEND:{dtend}
SUMMARY:{summary}
DESCRIPTION:{description}
LOCATION:À définir
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT30M
DESCRIPTION:Rappel: {summary} dans 30 minutes
ACTION:DISPLAY
END:VALARM
END:VEVENT
"""

    # Fermer le calendrier
    ics_content += "END:VCALENDAR"

    return ics_content
