"""
Service de synchronisation avec iCloud Calendar via CalDAV
"""
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import pytz

try:
    import caldav
    from icalendar import Event, Calendar as iCalendar, vText, Alarm
except ImportError:
    caldav = None
    Event = None
    iCalendar = None
    vText = None
    Alarm = None
    logging.error("Modules caldav/icalendar non installés")

from config import ICLOUD_USERNAME, ICLOUD_PASSWORD

logger = logging.getLogger(__name__)


class CalendarSyncError(Exception):
    """Exception pour les erreurs de synchronisation calendrier"""
    pass


class iCloudCalendarSync:
    """Gestionnaire de synchronisation avec iCloud Calendar pour les entraînements course à pied"""

    def __init__(self):
        if not caldav:
            raise CalendarSyncError("Module caldav non installé. Exécutez: pip install caldav icalendar")

        self.username = ICLOUD_USERNAME
        self.password = ICLOUD_PASSWORD
        self.timezone = pytz.timezone("Europe/Paris")
        self.calendar_name = "Entraînements Course"

        self._client = None
        self._calendar = None

        # Validation de la configuration
        if not all([self.username, self.password]):
            raise CalendarSyncError("Configuration iCloud incomplète. Vérifiez ICLOUD_USERNAME et ICLOUD_PASSWORD dans .env")

    def connect(self) -> bool:
        """Établit la connexion à iCloud CalDAV"""
        try:
            logger.info("Connexion à iCloud CalDAV...")

            url = "https://caldav.icloud.com:443"

            self._client = caldav.DAVClient(
                url=url,
                username=self.username,
                password=self.password
            )

            # Test de connexion
            principal = self._client.principal()
            calendars = principal.calendars()

            logger.info(f"✅ Connexion iCloud réussie. {len(calendars)} calendrier(s) trouvé(s)")

            # Rechercher ou créer le calendrier Course
            self._calendar = self._get_or_create_calendar()

            return True

        except Exception as e:
            logger.error(f"❌ Erreur de connexion iCloud: {e}")
            return False

    def _get_or_create_calendar(self):
        """Récupère ou crée le calendrier Entraînements Course"""
        try:
            principal = self._client.principal()
            calendars = principal.calendars()

            # Chercher le calendrier existant
            for calendar in calendars:
                try:
                    if calendar.name == self.calendar_name:
                        logger.info(f"📅 Calendrier '{self.calendar_name}' trouvé")
                        return calendar
                except Exception:
                    continue

            # Créer le calendrier s'il n'existe pas
            logger.info(f"📅 Création du calendrier '{self.calendar_name}'...")
            new_calendar = principal.make_calendar(name=self.calendar_name)
            logger.info(f"✅ Calendrier '{self.calendar_name}' créé avec succès")

            return new_calendar

        except Exception as e:
            logger.error(f"Erreur lors de la gestion du calendrier: {e}")
            raise CalendarSyncError(f"Impossible de gérer le calendrier: {e}")

    def create_workout_event(self, suggestion_data: Dict) -> Optional[str]:
        """
        Crée un événement calendrier pour une séance d'entraînement

        Args:
            suggestion_data: Données de la suggestion avec scheduled_date

        Returns:
            UID de l'événement créé ou None en cas d'erreur
        """
        if not self._calendar:
            logger.error("Calendrier non initialisé")
            return None

        try:
            # Création de l'événement iCalendar
            cal = iCalendar()
            cal.add('prodid', '-//Suivi Course//Workout Planner//FR')
            cal.add('version', '2.0')

            event = Event()

            # UID unique basé sur l'ID de la suggestion
            event_uid = f"workout-{suggestion_data['id']}@suivi-course.local"
            event.add('uid', event_uid)

            # Extraire les infos
            structure = suggestion_data.get('structure', {})
            workout_type = structure.get('type', suggestion_data.get('workout_type', 'Course'))
            distance_km = structure.get('distance_km', suggestion_data.get('distance', 0))
            allure_cible = structure.get('allure_cible', '')
            workout_structure = structure.get('structure', '')

            # Titre de l'événement
            title = f"🏃 {workout_type.capitalize()} - {distance_km}km"
            event.add('summary', vText(title))

            # Dates et heures
            scheduled_date = suggestion_data['scheduled_date']
            if isinstance(scheduled_date, str):
                scheduled_date = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))

            # Durée estimée (environ 6-7 min/km)
            estimated_duration_minutes = int(distance_km * 6.5)
            end_time = scheduled_date + timedelta(minutes=estimated_duration_minutes)

            event.add('dtstart', scheduled_date)
            event.add('dtend', end_time)

            # Description avec structure de la séance
            description_parts = []
            if allure_cible:
                description_parts.append(f"🎯 Allure cible: {allure_cible}")
            if workout_structure:
                description_parts.append(f"\n📋 Plan:\n{workout_structure}")

            description = ''.join(description_parts) if description_parts else "Séance d'entraînement course à pied"
            event.add('description', vText(description))

            # Localisation
            event.add('location', vText("À définir"))

            # Rappel 30 minutes avant
            alarm = Alarm()
            alarm.add('action', 'DISPLAY')
            alarm.add('trigger', timedelta(minutes=-30))
            alarm.add('description', vText(f"Rappel: {title} dans 30 minutes"))
            event.add_component(alarm)

            # Timestamps
            now = datetime.now(pytz.UTC)
            event.add('dtstamp', now)
            event.add('created', now)
            event.add('last-modified', now)

            # Statut
            event.add('status', vText('CONFIRMED'))
            event.add('transp', vText('OPAQUE'))

            cal.add_component(event)

            # Ajout au calendrier iCloud
            self._calendar.save_event(cal.to_ical().decode('utf-8'))

            logger.info(f"✅ Événement créé: {title}")
            logger.info(f"   📅 Date: {scheduled_date.strftime('%d/%m/%Y %H:%M')}")
            logger.info(f"   🆔 UID: {event_uid}")

            return event_uid

        except Exception as e:
            logger.error(f"❌ Erreur lors de la création de l'événement: {e}")
            logger.exception(e)
            return None

    def delete_workout_event(self, calendar_uid: str) -> bool:
        """
        Supprime un événement du calendrier

        Args:
            calendar_uid: UID de l'événement à supprimer

        Returns:
            True si suppression réussie
        """
        try:
            events = self._calendar.events()

            for event in events:
                try:
                    ical_data = event.data
                    if calendar_uid in ical_data:
                        event.delete()
                        logger.info(f"✅ Événement supprimé: {calendar_uid}")
                        return True

                except Exception as e:
                    logger.debug(f"Erreur lors de la vérification d'un événement: {e}")
                    continue

            logger.warning(f"Événement {calendar_uid} non trouvé pour suppression")
            return False

        except Exception as e:
            logger.error(f"Erreur lors de la suppression de l'événement {calendar_uid}: {e}")
            return False

    def sync_suggestions(self, suggestions: List[Dict], db) -> Dict[str, int]:
        """
        Synchronise une liste de suggestions avec le calendrier

        Args:
            suggestions: Liste des suggestions planifiées à synchroniser
            db: Session de base de données

        Returns:
            Dictionnaire avec les statistiques de synchronisation
        """
        stats = {
            'created': 0,
            'deleted': 0,
            'errors': 0,
            'skipped': 0
        }

        if not self._calendar:
            logger.error("Calendrier non initialisé pour la synchronisation")
            return stats

        # Récupérer toutes les suggestions planifiées en base
        from models import Suggestion
        all_suggestions = db.query(Suggestion).filter(
            Suggestion.scheduled_date.isnot(None),
            Suggestion.completed == 0
        ).all()

        # Créer ou mettre à jour les événements
        for suggestion in all_suggestions:
            try:
                suggestion_dict = {
                    'id': suggestion.id,
                    'scheduled_date': suggestion.scheduled_date,
                    'structure': suggestion.structure,
                    'workout_type': suggestion.workout_type,
                    'distance': suggestion.distance
                }

                if suggestion.calendar_uid:
                    # Événement déjà synchronisé
                    stats['skipped'] += 1
                else:
                    # Nouveau événement à créer
                    calendar_uid = self.create_workout_event(suggestion_dict)
                    if calendar_uid:
                        suggestion.calendar_uid = calendar_uid
                        db.commit()
                        stats['created'] += 1
                    else:
                        stats['errors'] += 1

            except Exception as e:
                logger.error(f"Erreur lors de la synchronisation de la suggestion {suggestion.id}: {e}")
                stats['errors'] += 1

        logger.info(f"Synchronisation terminée: {stats['created']} créés, {stats['deleted']} supprimés, {stats['errors']} erreurs")
        return stats
