"""
Block Generation Chat Service

Handles AI-powered conversational block generation.
Uses prompt caching for cost efficiency on multi-turn conversations.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

import json
import logging

from models import (
    ChatConversation,
    ChatMessage,
    User,
    UserPreferences,
    Workout,
    TrainingZone,
    InjuryHistory
)
from services.claude_service import call_claude_with_caching, parse_suggestion_response, normalize_workout_type

logger = logging.getLogger(__name__)

# Maximum messages per conversation
MAX_MESSAGES_PER_CONVERSATION = 15
SOFT_LIMIT_WARNING = 12


def create_block_generation_conversation(
    db: Session,
    user_id: int,
) -> ChatConversation:
    """
    Create a new chat conversation for block generation.

    Args:
        db: Database session
        user_id: User ID

    Returns:
        ChatConversation instance
    """
    # Calculate scope dates (last 4 weeks of training)
    scope_end_date = datetime.now()
    scope_start_date = scope_end_date - timedelta(weeks=4)

    # Create conversation with a special marker for block generation
    conversation = ChatConversation(
        user_id=user_id,
        block_id=None,  # No block yet - we're creating one
        scope_mode="block_generation",
        scope_start_date=scope_start_date,
        scope_end_date=scope_end_date,
        state="active",
        total_tokens=0
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    logger.info(
        f"Created block generation conversation {conversation.id} for user {user_id}"
    )

    return conversation


def get_initial_questions(
    db: Session,
    conversation_id: int
) -> Dict[str, any]:
    """
    Generate initial questions from AI to understand user's current state and goals.

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
    system_prompt = _build_generation_system_prompt(db, conversation)

    # Initial prompt to get AI questions
    initial_user_prompt = """Commence cette conversation en me posant 2-3 questions pour comprendre comment créer le meilleur bloc d'entraînement pour moi. Pose des questions sur :
- Comment je me sens en ce moment (fatigue, forme, motivation)
- Mes objectifs pour les 4 prochaines semaines (maintenir la forme, progresser, préparer une course)
- Mes disponibilités et contraintes éventuelles

Sois empathique et direct."""

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
    system_prompt = _build_generation_system_prompt(db, conversation)

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


def propose_block_parameters(
    db: Session,
    conversation_id: int
) -> Dict[str, any]:
    """
    Request AI to propose block parameters based on conversation.

    Args:
        db: Database session
        conversation_id: Conversation ID

    Returns:
        dict with proposed block parameters
    """
    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id
    ).first()

    if not conversation:
        raise ValueError(f"Conversation {conversation_id} not found")

    # Get user preferences
    user_prefs = db.query(UserPreferences).filter(
        UserPreferences.user_id == conversation.user_id
    ).first()

    preferred_days = user_prefs.preferred_days if user_prefs else ["monday", "wednesday", "saturday"]
    preferred_time = user_prefs.preferred_time if user_prefs else "18:00"

    # Get all messages
    all_messages = db.query(ChatMessage).filter(
        ChatMessage.conversation_id == conversation_id
    ).order_by(ChatMessage.created_at.asc()).all()

    messages = [
        {"role": msg.role, "content": msg.content}
        for msg in all_messages
    ]

    # French day names mapping
    day_names_fr = {
        "monday": "Lundi",
        "tuesday": "Mardi",
        "wednesday": "Mercredi",
        "thursday": "Jeudi",
        "friday": "Vendredi",
        "saturday": "Samedi",
        "sunday": "Dimanche"
    }
    preferred_days_fr = [day_names_fr.get(d, d) for d in preferred_days]

    # Add request for proposal
    proposal_request = f"""Maintenant que tu as toutes les informations, propose-moi un bloc d'entraînement de 4 semaines.

PRÉFÉRENCES UTILISATEUR À RESPECTER:
- Jours préférés: {", ".join(preferred_days_fr)}
- Heure préférée: {preferred_time}
- Nombre de séances/semaine: {len(preferred_days)} (basé sur les jours préférés)

Réponds UNIQUEMENT en format JSON strict (sans markdown) avec cette structure exacte:
{{
  "analysis": "Analyse de mes besoins en 2-3 phrases basée sur notre conversation",
  "block_parameters": {{
    "phase": "base|development|peak",
    "days_per_week": 3,
    "target_weekly_volume_km": 25.0,
    "easy_percentage": 75,
    "threshold_percentage": 15,
    "interval_percentage": 10,
    "add_recovery_sunday": true,
    "reasoning": "Explication du choix de ces paramètres"
  }},
  "weekly_structure": [
    {{
      "day": "Lundi",
      "type": "easy",
      "distance_km": 8.0,
      "description_courte": "Endurance fondamentale"
    }},
    {{
      "day": "Mercredi",
      "type": "threshold",
      "distance_km": 7.0,
      "description_courte": "Tempo au seuil"
    }},
    {{
      "day": "Samedi",
      "type": "long",
      "distance_km": 12.0,
      "description_courte": "Sortie longue"
    }}
  ],
  "special_recommendations": [
    "Recommandation personnalisée 1",
    "Recommandation personnalisée 2"
  ]
}}

TYPES DE SÉANCES VALIDES:
- "easy" = endurance facile
- "recovery" = récupération active
- "long" = sortie longue
- "threshold" = seuil/tempo
- "interval" = fractionné/VMA

RÈGLES:
- Respecte les jours préférés de l'utilisateur
- Le volume doit être adapté à mon historique récent
- Si j'ai mentionné des douleurs ou de la fatigue, sois conservateur
- Phase "base" si débutant ou reprise, "development" si progression, "peak" si préparation intense
"""

    messages.append({"role": "user", "content": proposal_request})

    # Build system prompt
    system_prompt = _build_generation_system_prompt(db, conversation)

    # Call Claude
    response = call_claude_with_caching(
        system_prompt=system_prompt,
        messages=messages,
        use_cache=True,
        use_sonnet=True,
        max_tokens=4096
    )

    # Parse JSON response
    try:
        proposal_data = parse_suggestion_response(response["content"])
        logger.info(f"Parsed block proposal: {json.dumps(proposal_data, indent=2, ensure_ascii=False)[:500]}...")
    except Exception as e:
        logger.error(f"Failed to parse proposal: {e}")
        logger.error(f"Raw AI response: {response['content'][:1000]}")
        raise ValueError("AI returned invalid proposal format")

    # Normalize workout types in weekly structure
    if "weekly_structure" in proposal_data:
        for session in proposal_data["weekly_structure"]:
            if "type" in session:
                session["type"] = normalize_workout_type(session["type"])

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
        f"Generated block proposal for conversation {conversation_id}"
    )

    return {
        "analysis": proposal_data.get("analysis", ""),
        "block_parameters": proposal_data.get("block_parameters", {}),
        "weekly_structure": proposal_data.get("weekly_structure", []),
        "special_recommendations": proposal_data.get("special_recommendations", []),
        "tokens_used": conversation.total_tokens,
        "preferred_days": preferred_days,
        "preferred_time": preferred_time
    }


def validate_and_generate_block(
    db: Session,
    conversation_id: int,
    start_date: Optional[datetime] = None
) -> Dict[str, any]:
    """
    Generate the training block after user validation.

    Args:
        db: Database session
        conversation_id: Conversation ID
        start_date: Optional start date (defaults to next Monday)

    Returns:
        dict with generated block info
    """
    from services.training_block_generator import generate_4_week_block

    conversation = db.query(ChatConversation).filter(
        ChatConversation.id == conversation_id
    ).first()

    if not conversation:
        raise ValueError(f"Conversation {conversation_id} not found")

    if conversation.state != "proposal_ready":
        raise ValueError("No proposal ready to validate")

    if not conversation.proposed_changes:
        raise ValueError("No proposed changes found")

    proposal = conversation.proposed_changes
    block_params = proposal.get("block_parameters", {})

    # Calculate start date if not provided
    # Start tomorrow by default (flexible start), block will end on a Sunday
    if not start_date:
        today = datetime.now()
        start_date = today + timedelta(days=1)  # Start tomorrow
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

    # Get user preferences for time
    user_prefs = db.query(UserPreferences).filter(
        UserPreferences.user_id == conversation.user_id
    ).first()

    preferred_days = user_prefs.preferred_days if user_prefs else None
    preferred_time = user_prefs.preferred_time if user_prefs else "18:00"

    # Generate the block
    try:
        block = generate_4_week_block(
            db=db,
            user_id=conversation.user_id,
            phase=block_params.get("phase", "base"),
            days_per_week=block_params.get("days_per_week", 3),
            start_date=start_date,
            target_volume=block_params.get("target_weekly_volume_km"),
            use_ai_descriptions=True,
            use_sonnet=False,  # Use Haiku for descriptions to save cost
            add_recovery_sunday=block_params.get("add_recovery_sunday", False),
            preferred_days=preferred_days,
            preferred_time=preferred_time
        )

        # Update conversation state
        conversation.block_id = block.id
        conversation.state = "validated"
        conversation.updated_at = datetime.utcnow()
        db.commit()

        logger.info(
            f"Generated block {block.id} from conversation {conversation_id}"
        )

        return {
            "block_id": block.id,
            "block_name": block.name,
            "phase": block.phase,
            "start_date": block.start_date.isoformat(),
            "end_date": block.end_date.isoformat(),
            "days_per_week": block.days_per_week,
            "target_weekly_volume": block.target_weekly_volume,
            "total_workouts": len(block.planned_workouts),
            "conversation_id": conversation_id
        }

    except Exception as e:
        logger.error(f"Failed to generate block: {e}")
        raise ValueError(f"Failed to generate block: {str(e)}")


def _build_generation_system_prompt(db: Session, conversation: ChatConversation) -> str:
    """
    Build the system prompt with context for block generation.
    """
    user = db.query(User).filter(User.id == conversation.user_id).first()

    # Get recent workouts (last 4 weeks)
    recent_workouts = db.query(Workout).filter(
        and_(
            Workout.user_id == conversation.user_id,
            Workout.date >= conversation.scope_start_date
        )
    ).order_by(Workout.date.desc()).limit(20).all()

    # Get training zones
    zones = db.query(TrainingZone).filter(
        and_(
            TrainingZone.user_id == conversation.user_id,
            TrainingZone.is_current == True
        )
    ).first()

    # Get injuries
    injuries = db.query(InjuryHistory).filter(
        InjuryHistory.user_id == conversation.user_id,
        InjuryHistory.status.in_(["active", "monitoring"])
    ).all()

    # Get user preferences
    user_prefs = db.query(UserPreferences).filter(
        UserPreferences.user_id == conversation.user_id
    ).first()

    # Format recent workouts
    workouts_context = _format_recent_workouts(recent_workouts)

    # Format injuries
    injuries_context = _format_injuries(injuries)

    # Format preferences
    prefs_context = _format_preferences(user_prefs)

    # Calculate recent volume
    recent_volume = sum(w.distance or 0 for w in recent_workouts if w.date >= datetime.now() - timedelta(weeks=4))
    weekly_avg = recent_volume / 4 if recent_volume > 0 else 0

    system_prompt = f"""Tu es un coach running expert et bienveillant. Tu aides l'utilisateur à créer un nouveau bloc d'entraînement de 4 semaines personnalisé.

PROFIL UTILISATEUR:
- Nom: {user.name if user else 'Utilisateur'}
- Niveau: {user.level if user and user.level else 'intermédiaire'}
- FC Max: {user.fcmax if user and user.fcmax else 'non définie'} bpm
- VMA: {user.vma if user and user.vma else 'non définie'} km/h
{f"- VDOT: {zones.vdot:.1f}" if zones else ""}

PRÉFÉRENCES D'ENTRAÎNEMENT:
{prefs_context}

HISTORIQUE RÉCENT (4 dernières semaines):
{workouts_context}
Volume total: {recent_volume:.1f}km | Moyenne: {weekly_avg:.1f}km/semaine

BLESSURES/DOULEURS:
{injuries_context}

TON RÔLE DANS CETTE CONVERSATION:
1. Poser des questions pour comprendre l'état actuel et les objectifs
2. Écouter les retours sur fatigue, douleurs, disponibilités
3. Proposer un bloc adapté aux besoins et au niveau
4. Être empathique mais direct

IMPORTANT - TON STYLE DE COMMUNICATION:
- Sois conversationnel, empathique et TRÈS concis
- Utilise le tutoiement et un ton direct
- **LIMITE ABSOLUE : 2-3 phrases maximum par réponse**
- Pose 1-2 questions ciblées à la fois
- Parle TOUJOURS en langage naturel, jamais en format technique ou JSON
- Pas d'emojis, pas d'introduction longue
- Va droit au but immédiatement
- Exemple: "Comment te sens-tu en ce moment ? As-tu des douleurs ou une fatigue particulière ?"

RÈGLES DE GÉNÉRATION DE BLOC:
1. Respecter les jours préférés de l'utilisateur
2. Ne pas dépasser +10% de volume par rapport à la moyenne récente
3. Si blessure active: réduire le volume et l'intensité
4. Phase "base" par défaut si pas d'objectif précis
5. Toujours inclure au moins 1 jour de repos entre les runs"""

    return system_prompt


def _format_recent_workouts(workouts: List[Workout]) -> str:
    """Format recent workouts for context."""
    if not workouts:
        return "Aucune séance récente trouvée."

    lines = []
    for w in workouts[:10]:  # Limit to 10 most recent
        date_str = w.date.strftime("%d/%m")
        distance = f"{w.distance:.1f}km" if w.distance else "?"
        pace = ""
        if w.avg_pace:
            pace_min = int(w.avg_pace // 60)
            pace_sec = int(w.avg_pace % 60)
            pace = f" à {pace_min}:{pace_sec:02d}/km"

        line = f"- {date_str}: {distance}{pace}"

        # Add user comment if present
        if w.notes:
            comment = w.notes[:100] + "..." if len(w.notes) > 100 else w.notes
            line += f" | 💬 \"{comment}\""

        lines.append(line)

    return "\n".join(lines)


def _format_injuries(injuries: List[InjuryHistory]) -> str:
    """Format injuries for context."""
    if not injuries:
        return "Aucune blessure active ou en surveillance."

    lines = []
    for injury in injuries:
        status = "🔴 Active" if injury.status == "active" else "🟡 Surveillance"
        recurring = f" (récurrente x{injury.recurrence_count})" if injury.recurrence_count > 0 else ""
        lines.append(f"- {injury.injury_type} ({injury.location}) - {status}{recurring}")

    return "\n".join(lines)


def _format_preferences(user_prefs: Optional[UserPreferences]) -> str:
    """Format user preferences for context."""
    if not user_prefs:
        return "- Jours préférés: Non définis (par défaut: lundi, mercredi, samedi)\n- Heure préférée: 18:00"

    day_names_fr = {
        "monday": "Lundi",
        "tuesday": "Mardi",
        "wednesday": "Mercredi",
        "thursday": "Jeudi",
        "friday": "Vendredi",
        "saturday": "Samedi",
        "sunday": "Dimanche"
    }

    preferred_days = user_prefs.preferred_days or ["monday", "wednesday", "saturday"]
    days_str = ", ".join([day_names_fr.get(d, d) for d in preferred_days])
    time_str = user_prefs.preferred_time or "18:00"

    return f"- Jours préférés: {days_str}\n- Heure préférée: {time_str}"
