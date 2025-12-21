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
        logger.info(f"🔧 create_workout_event appelée avec données: {suggestion_data.keys()}")

        if not self._calendar:
            logger.error("❌ Calendrier non initialisé dans create_workout_event")
            return None

        try:
            logger.info("📝 Création de l'objet iCalendar...")
            # Création de l'événement iCalendar
            cal = iCalendar()
            cal.add('prodid', '-//Suivi Course//Workout Planner//FR')
            cal.add('version', '2.0')

            event = Event()

            # UID unique basé sur l'ID de la suggestion
            event_uid = f"workout-{suggestion_data['id']}@suivi-course.local"
            event.add('uid', event_uid)
            logger.info(f"🆔 UID généré: {event_uid}")

            # Extraire les infos
            structure = suggestion_data.get('structure', {})
            logger.info(f"📋 Structure récupérée: {structure}")

            workout_type = structure.get('type', suggestion_data.get('workout_type', 'Course'))
            distance_km = structure.get('distance_km', suggestion_data.get('distance', 0))
            allure_cible = structure.get('allure_cible', '')
            workout_structure = structure.get('structure', '')

            logger.info(f"🏃 Type: {workout_type}, Distance: {distance_km}km")

            # Titre de l'événement
            # Format distance with 1 decimal if needed, otherwise integer
            if distance_km % 1 == 0:
                distance_str = f"{int(distance_km)}km"
            else:
                distance_str = f"{distance_km:.1f}km"

            title = f"🏃 {workout_type.capitalize()} - {distance_str}"
            event.add('summary', vText(title))
            logger.info(f"📌 Titre: {title}")

            # Dates et heures
            scheduled_date = suggestion_data['scheduled_date']
            logger.info(f"📅 scheduled_date type: {type(scheduled_date)}, valeur: {scheduled_date}")

            if isinstance(scheduled_date, str):
                scheduled_date = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))
                logger.info(f"📅 scheduled_date converti en datetime: {scheduled_date}")

            # Durée estimée (environ 6-7 min/km)
            estimated_duration_minutes = int(distance_km * 6.5)
            end_time = scheduled_date + timedelta(minutes=estimated_duration_minutes)

            logger.info(f"⏱️ Durée estimée: {estimated_duration_minutes} min")
            logger.info(f"📅 Début: {scheduled_date}, Fin: {end_time}")

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
            logger.info("✅ Événement ajouté au calendrier iCalendar")

            # Ajout au calendrier iCloud
            logger.info("☁️ Envoi de l'événement vers iCloud Calendar...")
            ical_string = cal.to_ical().decode('utf-8')
            logger.info(f"📄 Taille de l'iCal: {len(ical_string)} caractères")

            self._calendar.save_event(ical_string)
            logger.info("☁️ Événement sauvegardé sur iCloud!")

            logger.info(f"✅ Événement créé: {title}")
            logger.info(f"   📅 Date: {scheduled_date.strftime('%d/%m/%Y %H:%M')}")
            logger.info(f"   🆔 UID: {event_uid}")

            return event_uid

        except Exception as e:
            logger.error(f"❌ Erreur lors de la création de l'événement: {e}")
            logger.exception(e)
            return None

    def create_strengthening_event(self, reminder_data: Dict) -> Optional[str]:
        """
        Crée un événement calendrier pour une séance de renforcement

        Args:
            reminder_data: Données du reminder avec scheduled_date, title, duration_minutes

        Returns:
            UID de l'événement créé ou None en cas d'erreur
        """
        if not self._calendar:
            logger.error("❌ Calendrier non initialisé dans create_strengthening_event")
            return None

        try:
            logger.info(f"💪 Création événement renforcement: {reminder_data.get('title')}")

            # Création de l'événement iCalendar
            cal = iCalendar()
            cal.add('prodid', '-//Suivi Course//Strengthening Planner//FR')
            cal.add('version', '2.0')

            event = Event()

            # UID unique basé sur l'ID du reminder
            event_uid = f"strengthening-{reminder_data['id']}@suivi-course.local"
            event.add('uid', event_uid)
            logger.info(f"🆔 UID généré: {event_uid}")

            # Titre de l'événement
            title = f"💪 {reminder_data['title']}"
            event.add('summary', vText(title))

            # Dates et heures
            scheduled_date = reminder_data['scheduled_date']
            if isinstance(scheduled_date, str):
                scheduled_date = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))

            # Durée (15 minutes par défaut)
            duration_minutes = reminder_data.get('duration_minutes', 15)
            end_time = scheduled_date + timedelta(minutes=duration_minutes)

            event.add('dtstart', scheduled_date)
            event.add('dtend', end_time)

            # Description
            session_type = reminder_data.get('session_type', '')
            description = f"Séance de renforcement musculaire ({duration_minutes} min)\n\n"

            if session_type == 'tfl_hanche':
                description += "🎯 Focus: TFL et stabilité hanche\n"
                description += "• Renforcement musculaire ciblé\n"
                description += "• Prévention blessures\n"
                description += "• Amélioration stabilité"
            elif session_type == 'mollet_cheville':
                description += "🎯 Focus: Mollet et proprioception cheville\n"
                description += "• Exercices proprioceptifs\n"
                description += "• Renforcement mollets\n"
                description += "• Prévention entorses"
            else:
                description += "🎯 Renforcement musculaire général"

            event.add('description', vText(description))

            # Localisation
            event.add('location', vText("À la maison"))

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
            ical_string = cal.to_ical().decode('utf-8')
            self._calendar.save_event(ical_string)

            logger.info(f"✅ Événement renforcement créé: {title}")
            logger.info(f"   📅 Date: {scheduled_date.strftime('%d/%m/%Y %H:%M')}")
            logger.info(f"   🆔 UID: {event_uid}")

            return event_uid

        except Exception as e:
            logger.error(f"❌ Erreur lors de la création de l'événement renforcement: {e}")
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

    def delete_future_events(self, from_date: datetime = None) -> Dict[str, int]:
        """
        Supprime tous les événements futurs du calendrier "Entraînements Course".

        Comme ce calendrier est dédié uniquement aux entraînements générés,
        on peut simplement supprimer tous les événements à partir d'aujourd'hui.

        Args:
            from_date: Date à partir de laquelle supprimer (défaut: aujourd'hui)

        Returns:
            Dictionnaire avec les statistiques de suppression
        """
        stats = {
            'deleted': 0,
            'errors': 0
        }

        if not self._calendar:
            logger.error("❌ Calendrier non initialisé pour la suppression")
            return stats

        if from_date is None:
            from_date = datetime.now(self.timezone).replace(hour=0, minute=0, second=0, microsecond=0)

        logger.info(f"🗑️ Suppression des événements à partir du {from_date.strftime('%d/%m/%Y')} dans '{self.calendar_name}'")

        try:
            # Récupérer tous les événements du calendrier
            all_events = list(self._calendar.events())
            logger.info(f"📅 {len(all_events)} événements trouvés dans le calendrier")

            for event in all_events:
                try:
                    # Parser l'événement pour obtenir sa date
                    ical_data = event.data

                    # Chercher DTSTART dans les données iCal
                    import re
                    dtstart_match = re.search(r'DTSTART[^:]*:(\d{8})', ical_data)

                    if dtstart_match:
                        date_str = dtstart_match.group(1)
                        event_date = datetime.strptime(date_str, '%Y%m%d')
                        event_date = self.timezone.localize(event_date)

                        # Supprimer si l'événement est aujourd'hui ou après
                        if event_date.date() >= from_date.date():
                            event.delete()
                            stats['deleted'] += 1
                            logger.debug(f"✅ Événement du {event_date.strftime('%d/%m/%Y')} supprimé")

                except Exception as e:
                    logger.debug(f"Erreur lors du traitement d'un événement: {e}")
                    stats['errors'] += 1
                    continue

            logger.info(f"🗑️ Suppression terminée: {stats['deleted']} événements supprimés, {stats['errors']} erreurs")
            return stats

        except Exception as e:
            logger.error(f"❌ Erreur lors de la récupération des événements: {e}")
            return stats

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
            logger.error("❌ Calendrier non initialisé pour la synchronisation")
            return stats

        # Récupérer toutes les suggestions planifiées en base
        from models import Suggestion
        all_suggestions = db.query(Suggestion).filter(
            Suggestion.scheduled_date.isnot(None),
            Suggestion.completed == 0
        ).all()

        logger.info(f"📊 Nombre de suggestions planifiées trouvées: {len(all_suggestions)}")

        if len(all_suggestions) == 0:
            logger.warning("⚠️ Aucune suggestion planifiée trouvée dans la base de données")
            logger.info("💡 Vérification: est-ce que des suggestions ont un scheduled_date ?")

        # Créer ou mettre à jour les événements
        for i, suggestion in enumerate(all_suggestions, 1):
            try:
                logger.info(f"🔄 Traitement suggestion {i}/{len(all_suggestions)} - ID: {suggestion.id}")
                logger.info(f"   📅 Date planifiée: {suggestion.scheduled_date}")
                logger.info(f"   🏃 Type: {suggestion.workout_type}")
                logger.info(f"   📏 Distance: {suggestion.distance}")
                logger.info(f"   🆔 calendar_event_id existant: {suggestion.calendar_event_id}")

                suggestion_dict = {
                    'id': suggestion.id,
                    'scheduled_date': suggestion.scheduled_date,
                    'structure': suggestion.structure,
                    'workout_type': suggestion.workout_type,
                    'distance': suggestion.distance
                }

                if suggestion.calendar_event_id:
                    # Événement déjà synchronisé
                    logger.info(f"   ⏭️ Suggestion {suggestion.id} déjà synchronisée (UID: {suggestion.calendar_event_id})")
                    stats['skipped'] += 1
                else:
                    # Nouveau événement à créer
                    logger.info(f"   ➕ Création événement pour suggestion {suggestion.id}...")
                    calendar_uid = self.create_workout_event(suggestion_dict)
                    if calendar_uid:
                        logger.info(f"   ✅ Événement créé avec UID: {calendar_uid}")
                        suggestion.calendar_event_id = calendar_uid
                        db.commit()
                        logger.info(f"   💾 UID sauvegardé en base de données")
                        stats['created'] += 1
                    else:
                        logger.error(f"   ❌ Échec création événement pour suggestion {suggestion.id}")
                        stats['errors'] += 1

            except Exception as e:
                logger.error(f"❌ Erreur lors de la synchronisation de la suggestion {suggestion.id}: {e}")
                logger.exception(e)
                stats['errors'] += 1

        logger.info(f"🎯 Synchronisation terminée: {stats['created']} créés, {stats['skipped']} déjà présents, {stats['deleted']} supprimés, {stats['errors']} erreurs")
        return stats

    def update_planned_workout_event(self, workout_data: Dict, old_calendar_uid: Optional[str] = None) -> Optional[str]:
        """
        Met à jour ou crée un événement calendrier pour un PlannedWorkout

        Args:
            workout_data: Données du PlannedWorkout (id, scheduled_date, workout_type, distance_km, description, etc.)
            old_calendar_uid: UID de l'ancien événement à supprimer (si existe)

        Returns:
            UID du nouvel événement créé ou None en cas d'erreur
        """
        logger.info(f"🔧 update_planned_workout_event appelée pour workout ID: {workout_data.get('id')}")

        if not self._calendar:
            logger.error("❌ Calendrier non initialisé")
            return None

        try:
            # Supprimer l'ancien événement si UID fourni
            if old_calendar_uid:
                logger.info(f"🗑️ Suppression de l'ancien événement: {old_calendar_uid}")
                self.delete_workout_event(old_calendar_uid)

            # Créer le nouvel événement
            logger.info("📝 Création du nouvel événement iCalendar...")
            cal = iCalendar()
            cal.add('prodid', '-//Suivi Course//Training Block//FR')
            cal.add('version', '2.0')

            event = Event()

            # UID unique basé sur l'ID du PlannedWorkout
            event_uid = f"planned-workout-{workout_data['id']}@suivi-course.local"
            event.add('uid', event_uid)
            logger.info(f"🆔 UID généré: {event_uid}")

            # Extraire les informations
            workout_type = workout_data.get('workout_type', 'Course')
            distance_km = workout_data.get('distance_km', 0)
            title = workout_data.get('title', f'{workout_type.capitalize()} {distance_km}km')

            logger.info(f"🏃 Type: {workout_type}, Distance: {distance_km}km, Titre: {title}")

            # Titre de l'événement
            event.add('summary', f"🏃 {title}")

            # Description avec structure détaillée
            description = workout_data.get('description', '')
            if workout_data.get('target_pace_min') and workout_data.get('target_pace_max'):
                pace_min_str = f"{workout_data['target_pace_min'] // 60}:{workout_data['target_pace_min'] % 60:02d}"
                pace_max_str = f"{workout_data['target_pace_max'] // 60}:{workout_data['target_pace_max'] % 60:02d}"
                description = f"Allure cible: {pace_min_str}-{pace_max_str}/km\n\n{description}"

            event.add('description', description)

            # Date et heure
            scheduled_date = workout_data.get('scheduled_date')
            if isinstance(scheduled_date, str):
                scheduled_date = datetime.fromisoformat(scheduled_date.replace('Z', '+00:00'))

            # Définir l'heure à 07:00 par défaut pour les workouts
            start_time = scheduled_date.replace(hour=7, minute=0, second=0, microsecond=0)
            start_time = self.timezone.localize(start_time)

            # Durée estimée basée sur la distance (environ 6.5 min/km + échauffement/cooldown)
            duration_minutes = int(distance_km * 6.5) + 10 if distance_km else 45
            end_time = start_time + timedelta(minutes=duration_minutes)

            event.add('dtstart', start_time)
            event.add('dtend', end_time)
            event.add('dtstamp', datetime.now(self.timezone))

            # Localisation
            event.add('location', 'Course à pied')

            # Rappel 30 minutes avant
            alarm = Alarm()
            alarm.add('action', 'DISPLAY')
            alarm.add('trigger', timedelta(minutes=-30))
            alarm.add('description', f'Entraînement dans 30 minutes: {title}')
            event.add_component(alarm)

            # Ajouter l'événement au calendrier
            cal.add_component(event)

            logger.info("📤 Envoi de l'événement au calendrier iCloud...")
            self._calendar.save_event(cal.to_ical())

            logger.info(f"✅ Événement PlannedWorkout créé avec succès: {event_uid}")
            return event_uid

        except Exception as e:
            logger.error(f"❌ Erreur lors de la mise à jour de l'événement PlannedWorkout: {e}")
            logger.exception(e)
            return None

    def batch_sync_planned_workouts(self, workout_ids: List[int], db) -> Dict[str, int]:
        """
        Synchronise en batch plusieurs PlannedWorkouts modifiés avec iCloud Calendar

        Args:
            workout_ids: Liste des IDs de PlannedWorkout à synchroniser
            db: Session de base de données

        Returns:
            Dictionnaire avec les statistiques (updated, created, errors, skipped)
        """
        stats = {
            'updated': 0,
            'created': 0,
            'errors': 0,
            'skipped': 0
        }

        if not self._calendar:
            logger.error("❌ Calendrier non initialisé pour la synchronisation batch")
            return stats

        from models import PlannedWorkout

        logger.info(f"📊 Synchronisation batch de {len(workout_ids)} PlannedWorkouts...")

        for workout_id in workout_ids:
            try:
                # Récupérer le PlannedWorkout depuis la DB
                workout = db.query(PlannedWorkout).filter(PlannedWorkout.id == workout_id).first()

                if not workout:
                    logger.warning(f"⚠️ PlannedWorkout {workout_id} non trouvé")
                    stats['skipped'] += 1
                    continue

                # Ne synchroniser que les séances futures et non complétées
                if workout.scheduled_date < datetime.now() or workout.status == 'completed':
                    logger.info(f"⏭️ Workout {workout_id} ignoré (passé ou complété)")
                    stats['skipped'] += 1
                    continue

                # Préparer les données
                workout_data = {
                    'id': workout.id,
                    'scheduled_date': workout.scheduled_date,
                    'workout_type': workout.workout_type,
                    'distance_km': workout.distance_km or 0,
                    'duration_minutes': workout.duration_minutes,
                    'title': workout.title,
                    'description': workout.description,
                    'target_pace_min': workout.target_pace_min,
                    'target_pace_max': workout.target_pace_max
                }

                # Mettre à jour ou créer l'événement
                old_uid = workout.calendar_event_id
                new_uid = self.update_planned_workout_event(workout_data, old_uid)

                if new_uid:
                    # Sauvegarder le nouvel UID en DB
                    workout.calendar_event_id = new_uid
                    db.commit()

                    if old_uid:
                        stats['updated'] += 1
                        logger.info(f"✅ Workout {workout_id} mis à jour")
                    else:
                        stats['created'] += 1
                        logger.info(f"✅ Workout {workout_id} créé")
                else:
                    stats['errors'] += 1
                    logger.error(f"❌ Échec sync Workout {workout_id}")

            except Exception as e:
                logger.error(f"❌ Erreur lors de la sync du Workout {workout_id}: {e}")
                logger.exception(e)
                stats['errors'] += 1

        logger.info(
            f"🎯 Synchronisation batch terminée: "
            f"{stats['created']} créés, {stats['updated']} mis à jour, "
            f"{stats['skipped']} ignorés, {stats['errors']} erreurs"
        )

        return stats
