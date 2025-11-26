"""
Chat Adjustment Service

Handles AI-powered conversational adjustments to training blocks.
Uses prompt caching for cost efficiency on multi-turn conversations.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

import json
import logging

from models import (
    ChatConversation,
    ChatMessage,
    TrainingBlock,
    PlannedWorkout,
    WorkoutFeedback,
    User
)
from services.claude_service import call_claude_with_caching, parse_suggestion_response

logger = logging.getLogger(__name__)

# Maximum messages per conversation to control costs
MAX_MESSAGES_PER_CONVERSATION = 20
SOFT_LIMIT_WARNING = 15


def create_conversation(
    db: Session,
    user_id: int,
    block_id: int,
    scope_mode: str = "block_start"
) -> ChatConversation:
    """
    Create a new chat conversation for block adjustments.

    Args:
        db: Database session
        user_id: User ID
        block_id: Training block ID
        scope_mode: "block_start" (all sessions from block start) or "rolling_4weeks" (last 4 weeks)

    Returns:
        ChatConversation instance
    """
    # Get the training block
    block = db.query(TrainingBlock).filter(TrainingBlock.id == block_id).first()
    if not block:
        raise ValueError(f"Training block {block_id} not found")

    if block.user_id != user_id:
        raise ValueError("Block does not belong to user")

    # Calculate scope dates
    if scope_mode == "block_start":
        scope_start_date = block.start_date
        scope_end_date = block.end_date
    elif scope_mode == "rolling_4weeks":
        scope_end_date = datetime.now()
        scope_start_date = scope_end_date - timedelta(weeks=4)
    else:
        raise ValueError("Invalid scope_mode. Must be 'block_start' or 'rolling_4weeks'")

    # Create conversation
    conversation = ChatConversation(
        user_id=user_id,
        block_id=block_id,
        scope_mode=scope_mode,
        scope_start_date=scope_start_date,
        scope_end_date=scope_end_date,
        state="active",
        total_tokens=0
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    logger.info(
        f"Created conversation {conversation.id} for user {user_id}, "
        f"block {block_id}, scope={scope_mode}"
    )

    return conversation


def get_ai_initial_questions(
    db: Session,
    conversation_id: int
) -> Dict[str, any]:
    """
    Generate initial questions from AI to understand user's feelings and needs.

    Args:
        db: Database session
        conversation_id: Conversation ID

    Returns:
        dict with AI's initial message
    """
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id
    ).first()

    if not conversation:
        raise ValueError(f"Conversation {conversation_id} not found")

    # Build system prompt with context (to be cached)
    system_prompt = _build_cached_system_prompt(db, conversation)

    # Initial user message to trigger AI questions
    initial_user_prompt = """Commence cette conversation en me posant 2-3 questions sur mes ressentis actuels pour comprendre comment adapter mon entraînement. Pose des questions sur :
- Ma fatigue générale
- D'éventuelles douleurs ou inconforts
- Mon niveau de motivation
- Comment je me sens par rapport à la charge d'entraînement

Sois empathique et encourage-moi à partager mes ressentis."""

    messages = [
        {"role": "user", "content": initial_user_prompt}
    ]

    # Call Claude with caching
    response = call_claude_with_caching(
        system_prompt=system_prompt,
        messages=messages,
        use_cache=True,
        use_sonnet=True
    )

    # Save assistant message
    ai_message = ChatMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=response["content"],
        is_cached=response.get("is_cached", False),
        cache_creation_tokens=response.get("cache_creation_input_tokens", 0),
        cache_read_tokens=response.get("cache_read_input_tokens", 0)
    )
    db.add(ai_message)

    # Update conversation tokens
    conversation.total_tokens += (
        response["input_tokens"] +
        response["output_tokens"]
    )
    db.commit()
    db.refresh(ai_message)

    logger.info(
        f"Generated initial questions for conversation {conversation_id}, "
        f"tokens: {response['input_tokens']} input, {response['output_tokens']} output"
    )

    return {
        "message_id": ai_message.id,
        "content": ai_message.content,
        "tokens_used": conversation.total_tokens,
        "is_cached": ai_message.is_cached
    }


def send_message(
    db: Session,
    conversation_id: int,
    user_message: str
) -> Dict[str, any]:
    """
    Send a user message and get AI response.

    Args:
        db: Database session
        conversation_id: Conversation ID
        user_message: User's message content

    Returns:
        dict with AI's response
    """
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id
    ).first()

    if not conversation:
        raise ValueError(f"Conversation {conversation_id} not found")

    if conversation.state not in ["active", "proposal_ready"]:
        raise ValueError(f"Conversation is {conversation.state}, cannot send messages")

    # Check message limit
    message_count = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id
    ).count()

    if message_count >= MAX_MESSAGES_PER_CONVERSATION:
        raise ValueError(
            f"Conversation has reached maximum message limit ({MAX_MESSAGES_PER_CONVERSATION}). "
            "Please finalize or create a new conversation."
        )

    # Save user message
    user_msg = ChatMessage(
        conversation_id=conversation_id,
        role="user",
        content=user_message
    )
    db.add(user_msg)
    db.commit()

    # Build message history for API call
    all_messages = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id
    ).order_by(ChatMessage.created_at.asc()).all()

    messages = [
        {"role": msg.role, "content": msg.content}
        for msg in all_messages
    ]

    # Build system prompt (will be cached)
    system_prompt = _build_cached_system_prompt(db, conversation)

    # Call Claude with caching
    response = call_claude_with_caching(
        system_prompt=system_prompt,
        messages=messages,
        use_cache=True,
        use_sonnet=True
    )

    # Save assistant message
    ai_message = ChatMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=response["content"],
        is_cached=response.get("is_cached", False),
        cache_creation_tokens=response.get("cache_creation_input_tokens", 0),
        cache_read_tokens=response.get("cache_read_input_tokens", 0)
    )
    db.add(ai_message)

    # Update conversation tokens
    conversation.total_tokens += (
        response["input_tokens"] +
        response["output_tokens"]
    )
    conversation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(ai_message)

    # Check if approaching limit
    approaching_limit = (message_count + 2) >= SOFT_LIMIT_WARNING

    logger.info(
        f"Sent message in conversation {conversation_id}, "
        f"tokens: {response['input_tokens']} input, {response['output_tokens']} output, "
        f"cached: {response['is_cached']}"
    )

    return {
        "message_id": ai_message.id,
        "content": ai_message.content,
        "tokens_used": conversation.total_tokens,
        "is_cached": ai_message.is_cached,
        "message_count": message_count + 2,
        "approaching_limit": approaching_limit,
        "max_messages": MAX_MESSAGES_PER_CONVERSATION
    }


def propose_adjustments(
    db: Session,
    conversation_id: int
) -> Dict[str, any]:
    """
    Request AI to propose workout adjustments based on conversation.

    Args:
        db: Database session
        conversation_id: Conversation ID

    Returns:
        dict with proposed adjustments
    """
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id
    ).first()

    if not conversation:
        raise ValueError(f"Conversation {conversation_id} not found")

    # Get all messages
    all_messages = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id
    ).order_by(ChatMessage.created_at.asc()).all()

    messages = [
        {"role": msg.role, "content": msg.content}
        for msg in all_messages
    ]

    # Add request for proposal
    proposal_request = """Maintenant que tu as toutes les informations sur mes ressentis, propose-moi des ajustements concrets pour mes prochaines séances.

Réponds UNIQUEMENT en format JSON strict (sans markdown) avec cette structure exacte :
{
  "analysis": "Analyse de mes ressentis en 2-3 phrases",
  "adjustments": [
    {
      "workout_id": 123,
      "action": "modify|delete|reschedule",
      "current": {
        "date": "2025-12-01",
        "type": "tempo",
        "distance_km": 10.0,
        "pace_target": "5:30-5:40/km",
        "structure": {
          "warmup": "description",
          "main": "description",
          "cooldown": "description"
        }
      },
      "proposed": {
        "date": "2025-12-01",
        "type": "easy",
        "distance_km": 8.0,
        "pace_target": "6:00-6:15/km",
        "structure": {
          "warmup": "description",
          "main": "description",
          "cooldown": "description"
        }
      },
      "reasoning": "Explication courte"
    }
  ]
}

Important :
- Modifie UNIQUEMENT les séances futures (date >= aujourd'hui)
- Ne touche JAMAIS aux séances déjà complétées
- L'action peut être : "modify" (changer distance/type/allure), "delete" (supprimer), "reschedule" (reporter)
"""

    messages.append({"role": "user", "content": proposal_request})

    # Build system prompt
    system_prompt = _build_cached_system_prompt(db, conversation)

    # Call Claude
    response = call_claude_with_caching(
        system_prompt=system_prompt,
        messages=messages,
        use_cache=True,
        use_sonnet=True,
        max_tokens=4096  # Longer response for detailed proposals
    )

    # Parse JSON response
    try:
        proposal_data = parse_suggestion_response(response["content"])
    except Exception as e:
        logger.error(f"Failed to parse proposal: {e}")
        raise ValueError("AI returned invalid proposal format")

    # Save proposal to conversation
    conversation.proposed_changes = proposal_data
    conversation.state = "proposal_ready"
    conversation.total_tokens += (
        response["input_tokens"] +
        response["output_tokens"]
    )
    conversation.updated_at = datetime.utcnow()
    db.commit()

    logger.info(
        f"Generated proposal for conversation {conversation_id}, "
        f"{len(proposal_data.get('adjustments', []))} adjustments proposed"
    )

    return {
        "analysis": proposal_data.get("analysis", ""),
        "adjustments": proposal_data.get("adjustments", []),
        "tokens_used": conversation.total_tokens
    }


def validate_and_apply(
    db: Session,
    conversation_id: int
) -> Dict[str, any]:
    """
    Apply the proposed adjustments after user validation.

    Args:
        db: Database session
        conversation_id: Conversation ID

    Returns:
        dict with applied changes summary
    """
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id
    ).first()

    if not conversation:
        raise ValueError(f"Conversation {conversation_id} not found")

    if conversation.state != "proposal_ready":
        raise ValueError("No proposal ready to apply")

    if not conversation.proposed_changes:
        raise ValueError("No proposed changes found")

    # Apply each adjustment
    adjustments = conversation.proposed_changes.get("adjustments", [])
    applied_count = 0
    modified_workout_ids = []

    for adjustment in adjustments:
        workout_id = adjustment.get("workout_id")
        action = adjustment.get("action")
        proposed = adjustment.get("proposed", {})

        # Get the workout
        workout = db.query(PlannedWorkout).filter(
            PlannedWorkout.id == workout_id
        ).first()

        if not workout:
            logger.warning(f"Workout {workout_id} not found, skipping")
            continue

        # Safety check: don't modify completed workouts
        if workout.status == "completed":
            logger.warning(f"Workout {workout_id} is completed, skipping")
            continue

        # Safety check: don't modify past workouts
        if workout.scheduled_date < datetime.now():
            logger.warning(f"Workout {workout_id} is in the past, skipping")
            continue

        # Apply action
        if action == "delete":
            db.delete(workout)
            logger.info(f"Deleted workout {workout_id}")
        elif action == "modify":
            # Update workout fields
            if "type" in proposed:
                workout.workout_type = proposed["type"]
            if "distance_km" in proposed:
                workout.distance_km = proposed["distance_km"]
            if "pace_target" in proposed:
                pace_parts = proposed["pace_target"].split("-")
                if len(pace_parts) == 2:
                    # Convert "5:30" to seconds
                    min_pace = _pace_to_seconds(pace_parts[0].split("/")[0])
                    max_pace = _pace_to_seconds(pace_parts[1].split("/")[0])
                    workout.target_pace_min = min_pace
                    workout.target_pace_max = max_pace
            if "structure" in proposed:
                structure = proposed["structure"]
                warmup = structure.get("warmup", "")
                main = structure.get("main", "")
                cooldown = structure.get("cooldown", "")
                workout.description = f"Échauffement: {warmup}\nCorps de séance: {main}\nRetour au calme: {cooldown}"

            # Update title based on new type and distance
            new_type = proposed.get("type", workout.workout_type)
            new_distance = proposed.get("distance_km", workout.distance_km)
            workout.title = f"{new_type} {new_distance}km"

            modified_workout_ids.append(workout_id)
            logger.info(f"Modified workout {workout_id}")
        elif action == "reschedule":
            if "date" in proposed:
                new_date = datetime.strptime(proposed["date"], "%Y-%m-%d")
                workout.scheduled_date = new_date
                workout.day_of_week = _get_french_day_name(new_date.weekday())
                workout.status = "rescheduled"
                modified_workout_ids.append(workout_id)
                logger.info(f"Rescheduled workout {workout_id} to {proposed['date']}")

        applied_count += 1

    # Update conversation state
    conversation.state = "validated"
    conversation.updated_at = datetime.utcnow()
    db.commit()

    logger.info(
        f"Applied {applied_count} adjustments for conversation {conversation_id}"
    )

    return {
        "applied_count": applied_count,
        "modified_workout_ids": modified_workout_ids,
        "conversation_id": conversation_id
    }


def _build_cached_system_prompt(db: Session, conversation: ChatConversation) -> str:
    """
    Build the system prompt with context to be cached.

    This prompt contains all static information that won't change during the conversation:
    - User profile
    - Training zones
    - Workout sessions in scope
    - Feedback history
    - Adjustment rules
    """
    user = db.query(User).filter(User.id == conversation.user_id).first()
    block = db.query(TrainingBlock).filter(TrainingBlock.id == conversation.block_id).first()

    # Get workouts in scope
    workouts = db.query(PlannedWorkout).filter(
        and_(
            PlannedWorkout.block_id == conversation.block_id,
            PlannedWorkout.scheduled_date >= conversation.scope_start_date,
            PlannedWorkout.scheduled_date <= conversation.scope_end_date
        )
    ).order_by(PlannedWorkout.scheduled_date.asc()).all()

    # Format workouts
    workouts_context = _format_sessions_context(db, workouts)

    # Build system prompt
    system_prompt = f"""Tu es un coach running expert et bienveillant, spécialisé dans la prévention des blessures et l'adaptation de plans d'entraînement.

PROFIL UTILISATEUR:
- Nom: {user.name}
- Niveau: {user.level or 'intermédiaire'}
- FC Max: {user.fcmax or 'non définie'} bpm
- VMA: {user.vma or 'non définie'} km/h

BLOC D'ENTRAÎNEMENT ACTUEL:
- Nom: {block.name}
- Phase: {block.phase}
- Période: {block.start_date.strftime('%d/%m/%Y')} → {block.end_date.strftime('%d/%m/%Y')}
- Fréquence: {block.days_per_week} jours/semaine
- Volume cible: {block.target_weekly_volume} km/semaine
- Distribution intensité: {block.easy_percentage}% facile, {block.threshold_percentage}% seuil, {block.interval_percentage}% VMA

SÉANCES DANS LE PÉRIMÈTRE DE CETTE CONVERSATION:
{workouts_context}

RÈGLES D'AJUSTEMENT ABSOLUES:
1. NE JAMAIS modifier une séance déjà complétée (status='completed')
2. NE JAMAIS modifier une séance passée (date < aujourd'hui)
3. Toujours privilégier la prudence et la prévention des blessures
4. Respecter au moins 1 jour de repos entre les runs
5. Si douleur importante: réduire volume ET intensité
6. Si fatigue accumulée: proposer une semaine de récupération
7. Maximum +10% de progression de volume par semaine
8. Les séances de renforcement sont importantes pour prévenir les blessures

TON RÔLE DANS CETTE CONVERSATION:
1. Poser des questions empathiques pour comprendre les ressentis de l'utilisateur
2. Écouter attentivement ses retours sur fatigue, douleurs, motivation
3. Proposer des ajustements pertinents et sécuritaires
4. Expliquer clairement la raison de chaque modification
5. Encourager et rassurer l'utilisateur

IMPORTANT:
- Sois conversationnel et empathique dans tes réponses
- Utilise le tutoiement
- Pose 2-3 questions à la fois maximum
- Quand l'utilisateur te demande de proposer des ajustements, réponds en JSON strict"""

    return system_prompt


def _format_sessions_context(db: Session, workouts: List[PlannedWorkout]) -> str:
    """Format workouts for context in prompt."""
    lines = []
    today = datetime.now()

    for workout in workouts:
        is_past = workout.scheduled_date < today
        status_emoji = "✅" if workout.status == "completed" else ("🔒" if is_past else "📅")

        # Get feedback if available
        feedback_text = ""
        if workout.feedback:
            fb = workout.feedback
            feedback_parts = []
            if fb.rpe:
                feedback_parts.append(f"RPE: {fb.rpe}/10")
            if fb.difficulty:
                feedback_parts.append(f"Difficulté: {fb.difficulty}")
            if fb.pain_locations:
                feedback_parts.append(f"Douleurs: {', '.join(fb.pain_locations)}")
            if fb.comment:
                feedback_parts.append(f"Commentaire: {fb.comment}")
            if feedback_parts:
                feedback_text = f" | Feedback: {'; '.join(feedback_parts)}"

        lines.append(
            f"{status_emoji} ID={workout.id} | {workout.scheduled_date.strftime('%d/%m/%Y')} ({workout.day_of_week}) | "
            f"{workout.workout_type.upper()} | {workout.distance_km}km | "
            f"Allure: {_seconds_to_pace(workout.target_pace_min)}-{_seconds_to_pace(workout.target_pace_max)}/km | "
            f"Status: {workout.status}{feedback_text}"
        )

    return "\n".join(lines)


def _pace_to_seconds(pace_str: str) -> int:
    """Convert pace string '5:30' to seconds per km."""
    parts = pace_str.strip().split(":")
    if len(parts) != 2:
        return 360  # Default 6:00/km
    minutes = int(parts[0])
    seconds = int(parts[1])
    return minutes * 60 + seconds


def _seconds_to_pace(seconds: int) -> str:
    """Convert seconds per km to pace string '5:30'."""
    if not seconds:
        return "6:00"
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}:{secs:02d}"


def _get_french_day_name(weekday: int) -> str:
    """Get French day name from weekday number (0=Monday)."""
    days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    return days[weekday]
