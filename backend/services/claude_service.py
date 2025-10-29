"""
Claude AI service for generating workout suggestions.
"""

from anthropic import Anthropic
import os
import logging
import json
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

# Lazy initialization of Anthropic client
_client = None

def _get_client():
    """Get or create Anthropic client."""
    global _client
    if _client is None:
        _client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


def build_suggestion_prompt(
    user_profile: Dict,
    recent_workouts: List,
    program_week: int = 2,
    workout_type: str = None
) -> str:
    """
    Build prompt for workout suggestion.

    Args:
        user_profile: User profile dictionary
        recent_workouts: List of recent workouts (last 4 weeks)
        program_week: Current week in 8-week program
        workout_type: Specific workout type to generate (facile, tempo, fractionne, longue) or None for auto

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

    # Current level info
    current_level = user_profile.get('current_level', {})
    easy_pace = current_level.get('easy_pace', '6:00/km')
    tempo_pace = current_level.get('tempo_pace', '5:30/km')

    # Weekly volume
    volume = user_profile.get('weekly_volume', 23)

    prompt = f"""Tu es un coach running spécialisé dans la prévention des blessures.

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


def build_week_prompt(user_profile: Dict, recent_workouts: List, program_week: int = 2) -> str:
    """
    Build prompt for generating a complete training week (3 workouts).

    Args:
        user_profile: User profile dictionary
        recent_workouts: List of recent workouts (last 4 weeks)
        program_week: Current week in 8-week program

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

    current_level = user_profile.get('current_level', {})
    easy_pace = current_level.get('easy_pace', '6:00/km')
    tempo_pace = current_level.get('tempo_pace', '5:30/km')
    volume = user_profile.get('weekly_volume', 23)

    prompt = f"""Tu es un coach running spécialisé dans la prévention des blessures.

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
