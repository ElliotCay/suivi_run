"""
Suggestions router for AI-powered workout recommendations.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel
import logging

from database import get_db
from models import User, Workout, Suggestion
from services.claude_service import (
    build_suggestion_prompt,
    build_week_prompt,
    call_claude_api,
    parse_suggestion_response
)
from services.calendar_service import create_ics_event, create_calendar_feed
from services.icloud_calendar_sync import iCloudCalendarSync, CalendarSyncError
from schemas import SuggestionResponse, SuggestionGenerateRequest

logger = logging.getLogger(__name__)

router = APIRouter()


class ScheduleSuggestionRequest(BaseModel):
    scheduled_date: str  # ISO format datetime string


@router.post("/suggestions/generate")
async def generate_suggestion(
    request: SuggestionGenerateRequest,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Generate AI-powered workout suggestion(s) via Claude."""

    # 1. Get user profile
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Get last 4 weeks of workouts
    four_weeks_ago = datetime.now() - timedelta(weeks=4)
    recent_workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= four_weeks_ago
    ).order_by(Workout.date.desc()).all()

    logger.info(f"Found {len(recent_workouts)} workouts in last 4 weeks")

    # 3. Build user dict with safe defaults
    user_dict = {
        'current_level': user.current_level or {},
        'weekly_volume': user.weekly_volume or 20.0,
        'injury_history': user.injury_history or [],
        'objectives': user.objectives or []
    }

    # 4. Generate week or single workout
    if request.generate_week:
        # Generate a complete week (3 workouts)
        prompt = build_week_prompt(user_dict, recent_workouts, program_week=2)
        response = call_claude_api(prompt, use_sonnet=request.use_sonnet)
        week_data = parse_suggestion_response(response["content"])

        # Create suggestions for each workout in the week
        suggestions = []
        for workout in week_data.get("workouts", []):
            new_suggestion = Suggestion(
                user_id=user_id,
                workout_type=workout.get("type", "facile"),
                distance=workout.get("distance_km"),
                pace_target=None,
                structure=workout,  # Store the workout object with day info
                reasoning=workout.get("raison"),
                model_used=response["model"],
                tokens_used=response["tokens"] // len(week_data.get("workouts", [])),  # Split tokens
                completed=0
            )
            db.add(new_suggestion)
            suggestions.append(new_suggestion)

        db.commit()
        for s in suggestions:
            db.refresh(s)

        logger.info(f"Created {len(suggestions)} suggestions for week")
        return {"week_description": week_data.get("week_description"), "suggestions": suggestions}

    else:
        # Generate single workout
        prompt = build_suggestion_prompt(
            user_dict,
            recent_workouts,
            program_week=2,
            workout_type=request.workout_type
        )

        response = call_claude_api(prompt, use_sonnet=request.use_sonnet)
        suggestion_data = parse_suggestion_response(response["content"])

        new_suggestion = Suggestion(
            user_id=user_id,
            workout_type=suggestion_data.get("type", "facile"),
            distance=suggestion_data.get("distance_km"),
            pace_target=None,
            structure=suggestion_data,
            reasoning=suggestion_data.get("raison"),
            model_used=response["model"],
            tokens_used=response["tokens"],
            completed=0
        )

        db.add(new_suggestion)
        db.commit()
        db.refresh(new_suggestion)

        logger.info(f"Created suggestion {new_suggestion.id}")
        return new_suggestion


@router.get("/suggestions", response_model=list[SuggestionResponse])
async def get_suggestions(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
    limit: int = 10
):
    """Get user's suggestion history."""
    suggestions = db.query(Suggestion).filter(
        Suggestion.user_id == user_id
    ).order_by(Suggestion.created_at.desc()).limit(limit).all()

    return suggestions


@router.patch("/suggestions/{suggestion_id}/complete", response_model=SuggestionResponse)
async def mark_suggestion_complete(
    suggestion_id: int,
    workout_id: int | None = None,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Mark a suggestion as completed."""
    suggestion = db.query(Suggestion).filter(
        Suggestion.id == suggestion_id,
        Suggestion.user_id == user_id
    ).first()

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    suggestion.completed = 1
    suggestion.completed_workout_id = workout_id

    db.commit()
    db.refresh(suggestion)

    return suggestion


@router.delete("/suggestions/{suggestion_id}")
async def delete_suggestion(
    suggestion_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Delete a suggestion."""
    suggestion = db.query(Suggestion).filter(
        Suggestion.id == suggestion_id,
        Suggestion.user_id == user_id
    ).first()

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    db.delete(suggestion)
    db.commit()

    return {"message": "Suggestion deleted successfully", "id": suggestion_id}


@router.patch("/suggestions/{suggestion_id}/schedule")
async def schedule_suggestion(
    suggestion_id: int,
    request: ScheduleSuggestionRequest,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Planifier une suggestion à une date/heure donnée."""
    suggestion = db.query(Suggestion).filter(
        Suggestion.id == suggestion_id,
        Suggestion.user_id == user_id
    ).first()

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    # Parser la date
    try:
        scheduled_date = datetime.fromisoformat(request.scheduled_date.replace('Z', '+00:00'))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format.")

    # Mettre à jour la suggestion
    suggestion.scheduled_date = scheduled_date
    db.commit()
    db.refresh(suggestion)

    logger.info(f"Suggestion {suggestion_id} scheduled for {scheduled_date}")

    return {
        "id": suggestion.id,
        "scheduled_date": suggestion.scheduled_date.isoformat(),
        "message": "Suggestion planifiée avec succès"
    }


@router.get("/suggestions/{suggestion_id}/calendar")
async def download_calendar_event(
    suggestion_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Télécharger le fichier .ics pour ajouter au calendrier."""
    suggestion = db.query(Suggestion).filter(
        Suggestion.id == suggestion_id,
        Suggestion.user_id == user_id
    ).first()

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    if not suggestion.scheduled_date:
        raise HTTPException(
            status_code=400,
            detail="Cette suggestion n'a pas de date planifiée. Planifiez-la d'abord."
        )

    # Construire le dict pour create_ics_event
    suggestion_dict = {
        'id': suggestion.id,
        'structure': suggestion.structure,
        'workout_type': suggestion.workout_type,
        'distance': suggestion.distance
    }

    # Créer le fichier .ics
    ics_content, event_uid = create_ics_event(suggestion_dict, suggestion.scheduled_date)

    # Sauvegarder l'event UID
    suggestion.calendar_event_id = event_uid
    db.commit()

    # Retourner le fichier .ics
    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename=workout-{suggestion.id}.ics"
        }
    )


@router.get("/calendar/feed.ics")
async def get_calendar_feed(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Génère un flux de calendrier iCal avec toutes les suggestions planifiées.
    URL pour abonnement: webcal://localhost:8000/api/calendar/feed.ics
    """
    # Récupérer toutes les suggestions planifiées (non complétées)
    suggestions = db.query(Suggestion).filter(
        Suggestion.user_id == user_id,
        Suggestion.scheduled_date.isnot(None),
        Suggestion.completed == 0
    ).all()

    # Convertir les suggestions en dicts
    suggestions_data = []
    for s in suggestions:
        suggestions_data.append({
            'id': s.id,
            'scheduled_date': s.scheduled_date,
            'structure': s.structure,
            'workout_type': s.workout_type,
            'distance': s.distance
        })

    # Générer le flux iCal
    ics_content = create_calendar_feed(suggestions_data)

    # Retourner le flux avec les bons headers pour l'abonnement
    return Response(
        content=ics_content,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": "inline; filename=suivi-course.ics",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.post("/calendar/sync")
async def sync_calendar(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Synchronise les suggestions planifiées avec iCloud Calendar via CalDAV.
    Crée automatiquement les événements dans le calendrier "Entraînements Course".
    """
    try:
        logger.info("🔄 === DÉBUT SYNCHRONISATION CALENDRIER ===")
        logger.info(f"👤 User ID: {user_id}")

        # Initialiser le service de synchronisation
        logger.info("🔧 Initialisation du service iCloudCalendarSync...")
        sync_service = iCloudCalendarSync()
        logger.info("✅ Service initialisé")

        # Se connecter à iCloud
        logger.info("🔐 Connexion à iCloud CalDAV...")
        if not sync_service.connect():
            logger.error("❌ Échec de connexion à iCloud")
            raise HTTPException(
                status_code=500,
                detail="Impossible de se connecter à iCloud Calendar. Vérifiez vos identifiants dans .env"
            )
        logger.info("✅ Connexion à iCloud réussie")

        # Récupérer les suggestions planifiées (non complétées)
        logger.info("🔍 Recherche des suggestions planifiées en base...")
        logger.info(f"   Critères: user_id={user_id}, scheduled_date IS NOT NULL, completed=0")

        suggestions = db.query(Suggestion).filter(
            Suggestion.user_id == user_id,
            Suggestion.scheduled_date.isnot(None),
            Suggestion.completed == 0
        ).all()

        logger.info(f"📊 {len(suggestions)} suggestion(s) planifiée(s) trouvée(s)")

        if not suggestions:
            logger.warning("⚠️ Aucune suggestion à synchroniser")
            return {
                "message": "Aucune séance à synchroniser",
                "stats": {"created": 0, "deleted": 0, "errors": 0, "skipped": 0}
            }

        # Afficher les détails des suggestions trouvées
        for i, sugg in enumerate(suggestions, 1):
            logger.info(f"   [{i}] ID={sugg.id}, Date={sugg.scheduled_date}, Type={sugg.workout_type}, Distance={sugg.distance}")

        # Synchroniser
        logger.info("🚀 Lancement de la synchronisation...")
        stats = sync_service.sync_suggestions(suggestions, db)
        logger.info(f"🎯 Résultat: {stats}")

        logger.info("🔄 === FIN SYNCHRONISATION CALENDRIER ===")

        return {
            "message": f"Synchronisation réussie ! {stats['created']} séance(s) ajoutée(s) au calendrier.",
            "stats": stats
        }

    except CalendarSyncError as e:
        logger.error(f"Erreur de synchronisation calendrier: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Erreur inattendue lors de la synchronisation: {e}")
        logger.exception(e)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la synchronisation: {str(e)}"
        )
