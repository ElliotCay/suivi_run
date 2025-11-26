"""
Claude AI service for generating workout suggestions.
"""

from anthropic import Anthropic
import logging
import json
from typing import Dict, List, Any

from config import ANTHROPIC_API_KEY

logger = logging.getLogger(__name__)

# Lazy initialization of Anthropic client
_client = None

def _get_client():
    """Get or create Anthropic client."""
    global _client
    if _client is None:
        if not ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not configured in .env file")
        _client = Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client


def build_suggestion_prompt(
    user_profile: Dict,
    recent_workouts: List,
    program_week: int = 2,
    workout_type: str = None,
    ai_context: str = None
) -> str:
    """
    Build prompt for workout suggestion.

    Args:
        user_profile: User profile dictionary
        recent_workouts: List of recent workouts (last 4 weeks)
        program_week: Current week in 8-week program
        workout_type: Specific workout type to generate (facile, tempo, fractionne, longue) or None for auto
        ai_context: Optional AI context string for conversation continuity

    Returns:
        Formatted prompt for Claude
    """
    # Format workout history
    workout_lines = []
    for w in recent_workouts[:20]:  # Limit to last 20 workouts
        date_str = w.date.strftime("%Y-%m-%d")
        duration_min = w.duration // 60 if w.duration else 0
        workout_lines.append(
            f"- {date_str}: {w.distance:.1f}km en {duration_min}min, "
            f"FC moy {w.avg_hr or 'N/A'} bpm, Type: {w.workout_type or 'non défini'}"
        )

    history_text = "\n".join(workout_lines) if workout_lines else "Aucune séance récente"

    # Current level info (handle None or non-dict values)
    current_level = user_profile.get('current_level')
    if not isinstance(current_level, dict):
        current_level = {}
    easy_pace = current_level.get('easy_pace', '6:00/km')
    tempo_pace = current_level.get('tempo_pace', '5:30/km')

    # Weekly volume
    volume = user_profile.get('weekly_volume', 23)

    # AI context section (if provided)
    context_section = ""
    if ai_context:
        context_section = f"""
CONTEXTE IA (continuité des recommandations):
{ai_context}

"""

    prompt = f"""Tu es un coach running spécialisé dans la prévention des blessures.
{context_section}
PROFIL UTILISATEUR:
- Niveau actuel: Sortie longue 10km confortables
- Allure facile: {easy_pace}
- Allure tempo: {tempo_pace}
- Volume hebdo cible: {volume} km
- Blessure récente: Syndrome essuie-glace (SORTI de blessure, meilleur ressenti jamais eu)
- Objectif principal: Semi-marathon mars-avril 2026
- Programme: Semaine {program_week}/8 - Phase consolidation post-blessure

RÈGLES D'ENTRAÎNEMENT:
- Max 10% progression volume/semaine
- Toujours 1 jour repos entre runs
- Semaine récupération toutes les 3-4 semaines
- 3 sorties/semaine (Lundi facile, Jeudi qualité, Dimanche longue)
- Varier les types: facile, tempo, fractionné, longue

HISTORIQUE 4 DERNIÈRES SEMAINES:
{history_text}

QUESTION:
{f"Suggère-moi une séance de type {workout_type} pour optimiser ma progression tout en restant prudent avec ma sortie de blessure." if workout_type else "Que me suggères-tu comme prochaine séance pour optimiser ma progression tout en restant prudent avec ma sortie de blessure ?"}

RÉPONDS EN FORMAT JSON STRICT (sans markdown):
{{
  "type": "facile|tempo|fractionne|longue",
  "distance_km": 8.5,
  "allure_cible": "6:00/km",
  "structure": "Échauffement: description courte\nCorps de séance: description courte\nRetour au calme: description courte",
  "raison": "Première raison courte et précise\nDeuxième raison courte et précise\nTroisième raison courte et précise"
}}

RÈGLES STRICTES POUR LE FORMAT:
1. "structure" DOIT contenir EXACTEMENT 3 lignes séparées par \n :
   - Ligne 1 commence par "Échauffement:" puis description
   - Ligne 2 commence par "Corps de séance:" puis description
   - Ligne 3 commence par "Retour au calme:" puis description

2. "raison" DOIT contenir 3 à 5 phrases courtes, chacune sur une ligne séparée par \n
   - Chaque phrase = une raison distincte et concise
   - PAS de numéros, PAS de tirets dans le JSON
   - Juste des phrases séparées par \n

EXEMPLE EXACT:
{{
  "type": "facile",
  "distance_km": 7.0,
  "allure_cible": "6:00-6:15/km",
  "structure": "Échauffement: 10 minutes de marche dynamique et mobilisations articulaires\nCorps de séance: 5km en allure facile conversationnelle, FC sous 170 bpm\nRetour au calme: 5 minutes de marche légère suivies d'étirements doux",
  "raison": "Stabiliser le volume avant d'introduire de la qualité\nSurveiller le ressenti post-syndrome essuie-glace\nPréparer le terrain pour une séance qualité jeudi\nPrévention prime sur la performance à ce stade"
}}
"""

    return prompt


def call_claude_api(prompt: str, use_sonnet: bool = True) -> Dict[str, Any]:
    """
    Call Claude API and return suggestion.

    Args:
        prompt: Formatted prompt
        use_sonnet: True for Sonnet 4.5, False for Haiku 4.5

    Returns:
        dict with content, model, and tokens
    """
    model = "claude-sonnet-4-5-20250929" if use_sonnet else "claude-haiku-4-5-20251001"

    try:
        client = _get_client()
        response = client.messages.create(
            model=model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )

        content = response.content[0].text
        tokens = response.usage.input_tokens + response.usage.output_tokens

        logger.info(f"Claude API call: {model}, {tokens} tokens")

        return {
            "content": content,
            "model": model,
            "tokens": tokens
        }

    except Exception as e:
        logger.error(f"Claude API error: {e}")
        raise


def call_claude_with_caching(
    system_prompt: str,
    messages: List[Dict[str, str]],
    use_cache: bool = True,
    use_sonnet: bool = True,
    max_tokens: int = 2048
) -> Dict[str, Any]:
    """
    Call Claude API with prompt caching support for multi-turn conversations.

    Args:
        system_prompt: System prompt to be cached (should be consistent across turns)
        messages: List of conversation messages [{"role": "user"|"assistant", "content": "..."}]
        use_cache: Whether to use prompt caching (cache the system prompt)
        use_sonnet: True for Sonnet 4.5, False for Haiku 4.5
        max_tokens: Maximum tokens in response

    Returns:
        dict with:
            - content: Response text
            - model: Model used
            - input_tokens: Total input tokens
            - output_tokens: Output tokens
            - cache_creation_input_tokens: Tokens used to create cache (0 if cache hit)
            - cache_read_input_tokens: Tokens read from cache
    """
    model = "claude-sonnet-4-5-20250929" if use_sonnet else "claude-haiku-4-5-20251001"

    try:
        client = _get_client()

        # Build system array with cache_control if caching enabled
        system_content = []
        if use_cache:
            system_content = [
                {
                    "type": "text",
                    "text": system_prompt,
                    "cache_control": {"type": "ephemeral"}  # Cache this content
                }
            ]
        else:
            system_content = [{"type": "text", "text": system_prompt}]

        response = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system_content,
            messages=messages
        )

        content = response.content[0].text
        usage = response.usage

        # Extract caching metrics
        cache_creation_tokens = getattr(usage, 'cache_creation_input_tokens', 0)
        cache_read_tokens = getattr(usage, 'cache_read_input_tokens', 0)
        input_tokens = usage.input_tokens
        output_tokens = usage.output_tokens

        logger.info(
            f"Claude API call with caching: {model}, "
            f"input={input_tokens}, output={output_tokens}, "
            f"cache_creation={cache_creation_tokens}, cache_read={cache_read_tokens}"
        )

        return {
            "content": content,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cache_creation_input_tokens": cache_creation_tokens,
            "cache_read_input_tokens": cache_read_tokens,
            "is_cached": cache_read_tokens > 0  # True if we hit the cache
        }

    except Exception as e:
        logger.error(f"Claude API error with caching: {e}")
        raise


def build_week_prompt(user_profile: Dict, recent_workouts: List, program_week: int = 2, ai_context: str = None) -> str:
    """
    Build prompt for generating a complete training week (3 workouts).

    Args:
        user_profile: User profile dictionary
        recent_workouts: List of recent workouts (last 4 weeks)
        program_week: Current week in 8-week program
        ai_context: Optional AI context string for conversation continuity

    Returns:
        Formatted prompt for Claude
    """
    # Format workout history
    workout_lines = []
    for w in recent_workouts[:20]:
        date_str = w.date.strftime("%Y-%m-%d")
        duration_min = w.duration // 60 if w.duration else 0
        workout_lines.append(
            f"- {date_str}: {w.distance:.1f}km en {duration_min}min, "
            f"FC moy {w.avg_hr or 'N/A'} bpm, Type: {w.workout_type or 'non défini'}"
        )

    history_text = "\n".join(workout_lines) if workout_lines else "Aucune séance récente"

    # Current level info (handle None or non-dict values)
    current_level = user_profile.get('current_level')
    if not isinstance(current_level, dict):
        current_level = {}
    easy_pace = current_level.get('easy_pace', '6:00/km')
    tempo_pace = current_level.get('tempo_pace', '5:30/km')
    volume = user_profile.get('weekly_volume', 23)

    # AI context section (if provided)
    context_section = ""
    if ai_context:
        context_section = f"""
CONTEXTE IA (continuité des recommandations):
{ai_context}

"""

    prompt = f"""Tu es un coach running spécialisé dans la prévention des blessures.
{context_section}

PROFIL UTILISATEUR:
- Niveau actuel: Sortie longue 10km confortables
- Allure facile: {easy_pace}
- Allure tempo: {tempo_pace}
- Volume hebdo cible: {volume} km
- Blessure récente: Syndrome essuie-glace (SORTI de blessure, meilleur ressenti jamais eu)
- Objectif principal: Semi-marathon mars-avril 2026
- Programme: Semaine {program_week}/8 - Phase consolidation post-blessure

RÈGLES D'ENTRAÎNEMENT:
- Max 10% progression volume/semaine
- Toujours 1 jour repos entre runs
- Semaine récupération toutes les 3-4 semaines
- 3 sorties/semaine avec structure: Séance facile, Séance qualité (tempo ou fractionné), Sortie longue
- Varier les types pour équilibre charge/récupération

HISTORIQUE 4 DERNIÈRES SEMAINES:
{history_text}

QUESTION:
Conçois-moi une semaine type complète avec 3 séances :
1. Une séance facile/récupération
2. Une séance qualité (tempo OU fractionné selon ce qui est le plus adapté)
3. Une sortie longue

RÉPONDS EN FORMAT JSON STRICT (sans markdown) avec un tableau de 3 séances:
{{
  "week_description": "Description courte de l'objectif de cette semaine",
  "workouts": [
    {{
      "day": "Lundi",
      "type": "facile",
      "distance_km": 7.0,
      "allure_cible": "6:00-6:15/km",
      "structure": "Échauffement: description\nCorps de séance: description\nRetour au calme: description",
      "raison": "Raison 1\nRaison 2\nRaison 3"
    }},
    {{
      "day": "Jeudi",
      "type": "tempo",
      "distance_km": 8.0,
      "allure_cible": "5:30-5:40/km",
      "structure": "Échauffement: description\nCorps de séance: description\nRetour au calme: description",
      "raison": "Raison 1\nRaison 2\nRaison 3"
    }},
    {{
      "day": "Dimanche",
      "type": "longue",
      "distance_km": 10.0,
      "allure_cible": "6:00-6:15/km",
      "structure": "Échauffement: description\nCorps de séance: description\nRetour au calme: description",
      "raison": "Raison 1\nRaison 2\nRaison 3"
    }}
  ]
}}

RÈGLES STRICTES:
- Le volume total des 3 séances doit être proche de {volume}km
- Respecter la structure: facile / qualité / longue
- Chaque séance doit avoir une structure en 3 parties
- Chaque raison doit être concise (3-4 lignes par séance)
"""
    return prompt


def parse_suggestion_response(content: str) -> Dict[str, Any]:
    """Parse Claude response to extract JSON."""
    try:
        # Remove markdown code blocks if present
        content = content.strip()
        if content.startswith("```"):
            # Remove first and last lines
            lines = content.split("\n")
            content = "\n".join(lines[1:-1])

        # Try to find JSON in the content
        start_idx = content.find("{")
        end_idx = content.rfind("}") + 1
        if start_idx >= 0 and end_idx > start_idx:
            json_str = content[start_idx:end_idx]
            parsed = json.loads(json_str)

            # If Claude returned nested JSON (structure field contains escaped JSON), parse it
            if isinstance(parsed.get("structure"), str) and parsed["structure"].strip().startswith("{"):
                try:
                    nested = json.loads(parsed["structure"])
                    # Use the nested JSON as the main response
                    return nested
                except:
                    pass

            return parsed
        else:
            return json.loads(content)

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude response as JSON: {e}")
        logger.error(f"Content: {content}")
        # Return a default structure
        return {
            "type": "facile",
            "distance_km": 6.0,
            "allure_cible": "6:00/km",
            "structure": "Échauffement: 10 min de marche\nCorps de séance: 5km facile\nRetour au calme: 5 min étirements",
            "raison": "Consolidation\nPrévention blessure\nPréparation séance qualité"
        }


def build_training_plan_prompt(
    user_profile: Dict,
    recent_workouts: List,
    goal_type: str,
    weeks_count: int = 8,
    current_level: str = "intermediate"
) -> str:
    """
    Build prompt for generating a complete training plan (8-12 weeks).

    Args:
        user_profile: User profile dictionary
        recent_workouts: List of recent workouts (last 4 weeks)
        goal_type: Training goal (5km, 10km, semi, marathon)
        weeks_count: Number of weeks (8-12)
        current_level: Current fitness level (beginner, intermediate, advanced)

    Returns:
        Formatted prompt for Claude
    """
    # Format workout history
    workout_lines = []
    for w in recent_workouts[:20]:
        date_str = w.date.strftime("%Y-%m-%d")
        duration_min = w.duration // 60 if w.duration else 0
        workout_lines.append(
            f"- {date_str}: {w.distance:.1f}km en {duration_min}min, "
            f"FC moy {w.avg_hr or 'N/A'} bpm, Type: {w.workout_type or 'non défini'}"
        )

    history_text = "\n".join(workout_lines) if workout_lines else "Aucune séance récente"

    # Current level info (handle None or non-dict values)
    current_level_info = user_profile.get('current_level')
    if not isinstance(current_level_info, dict):
        current_level_info = {}
    easy_pace = current_level_info.get('easy_pace', '6:00/km')
    tempo_pace = current_level_info.get('tempo_pace', '5:30/km')
    volume = user_profile.get('weekly_volume', 23)

    # Calculate phase distribution
    base_weeks = int(weeks_count * 0.30)
    build_weeks = int(weeks_count * 0.40)
    peak_weeks = int(weeks_count * 0.20)
    taper_weeks = weeks_count - (base_weeks + build_weeks + peak_weeks)

    prompt = f"""Tu es un coach running expert en périodisation et prévention des blessures.

PROFIL UTILISATEUR:
- Niveau actuel: {current_level}
- Allure facile: {easy_pace}
- Allure tempo: {tempo_pace}
- Volume hebdo actuel: {volume} km
- Objectif: {goal_type.upper()}
- Durée du plan: {weeks_count} semaines

HISTORIQUE 4 DERNIÈRES SEMAINES:
{history_text}

CONSIGNE:
Crée-moi un plan d'entraînement complet de {weeks_count} semaines avec périodisation:

PÉRIODISATION:
- Phase BASE ({base_weeks} semaines): Endurance fondamentale, construction volume progressif
- Phase BUILD ({build_weeks} semaines): Introduction qualité (tempo, seuil, VMA), maintien volume
- Phase PEAK ({peak_weeks} semaines): Intensité maximale, séances spécifiques objectif
- Phase TAPER ({taper_weeks} semaines): Réduction volume (-30-50%), maintien intensité

RÈGLES STRICTES:
- Max +10% volume par semaine
- 3 séances/semaine (facile, qualité, longue)
- Semaine récupération toutes les 3-4 semaines (-20% volume)
- Progression graduelle: 80% facile en phase base → 70% en build → 60% en peak
- Toujours 1 jour repos entre runs

RÉPONDS EN FORMAT JSON STRICT (sans markdown):
{{
  "plan_name": "Plan {goal_type.upper()} - {weeks_count} semaines",
  "weeks": [
    {{
      "week_number": 1,
      "phase": "base",
      "description": "Description objectif de la semaine",
      "sessions": [
        {{
          "day": "Lundi",
          "order": 1,
          "type": "facile",
          "distance_km": 7.0,
          "pace_target": "6:00-6:15/km",
          "structure": "Échauffement: description\nCorps de séance: description\nRetour au calme: description",
          "reasoning": "Raison 1\nRaison 2\nRaison 3"
        }},
        {{
          "day": "Jeudi",
          "order": 2,
          "type": "tempo",
          "distance_km": 8.0,
          "pace_target": "5:30-5:40/km",
          "structure": "Échauffement: description\nCorps de séance: description\nRetour au calme: description",
          "reasoning": "Raison 1\nRaison 2\nRaison 3"
        }},
        {{
          "day": "Dimanche",
          "order": 3,
          "type": "longue",
          "distance_km": 10.0,
          "pace_target": "6:00-6:15/km",
          "structure": "Échauffement: description\nCorps de séance: description\nRetour au calme: description",
          "reasoning": "Raison 1\nRaison 2\nRaison 3"
        }}
      ]
    }}
  ]
}}

IMPORTANT:
- Génère EXACTEMENT {weeks_count} semaines
- Volume total/semaine doit progresser de {volume}km à {volume * 1.5:.0f}km environ
- Types de séances: facile, tempo, fractionne, longue
- Chaque semaine doit avoir EXACTEMENT 3 séances
- Respecter la périodisation (phases base/build/peak/taper)
"""
    return prompt


def generate_training_plan(
    user_profile: Dict,
    recent_workouts: List,
    goal_type: str,
    weeks_count: int = 8,
    current_level: str = "intermediate",
    use_sonnet: bool = True
) -> Dict[str, Any]:
    """
    Generate a complete training plan via Claude API.

    Args:
        user_profile: User profile dictionary
        recent_workouts: List of recent workouts
        goal_type: Training goal (5km, 10km, semi, marathon)
        weeks_count: Number of weeks (8-12)
        current_level: Current fitness level
        use_sonnet: Use Sonnet (True) or Haiku (False)

    Returns:
        Dictionary with plan_name, weeks array, and API metadata
    """
    prompt = build_training_plan_prompt(
        user_profile,
        recent_workouts,
        goal_type,
        weeks_count,
        current_level
    )

    response = call_claude_api(prompt, use_sonnet=use_sonnet)
    plan_data = parse_suggestion_response(response["content"])

    return {
        "plan_data": plan_data,
        "model_used": response["model"],
        "tokens_used": response["tokens"]
    }


def build_adapt_plan_prompt(
    plan_data: Dict,
    missed_sessions: List[Dict],
    user_feedback: str
) -> str:
    """
    Build prompt for adapting an existing training plan based on performance.

    Args:
        plan_data: Current training plan data
        missed_sessions: List of missed/skipped sessions
        user_feedback: User feedback (fatigue, injury, feeling great, etc.)

    Returns:
        Formatted prompt for Claude
    """
    missed_count = len(missed_sessions)
    missed_text = "\n".join([
        f"- Semaine {s['week']}, {s['day']}: {s['type']} {s['distance']}km (raison: {s.get('reason', 'non précisée')})"
        for s in missed_sessions[:10]
    ])

    prompt = f"""Tu es un coach running expert en adaptation de plans d'entraînement.

SITUATION ACTUELLE:
- Plan en cours: {plan_data.get('plan_name', 'Plan d\'entraînement')}
- Semaines restantes: {plan_data.get('remaining_weeks', 'N/A')}
- Séances manquées: {missed_count}

SÉANCES MANQUÉES:
{missed_text if missed_text else "Aucune séance manquée"}

FEEDBACK UTILISATEUR:
{user_feedback}

CONSIGNE:
Propose des ajustements au plan pour les prochaines semaines. Considère:
1. Réduire/augmenter le volume si signes de fatigue/surentraînement
2. Réorganiser les séances si pattern de séances manquées
3. Ajuster l'intensité selon le ressenti
4. Maintenir la périodisation globale

RÉPONDS EN FORMAT JSON:
{{
  "analysis": "Analyse de la situation en 2-3 phrases",
  "adjustments": [
    {{
      "week_number": 5,
      "changes": "Description des changements pour cette semaine",
      "reasoning": "Pourquoi ces changements"
    }}
  ],
  "recommendation": "Recommandation générale pour la suite"
}}
"""
    return prompt


def adapt_training_plan(
    plan_data: Dict,
    missed_sessions: List[Dict],
    user_feedback: str,
    use_sonnet: bool = True
) -> Dict[str, Any]:
    """
    Adapt a training plan based on user performance and feedback.

    Args:
        plan_data: Current plan data
        missed_sessions: List of missed sessions
        user_feedback: User feedback text
        use_sonnet: Use Sonnet vs Haiku

    Returns:
        Adaptation recommendations
    """
    prompt = build_adapt_plan_prompt(plan_data, missed_sessions, user_feedback)
    response = call_claude_api(prompt, use_sonnet=use_sonnet)
    adaptation = parse_suggestion_response(response["content"])

    return {
        "adaptation": adaptation,
        "model_used": response["model"],
        "tokens_used": response["tokens"]
    }
