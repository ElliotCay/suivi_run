"""
Service for managing AI context to maintain conversation continuity and coherence.
"""

from sqlalchemy.orm import Session
from models import AIContext
from datetime import datetime
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


def get_or_create_context(db: Session, user_id: int) -> AIContext:
    """Get existing AI context or create a new one for the user."""
    context = db.query(AIContext).filter(AIContext.user_id == user_id).first()

    if not context:
        context = AIContext(
            user_id=user_id,
            current_phase="base",
            total_ai_calls=0
        )
        db.add(context)
        db.commit()
        db.refresh(context)
        logger.info(f"Created new AI context for user {user_id}")

    return context


def update_context(
    db: Session,
    user_id: int,
    updates: Dict[str, Any]
) -> AIContext:
    """
    Update AI context fields.

    Args:
        db: Database session
        user_id: User ID
        updates: Dictionary of field names and values to update

    Returns:
        Updated AIContext object
    """
    context = get_or_create_context(db, user_id)

    # Update fields from dictionary
    for field, value in updates.items():
        if hasattr(context, field):
            setattr(context, field, value)
        else:
            logger.warning(f"Attempted to update unknown field: {field}")

    context.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(context)

    logger.info(f"Updated AI context for user {user_id}: {list(updates.keys())}")
    return context


def increment_ai_call_count(db: Session, user_id: int) -> None:
    """Increment the AI call counter and update last call timestamp."""
    context = get_or_create_context(db, user_id)
    context.total_ai_calls += 1
    context.last_ai_call = datetime.utcnow()
    context.updated_at = datetime.utcnow()
    db.commit()


def get_context_for_prompt(db: Session, user_id: int) -> str:
    """
    Generate a formatted context string to inject into AI prompts.

    Returns:
        Formatted string with relevant context information
    """
    context = get_or_create_context(db, user_id)

    context_parts = []

    # Training phase
    if context.current_phase:
        context_parts.append(f"Phase actuelle : {context.current_phase}")

    # Current goal
    if context.current_goal:
        context_parts.append(f"Objectif : {context.current_goal}")

    # Last recommendation
    if context.last_recommendation:
        context_parts.append(f"Dernière recommandation : {context.last_recommendation}")

    # Readiness score
    if context.readiness_score is not None:
        context_parts.append(f"Score de forme : {context.readiness_score}/100")

    # Fatigue level
    if context.fatigue_level:
        context_parts.append(f"Niveau de fatigue : {context.fatigue_level}")

    # Training load
    if context.training_load_ratio is not None:
        context_parts.append(f"Ratio de charge : {context.training_load_ratio:.2f}")

    # Weekly volume
    if context.weekly_volume_km is not None:
        context_parts.append(f"Volume hebdo : {context.weekly_volume_km:.1f} km")

    # Recent hard session
    if context.last_hard_session_date:
        days_ago = (datetime.utcnow() - context.last_hard_session_date).days
        context_parts.append(f"Dernière séance intense : il y a {days_ago} jour(s)")

    # Recent long run
    if context.last_long_run_date:
        days_ago = (datetime.utcnow() - context.last_long_run_date).days
        context_parts.append(f"Dernière sortie longue : il y a {days_ago} jour(s)")

    # Injury concern
    if context.recent_injury_concern:
        context_parts.append(f"Préoccupation blessure : {context.recent_injury_concern}")

    if not context_parts:
        return "Aucun contexte précédent."

    return "\n".join([f"- {part}" for part in context_parts])


def update_after_suggestion(
    db: Session,
    user_id: int,
    suggestion: str,
    readiness_score: Optional[int] = None,
    training_load_ratio: Optional[float] = None,
    weekly_volume_km: Optional[float] = None
) -> None:
    """
    Update context after generating a suggestion.

    Args:
        db: Database session
        user_id: User ID
        suggestion: The suggestion text that was generated
        readiness_score: Current readiness score
        training_load_ratio: Current training load ratio
        weekly_volume_km: Current weekly volume
    """
    updates = {
        "last_recommendation": suggestion[:500],  # Store truncated version
    }

    if readiness_score is not None:
        updates["readiness_score"] = readiness_score

    if training_load_ratio is not None:
        updates["training_load_ratio"] = training_load_ratio

    if weekly_volume_km is not None:
        updates["weekly_volume_km"] = weekly_volume_km

    update_context(db, user_id, updates)
    increment_ai_call_count(db, user_id)
