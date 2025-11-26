"""
Test Data Router - Crée des données fictives pour tester le chat AI
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict

from database import get_db
from models import TrainingBlock, PlannedWorkout, User

import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/test",
    tags=["test-data"]
)


@router.post("/setup-training-block")
def setup_test_training_block(
    db: Session = Depends(get_db),
    user_id: int = 1
) -> Dict:
    """
    Crée un bloc d'entraînement de test avec des séances fictives.

    Returns:
        Dict avec block_id et nombre de workouts créés
    """

    try:
        # Vérifier/créer l'utilisateur de test
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            # Vérifier si l'email existe déjà
            existing_email_user = db.query(User).filter(User.email == "test@example.com").first()
            if existing_email_user:
                # Utiliser cet utilisateur existant
                user_id = existing_email_user.id
                user = existing_email_user
                logger.info(f"Utilisateur existant trouvé avec email test: {user.id}")
            else:
                # Créer un utilisateur de test
                user = User(
                    name="Test User",
                    email="test@example.com",
                    level="intermediate",
                    fcmax=190,
                    vma=16.0
                )
                db.add(user)
                db.flush()
                user_id = user.id
                db.commit()
                logger.info(f"Utilisateur de test créé: {user.id}")

        # Vérifier si un bloc de test existe déjà
        existing_block = db.query(TrainingBlock).filter(
            TrainingBlock.user_id == user_id,
            TrainingBlock.name == "🧪 BLOC TEST - Chat AI"
        ).first()

        if existing_block:
            logger.info(f"Bloc de test existant trouvé: {existing_block.id}")
            return {
                "block_id": existing_block.id,
                "workouts_count": len(existing_block.planned_workouts),
                "message": "Bloc de test existant réutilisé"
            }

        # Créer un nouveau bloc de test
        today = datetime.now()
        block_start = today - timedelta(days=14)  # Commence il y a 2 semaines
        block_end = today + timedelta(days=14)    # Finis dans 2 semaines

        test_block = TrainingBlock(
            user_id=user_id,
            name="🧪 BLOC TEST - Chat AI",
            phase="build",
            start_date=block_start,
            end_date=block_end,
            days_per_week=4,
            target_weekly_volume=50.0,
            easy_percentage=70,
            threshold_percentage=20,
            interval_percentage=10,
            status="active"
        )

        db.add(test_block)
        db.flush()  # Pour obtenir l'ID

        # Créer des séances fictives
        workouts_data = [
            # Semaine -2 (passée)
            {"day_offset": -13, "type": "Endurance Fondamentale", "distance": 10, "pace_min": 330, "pace_max": 360, "status": "completed"},
            {"day_offset": -11, "type": "Fractionné Court", "distance": 8, "pace_min": 240, "pace_max": 270, "status": "completed"},
            {"day_offset": -9, "type": "Sortie Longue", "distance": 16, "pace_min": 330, "pace_max": 360, "status": "completed"},

            # Semaine -1 (passée)
            {"day_offset": -6, "type": "Endurance Fondamentale", "distance": 12, "pace_min": 330, "pace_max": 360, "status": "completed"},
            {"day_offset": -4, "type": "Tempo Run", "distance": 10, "pace_min": 270, "pace_max": 300, "status": "completed"},
            {"day_offset": -2, "type": "Sortie Longue", "distance": 18, "pace_min": 330, "pace_max": 360, "status": "completed"},

            # Semaine actuelle (futures)
            {"day_offset": 1, "type": "Endurance Fondamentale", "distance": 10, "pace_min": 330, "pace_max": 360, "status": "scheduled"},
            {"day_offset": 3, "type": "Fractionné Long", "distance": 12, "pace_min": 240, "pace_max": 270, "status": "scheduled"},
            {"day_offset": 5, "type": "Endurance Fondamentale", "distance": 8, "pace_min": 330, "pace_max": 360, "status": "scheduled"},
            {"day_offset": 7, "type": "Sortie Longue", "distance": 20, "pace_min": 330, "pace_max": 360, "status": "scheduled"},

            # Semaine +1 (futures)
            {"day_offset": 8, "type": "Récupération", "distance": 6, "pace_min": 360, "pace_max": 390, "status": "scheduled"},
            {"day_offset": 10, "type": "Tempo Run", "distance": 12, "pace_min": 270, "pace_max": 300, "status": "scheduled"},
            {"day_offset": 12, "type": "Fractionné Court", "distance": 10, "pace_min": 240, "pace_max": 270, "status": "scheduled"},
            {"day_offset": 14, "type": "Sortie Longue", "distance": 22, "pace_min": 330, "pace_max": 360, "status": "scheduled"},
        ]

        created_workouts = []

        # Mapping pour les jours de la semaine en français
        days_fr = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

        for idx, workout_data in enumerate(workouts_data, start=1):
            scheduled_date = today + timedelta(days=workout_data["day_offset"])

            # Générer la structure de séance
            if workout_data["type"] == "Fractionné Court":
                structure = {
                    "warmup": "15min échauffement",
                    "main": "8x400m R:1'30\"",
                    "cooldown": "10min retour au calme"
                }
                description = "Séance de fractionné court pour développer la VMA"
            elif workout_data["type"] == "Fractionné Long":
                structure = {
                    "warmup": "20min échauffement",
                    "main": "4x2000m R:2'",
                    "cooldown": "10min retour au calme"
                }
                description = "Séance de fractionné long pour le seuil"
            elif workout_data["type"] == "Tempo Run":
                structure = {
                    "warmup": "15min échauffement",
                    "main": "30min au seuil",
                    "cooldown": "10min retour au calme"
                }
                description = "Tempo run au seuil anaérobie"
            elif workout_data["type"] == "Sortie Longue":
                structure = {
                    "warmup": "10min progression",
                    "main": f"{workout_data['distance']-2}km allure marathon",
                    "cooldown": "Finish tranquille"
                }
                description = "Sortie longue pour l'endurance fondamentale"
            else:  # Endurance Fondamentale / Récupération
                structure = {
                    "warmup": "5min progression",
                    "main": f"{workout_data['distance']-1}km EF",
                    "cooldown": "5min cool down"
                }
                description = "Course en endurance fondamentale"

            workout = PlannedWorkout(
                block_id=test_block.id,
                user_id=user_id,
                scheduled_date=scheduled_date,
                week_number=(workout_data["day_offset"] + 14) // 7 + 1,
                day_of_week=days_fr[scheduled_date.weekday()],
                workout_type=workout_data["type"],
                distance_km=workout_data["distance"],
                target_pace_min=workout_data["pace_min"],
                target_pace_max=workout_data["pace_max"],
                title=f"{workout_data['type']} {workout_data['distance']}km",
                description=description,
                structure=structure,
                status=workout_data["status"]
            )

            db.add(workout)
            created_workouts.append(workout)

        db.commit()

        logger.info(
            f"✅ Bloc de test créé: {test_block.id} avec {len(created_workouts)} séances"
        )

        return {
            "block_id": test_block.id,
            "workouts_count": len(created_workouts),
            "message": "Bloc de test créé avec succès",
            "block_name": test_block.name,
            "start_date": test_block.start_date.isoformat(),
            "end_date": test_block.end_date.isoformat()
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors de la création du bloc de test: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Échec de la création du bloc de test: {str(e)}"
        )


@router.delete("/cleanup-test-data")
def cleanup_test_data(
    db: Session = Depends(get_db),
    user_id: int = 1
) -> Dict:
    """
    Supprime tous les blocs de test et leurs données associées.

    Returns:
        Dict avec nombre d'éléments supprimés
    """

    try:
        # Trouver tous les blocs de test
        test_blocks = db.query(TrainingBlock).filter(
            TrainingBlock.user_id == user_id,
            TrainingBlock.name.like("🧪 BLOC TEST%")
        ).all()

        if not test_blocks:
            return {
                "blocks_deleted": 0,
                "workouts_deleted": 0,
                "conversations_deleted": 0,
                "message": "Aucune donnée de test à supprimer"
            }

        blocks_count = len(test_blocks)
        workouts_count = 0
        conversations_count = 0

        from models import ChatConversation

        for block in test_blocks:
            # Compter les workouts
            workouts_count += len(block.planned_workouts)

            # Compter et supprimer les conversations liées
            conversations = db.query(ChatConversation).filter(
                ChatConversation.block_id == block.id
            ).all()
            conversations_count += len(conversations)

            for conv in conversations:
                db.delete(conv)

            # La suppression du bloc supprimera automatiquement les workouts (cascade)
            db.delete(block)

        db.commit()

        logger.info(
            f"🗑️ Nettoyage effectué: {blocks_count} blocs, "
            f"{workouts_count} workouts, {conversations_count} conversations"
        )

        return {
            "blocks_deleted": blocks_count,
            "workouts_deleted": workouts_count,
            "conversations_deleted": conversations_count,
            "message": "Données de test supprimées avec succès"
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Erreur lors du nettoyage: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Échec du nettoyage: {str(e)}"
        )
