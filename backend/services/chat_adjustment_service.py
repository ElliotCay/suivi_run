"""
Chat Adjustment Service

Handles AI-powered conversational adjustments to training blocks.
Uses prompt caching for cost efficiency on multi-turn conversations.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_

import json
import logging

from models import (
    ChatConversation,
    ChatMessage,
    TrainingBlock,
    PlannedWorkout,
    WorkoutFeedback,
    User,
    Workout
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
      "action": "modify|delete|reschedule|create",
      "current": {
        "date": "2025-12-01",
        "type": "threshold",
        "distance_km": 10.0,
        "pace_target": "5:30-5:40/km"
      },
      "proposed": {
        "date": "2025-12-01",
        "type": "easy",
        "distance_km": 8.0,
        "pace_target": "6:00-6:15/km",
        "day_of_week": "lundi"
      },
      "reasoning": "Explication courte"
    }
  ]
}

TYPES DE SÉANCES VALIDES (utilise EXACTEMENT ces valeurs pour "type"):
- "easy" = endurance facile, allure conversationnelle
- "recovery" = récupération active, très facile
- "long" = sortie longue
- "threshold" = seuil/tempo, allure confortablement difficile
- "interval" = fractionné, VMA, intervalles

RÈGLES CRITIQUES :
- Pour "modify", "delete", "reschedule" : le "workout_id" DOIT être un entier valide correspondant à une séance existante (format: ID=123)
- Pour "create" : utilise "workout_id": null et fournis tous les détails dans "proposed"
- Pour "delete" : le champ "proposed" doit être null ou omis
- Modifie UNIQUEMENT les séances futures (date >= aujourd'hui)
- Ne touche JAMAIS aux séances déjà complétées (status="completed" ou emoji ✅)
- Actions possibles : "modify" (changer), "delete" (supprimer), "reschedule" (reporter), "create" (créer nouvelle séance)
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
        logger.info(f"📝 Parsed proposal data: {json.dumps(proposal_data, indent=2, ensure_ascii=False)[:500]}...")
    except Exception as e:
        logger.error(f"Failed to parse proposal: {e}")
        logger.error(f"Raw AI response: {response['content'][:1000]}")
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

    # Validate and normalize adjustments to match schema
    normalized_adjustments = []
    for idx, adj in enumerate(proposal_data.get("adjustments", [])):
        action = adj.get("action")

        # For "create" action, workout_id can be null
        if action == "create":
            if not all(key in adj for key in ["action", "proposed", "reasoning"]):
                logger.warning(f"⚠️ Skipping create adjustment {idx}: missing required fields. Keys present: {list(adj.keys())}")
                continue
            normalized_adj = {
                "workout_id": None,
                "action": "create",
                "current": None,
                "proposed": adj["proposed"],
                "reasoning": adj["reasoning"]
            }
            normalized_adjustments.append(normalized_adj)
            continue

        # For other actions, validate standard fields
        if not all(key in adj for key in ["workout_id", "action", "current", "reasoning"]):
            logger.warning(f"⚠️ Skipping adjustment {idx}: missing required fields. Keys present: {list(adj.keys())}")
            continue

        # Validate workout_id is a valid integer
        if not isinstance(adj["workout_id"], int) or adj["workout_id"] is None:
            logger.warning(f"⚠️ Skipping adjustment {idx}: invalid workout_id '{adj.get('workout_id')}' (type: {type(adj.get('workout_id'))})")
            continue

        # Normalize the adjustment
        normalized_adj = {
            "workout_id": adj["workout_id"],
            "action": adj["action"],
            "current": adj["current"],
            "proposed": adj.get("proposed", None),  # Can be None for delete actions
            "reasoning": adj["reasoning"]
        }
        normalized_adjustments.append(normalized_adj)

    logger.info(f"✅ Normalized {len(normalized_adjustments)}/{len(proposal_data.get('adjustments', []))} valid adjustments")

    return {
        "analysis": proposal_data.get("analysis", ""),
        "adjustments": normalized_adjustments,
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

        # Handle CREATE action separately
        if action == "create":
            if not proposed:
                logger.warning("Create action requires 'proposed' data, skipping")
                continue

            # Parse date
            try:
                scheduled_date = datetime.strptime(proposed["date"], "%Y-%m-%d")
            except (KeyError, ValueError) as e:
                logger.warning(f"Invalid date in create proposal: {e}, skipping")
                continue

            # Get the training block to calculate week number
            block = db.query(TrainingBlock).filter(
                TrainingBlock.id == conversation.block_id
            ).first()

            if not block:
                logger.warning(f"Block {conversation.block_id} not found, skipping create")
                continue

            # Calculate week number (1-4) within the block
            days_since_start = (scheduled_date - block.start_date).days
            week_number = (days_since_start // 7) + 1
            if week_number < 1:
                week_number = 1
            elif week_number > 4:
                week_number = 4

            # Parse pace if provided
            target_pace_min = None
            target_pace_max = None
            if "pace_target" in proposed and proposed["pace_target"]:
                pace_parts = proposed["pace_target"].split("-")
                if len(pace_parts) == 2:
                    target_pace_min = _pace_to_seconds(pace_parts[0].split("/")[0])
                    target_pace_max = _pace_to_seconds(pace_parts[1].split("/")[0])

            # Build description from structure if provided by AI
            description = None
            if "structure" in proposed:
                structure = proposed["structure"]
                warmup = structure.get("warmup", "")
                main = structure.get("main", "")
                cooldown = structure.get("cooldown", "")
                if warmup or main or cooldown:
                    description = f"Échauffement: {warmup}\nCorps de séance: {main}\nRetour au calme: {cooldown}"

            # Create new workout
            # Normalize workout type
            normalized_type = _normalize_workout_type(proposed.get("type", "easy"))

            # Get French label for title
            type_label = _get_french_type_label(normalized_type)
            distance = proposed.get("distance_km", 5.0)

            new_workout = PlannedWorkout(
                user_id=conversation.user_id,
                block_id=conversation.block_id,
                week_number=week_number,
                scheduled_date=scheduled_date,
                day_of_week=proposed.get("day_of_week") or _get_french_day_name(scheduled_date.weekday()),
                workout_type=normalized_type,
                distance_km=distance,
                target_pace_min=target_pace_min,
                target_pace_max=target_pace_max,
                title=f"{type_label} {distance}km",
                description=description,
                status="pending"
            )
            db.add(new_workout)
            db.flush()  # Get the ID
            modified_workout_ids.append(new_workout.id)
            applied_count += 1
            logger.info(f"Created new workout {new_workout.id} on {proposed['date']}")
            continue

        # For other actions, get the existing workout
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
                # Normalize workout type to expected values
                workout.workout_type = _normalize_workout_type(proposed["type"])
            if "distance_km" in proposed:
                workout.distance_km = proposed["distance_km"]
            if "pace_target" in proposed and proposed["pace_target"]:
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
            new_type = _normalize_workout_type(proposed.get("type", workout.workout_type))
            new_distance = proposed.get("distance_km", workout.distance_km)

            # Get French label for title
            type_label = _get_french_type_label(new_type)
            workout.title = f"{type_label} {new_distance}km"

            # If workout type changed, regenerate description
            if "type" in proposed:
                old_type = workout.workout_type
                # Check if the normalized type is different from the old type
                if new_type != old_type:
                    workout.description = _generate_description_for_type(
                        workout_type=new_type,
                        distance_km=new_distance,
                        target_pace_min=workout.target_pace_min,
                        target_pace_max=workout.target_pace_max
                    )

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
    - Completed Strava/Apple Health workouts
    - Feedback history
    - Adjustment rules
    """
    user = db.query(User).filter(User.id == conversation.user_id).first()
    block = db.query(TrainingBlock).filter(TrainingBlock.id == conversation.block_id).first()

    # Get workouts in scope with completed workout and feedback preloaded
    workouts = db.query(PlannedWorkout).options(
        joinedload(PlannedWorkout.completed_workout),
        joinedload(PlannedWorkout.feedback)
    ).filter(
        and_(
            PlannedWorkout.block_id == conversation.block_id,
            PlannedWorkout.scheduled_date >= conversation.scope_start_date,
            PlannedWorkout.scheduled_date <= conversation.scope_end_date
        )
    ).order_by(PlannedWorkout.scheduled_date.asc()).all()

    # Get completed Strava/Apple Health workouts since block start
    completed_workouts = db.query(Workout).filter(
        and_(
            Workout.user_id == conversation.user_id,
            Workout.date >= block.start_date
        )
    ).order_by(Workout.date.asc()).all()

    # Format planned workouts
    workouts_context = _format_sessions_context(db, workouts)

    # Format completed Strava workouts
    strava_context = _format_strava_workouts(completed_workouts)

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

SÉANCES PLANIFIÉES DANS LE PÉRIMÈTRE:
{workouts_context}

SÉANCES RÉELLEMENT EFFECTUÉES (depuis Strava/Apple Health):
{strava_context}

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
3. Expliquer clairement la raison de chaque modification suggérée
4. Encourager et rassurer l'utilisateur

IMPORTANT - TON STYLE DE COMMUNICATION:
- Sois conversationnel, empathique et TRÈS concis
- Utilise le tutoiement et un ton direct
- **LIMITE ABSOLUE : 2-3 phrases maximum par réponse** (sauf si vraiment nécessaire)
- Pose 1-2 questions ciblées à la fois
- Parle TOUJOURS en langage naturel, jamais en format technique ou JSON
- N'utilise PAS de gras pour mettre en valeur des phrases entières, seulement pour des mots-clés
- Utilise des listes à puces simples, PAS de titres markdown (# ## ###)
- Pas d'emojis, pas d'introduction longue, pas de reformulation
- Va droit au but immédiatement
- Exemple: "Comment te sens-tu aujourd'hui ? As-tu encore mal aux genoux ?"

Note: Les ajustements techniques seront générés automatiquement, concentre-toi sur l'essentiel."""

    return system_prompt


def _format_strava_workouts(workouts: List[Workout]) -> str:
    """
    Format completed Strava/Apple Health workouts for context in prompt.
    Returns a JSON-formatted string with all workout details including comments.
    """
    if not workouts:
        logger.info("ℹ️ No Strava/Apple Health workouts found")
        return "Aucune séance Strava/Apple Health enregistrée pour cette période."

    logger.info(f"🏃 Formatting {len(workouts)} Strava/Apple Health workouts")

    workouts_data = []

    for workout in workouts:
        workout_dict = {
            "date": workout.date.strftime('%Y-%m-%d'),
            "distance_km": round(workout.distance, 2) if workout.distance else 0,
            "duration_minutes": round(workout.duration / 60, 1) if workout.duration else 0,
            "avg_pace_per_km": f"{int(workout.avg_pace // 60)}:{int(workout.avg_pace % 60):02d}" if workout.avg_pace else "N/A",
            "avg_hr": workout.avg_hr,
            "max_hr": workout.max_hr,
            "workout_type": workout.workout_type or "non défini",
            "source": workout.source or "unknown",
            "notes": workout.notes or ""
        }

        workouts_data.append(workout_dict)

        # Log each workout with comment
        if workout.notes:
            logger.info(f"  💬 {workout.date.strftime('%Y-%m-%d')}: {workout.distance:.1f}km - Commentaire: '{workout.notes[:80]}{'...' if len(workout.notes) > 80 else ''}'")
        else:
            logger.info(f"  📝 {workout.date.strftime('%Y-%m-%d')}: {workout.distance:.1f}km - Pas de commentaire")

    # Format as pretty JSON for the AI
    json_str = json.dumps(workouts_data, indent=2, ensure_ascii=False)

    logger.info(f"✅ Formatted {len(workouts_data)} Strava workouts into JSON context")
    logger.info(f"📊 JSON Preview:\n{json_str[:500]}...")

    return f"```json\n{json_str}\n```"


def _format_sessions_context(db: Session, workouts: List[PlannedWorkout]) -> str:
    """Format workouts for context in prompt."""
    lines = []
    today = datetime.now()

    logger.info(f"🔍 Formatting context for {len(workouts)} workouts")

    completed_count = sum(1 for w in workouts if w.completed_workout)
    logger.info(f"📊 Found {completed_count} workouts with completed_workout")

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
                logger.info(f"  📝 Workout {workout.id}: Found feedback with {len(feedback_parts)} fields")

        # Get Strava/workout comment if completed and available
        if workout.completed_workout:
            logger.info(f"  🔗 Workout {workout.id}: Has completed_workout (ID: {workout.completed_workout.id})")
            if workout.completed_workout.notes:
                strava_comment = workout.completed_workout.notes.strip()
                if strava_comment:
                    logger.info(f"  💬 Workout {workout.id}: Found Strava comment: '{strava_comment[:50]}{'...' if len(strava_comment) > 50 else ''}'")
                    if feedback_text:
                        feedback_text += f" | Commentaire Strava: {strava_comment}"
                    else:
                        feedback_text = f" | Commentaire Strava: {strava_comment}"
                else:
                    logger.info(f"  ⚠️ Workout {workout.id}: notes exists but is empty")
            else:
                logger.info(f"  ℹ️ Workout {workout.id}: No notes in completed_workout")
        else:
            logger.debug(f"  ⏭️ Workout {workout.id}: No completed_workout (status: {workout.status})")

        lines.append(
            f"{status_emoji} ID={workout.id} | {workout.scheduled_date.strftime('%d/%m/%Y')} ({workout.day_of_week}) | "
            f"{workout.workout_type.upper()} | {workout.distance_km}km | "
            f"Allure: {_seconds_to_pace(workout.target_pace_min)}-{_seconds_to_pace(workout.target_pace_max)}/km | "
            f"Status: {workout.status}{feedback_text}"
        )

    logger.info(f"✅ Context formatted with {len(lines)} workout lines")
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


def _normalize_workout_type(workout_type: str) -> str:
    """
    Normalize workout type to one of the valid values expected by the app.
    Handles French variants and common synonyms.

    Valid values: easy, recovery, long, threshold, interval
    """
    if not workout_type:
        return "easy"

    type_lower = workout_type.lower().strip()

    # Mapping of variants to canonical values
    type_mapping = {
        # Easy variants
        "easy": "easy",
        "facile": "easy",
        "endurance": "easy",
        "footing": "easy",
        # Recovery variants
        "recovery": "recovery",
        "récupération": "recovery",
        "recuperation": "recovery",
        # Long run variants
        "long": "long",
        "longue": "long",
        "sortie longue": "long",
        "long run": "long",
        # Threshold variants
        "threshold": "threshold",
        "tempo": "threshold",
        "seuil": "threshold",
        "allure seuil": "threshold",
        # Interval variants
        "interval": "interval",
        "intervals": "interval",
        "fractionné": "interval",
        "fractionne": "interval",
        "vma": "interval",
        "vo2max": "interval",
        "speed": "interval",
    }

    return type_mapping.get(type_lower, "easy")


def _get_french_type_label(workout_type: str) -> str:
    """
    Get French display label for workout type.
    """
    labels = {
        "easy": "Facile",
        "recovery": "Récupération",
        "long": "Sortie longue",
        "threshold": "Tempo",
        "interval": "Fractionné",
    }
    return labels.get(workout_type.lower(), workout_type.capitalize())


def _generate_description_for_type(
    workout_type: str,
    distance_km: float,
    target_pace_min: int = None,
    target_pace_max: int = None
) -> str:
    """
    Generate a default description when workout type changes.
    This ensures the description matches the new workout type.
    """
    def pace_str(pace_sec: int) -> str:
        if not pace_sec:
            return "6:00"
        return f"{pace_sec // 60}:{pace_sec % 60:02d}"

    pace_range = ""
    if target_pace_min and target_pace_max:
        pace_range = f"{pace_str(target_pace_min)}-{pace_str(target_pace_max)}/km"

    workout_type_lower = workout_type.lower()

    if workout_type_lower in ["easy", "facile"]:
        return f"""**Endurance fondamentale - {distance_km:.1f}km**

Allure : {pace_range or "allure conversationnelle"}
Durée estimée : ~{int(distance_km * 6)} min

Structure :
- 10 min échauffement progressif
- {max(1, distance_km - 2):.1f}km à allure facile stable
- 5 min retour au calme

Notes : Vous devez pouvoir tenir une conversation complète. Si vous êtes essoufflé, ralentissez !"""

    elif workout_type_lower in ["recovery", "récupération"]:
        return f"""**Course de récupération - {distance_km:.1f}km**

Allure : {pace_range or "très facile"}

Structure :
- Allure ultra-facile pendant toute la durée
- Dès que vous sentez de la fatigue, arrêtez

Notes : L'objectif est la récupération active, pas la performance."""

    elif workout_type_lower in ["long", "longue"]:
        return f"""**Sortie longue - {distance_km:.1f}km**

Allure : {pace_range or "facile"}

Structure :
- 10 min échauffement très progressif
- {max(1, distance_km - 3):.1f}km à allure facile constante
- 2km derniers km à allure marathon si vous vous sentez bien
- 5 min retour au calme

Notes : Gérez votre effort, l'objectif est la distance pas la vitesse."""

    elif workout_type_lower in ["threshold", "tempo", "seuil"]:
        tempo_km = max(3, round(distance_km * 0.4, 1))
        return f"""**Séance au seuil lactique - {distance_km:.1f}km total**

Allure seuil : {pace_range}

Structure :
- 2km échauffement facile
- {tempo_km}km au seuil (allure "confortablement difficile")
- 1-2km retour au calme facile

Notes : Allure que vous pourriez tenir 45-60 min. Respirez de manière contrôlée."""

    elif workout_type_lower in ["interval", "fractionné", "vma"]:
        return f"""**Séance VO2max - Fractionné**

Allure intervalle : {pace_range or "allure 5K"}

Structure :
- 2km échauffement + 4-6 foulées
- Intervalles à allure 5K
  - Récupération : 2-3 min jogging entre chaque
- 1-2km retour au calme

Notes : Concentrez-vous sur la régularité des intervalles. Ne partez pas trop vite !"""

    else:
        return f"""**Séance de course - {distance_km:.1f}km**

Allure : {pace_range or "à adapter selon les sensations"}

Notes : Écoutez vos sensations et adaptez l'intensité."""
