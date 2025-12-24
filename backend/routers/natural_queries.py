"""
Natural Language Queries Router

API endpoints pour les requêtes en langage naturel sur la base de données.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
import logging

from database import get_db
from services import natural_query_service
from schemas import QueryRequest, QueryResponse

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/queries",
    tags=["natural-queries"]
)


@router.post("/ask", response_model=QueryResponse)
def ask_natural_query(
    request: QueryRequest,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Traite une question en langage naturel et retourne les résultats.

    Args:
        request: {"message": str, "conversation_history": List[dict]}
        db: Session de base de données
        user_id: ID de l'utilisateur (from auth)

    Returns:
        {
            "response": str,  # Réponse en français
            "results": dict,  # Données structurées
            "sql_query": str,  # SQL généré (optionnel)
            "tokens_used": int,
            "is_cached": bool
        }
    """
    try:
        # Extraire les paramètres du request Pydantic
        message = request.message.strip()
        conversation_history = request.conversation_history

        logger.info(f"Processing natural query from user {user_id}: {message[:50]}...")

        # Traiter la requête via le service
        result = natural_query_service.process_natural_query(
            user_message=message,
            conversation_history=conversation_history,
            db=db,
            user_id=user_id
        )

        logger.info(
            f"Query processed: cached={result['is_cached']}, "
            f"tokens={result['tokens_used']}, "
            f"has_results={result['results'] is not None}"
        )

        return result

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error processing natural query: {e}")
        logger.exception(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Une erreur est survenue lors du traitement de votre question"
        )


@router.get("/examples")
def get_query_examples():
    """
    Retourne des exemples de questions que l'utilisateur peut poser.

    Returns:
        Liste d'exemples de questions
    """
    examples = [
        {
            "category": "Records personnels",
            "queries": [
                "Mes PRs cette année",
                "Quel est mon meilleur temps sur 5km ?",
                "Tous mes records personnels",
                "Quand ai-je battu mon dernier PR ?"
            ]
        },
        {
            "category": "Volume d'entraînement",
            "queries": [
                "Mon volume total ce mois",
                "Est-ce que je cours plus qu'en novembre ?",
                "Combien de km cette semaine ?",
                "Mon volume moyen par semaine depuis 3 mois"
            ]
        },
        {
            "category": "Progression et allure",
            "queries": [
                "Ma progression d'allure ces 3 mois",
                "Est-ce que je m'améliore ?",
                "Mon allure moyenne en décembre",
                "Comparaison de mes allures novembre vs décembre"
            ]
        },
        {
            "category": "Séances spécifiques",
            "queries": [
                "Mes séances tempo ce mois",
                "Toutes mes sorties longues depuis janvier",
                "Dernières séances de fractionné",
                "Séances faciles de la semaine dernière"
            ]
        },
        {
            "category": "Statistiques",
            "queries": [
                "Combien de séances cette année ?",
                "Ma fréquence cardiaque moyenne",
                "Mes séances les plus longues",
                "Séances avec plus de 10km"
            ]
        }
    ]

    return {"examples": examples}
