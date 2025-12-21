"""
AI-powered personalized workout descriptions using Claude.

Generates contextualized workout descriptions based on:
- User's recent training history
- Personal records and VDOT
- Current phase in training block
- Previous workout performances
"""

import os
from typing import List, Dict, Any
from datetime import datetime, timedelta
from anthropic import Anthropic
from sqlalchemy.orm import Session

from models import Workout, PersonalRecord, TrainingZone


def get_recent_workouts_summary(db: Session, user_id: int, days: int = 30) -> str:
    """Get summary of recent workouts for context, including user comments."""
    cutoff = datetime.now() - timedelta(days=days)

    workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= cutoff,
        Workout.distance.isnot(None)
    ).order_by(Workout.date.desc()).limit(10).all()

    if not workouts:
        return "Aucune séance récente trouvée."

    summary = []
    for w in workouts:
        date_str = w.date.strftime("%d/%m")
        if w.avg_pace:
            pace_int = int(w.avg_pace)
            pace_str = f"{pace_int // 60}:{pace_int % 60:02d}/km"
        else:
            pace_str = "N/A"
        hr_str = f"FC moy: {w.avg_hr}bpm" if w.avg_hr else ""

        line = f"- {date_str}: {w.distance:.1f}km à {pace_str} {hr_str}"

        # Add user comment if present (very important for context)
        if w.notes:
            # Truncate long comments
            comment = w.notes[:150] + "..." if len(w.notes) > 150 else w.notes
            line += f"\n  💬 \"{comment}\""

        summary.append(line)

    return "\n".join(summary)


def get_prs_summary(db: Session, user_id: int) -> str:
    """Get personal records summary."""
    prs = db.query(PersonalRecord).filter(
        PersonalRecord.user_id == user_id,
        PersonalRecord.is_current == 1
    ).all()

    if not prs:
        return "Aucun record personnel enregistré."

    summary = []
    for pr in prs:
        minutes = int(pr.time_seconds // 60)
        seconds = int(pr.time_seconds % 60)
        summary.append(f"- {pr.distance}: {minutes}:{seconds:02d}")

    return "\n".join(summary)


def generate_personalized_workout_descriptions(
    db: Session,
    user_id: int,
    workouts_plan: List[Dict[str, Any]],
    zones: TrainingZone,
    phase: str,
    use_sonnet: bool = False
) -> List[str]:
    """
    Generate personalized workout descriptions using Claude AI.

    Args:
        db: Database session
        user_id: User ID
        workouts_plan: List of workout plans with type, distance, week_number, etc.
        zones: Training zones calculated from VDOT
        phase: Training phase (base, development, peak)
        use_sonnet: Use Sonnet (more expensive) instead of Haiku

    Returns:
        List of personalized descriptions (one per workout)
    """
    client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    # Gather context
    recent_workouts = get_recent_workouts_summary(db, user_id)
    prs = get_prs_summary(db, user_id)

    # Format training zones
    def format_pace(seconds: float) -> str:
        total_secs = int(seconds)
        return f"{total_secs // 60}:{total_secs % 60:02d}/km"

    zones_str = f"""Zones d'entraînement (VDOT {zones.vdot:.1f}) :
- Facile: {format_pace(zones.easy_min_pace_sec)} - {format_pace(zones.easy_max_pace_sec)}
- Seuil: {format_pace(zones.threshold_min_pace_sec)} - {format_pace(zones.threshold_max_pace_sec)}
- Fractionné: {format_pace(zones.interval_min_pace_sec)} - {format_pace(zones.interval_max_pace_sec)}
"""

    # Build workout list for prompt
    workouts_str = ""
    for i, w in enumerate(workouts_plan, 1):
        workouts_str += f"\n{i}. Semaine {w['week_number']}, {w['day_of_week']} - {w['type']} ({w['distance_km']:.1f}km)"

    prompt = f"""Tu es un coach de course à pied expert. Je vais te demander de générer des descriptions personnalisées et motivantes pour un plan d'entraînement de 4 semaines.

**CONTEXTE DU COUREUR**

Records personnels :
{prs}

{zones_str}

Séances récentes (30 derniers jours) avec commentaires :
{recent_workouts}

Phase d'entraînement : {phase}

**SÉANCES À DÉCRIRE**
{workouts_str}

**INSTRUCTIONS**

Pour CHAQUE séance, génère une description structurée en markdown qui contient :

1. **Titre court** : Ex: "Séance au seuil - Semaine 1/4"

2. **Objectif de la séance** (2-3 phrases) :
   - Explique POURQUOI cette séance à ce moment du bloc
   - Mentionne les séances récentes du coureur pour contextualiser
   - **IMPORTANT** : Prends en compte les commentaires de l'athlète (douleurs, fatigue, etc.)
   - Indique comment ça s'inscrit dans la progression

3. **Structure détaillée** (TRÈS IMPORTANT - sois granulaire) :
   - Échauffement : distance précise + allure (ex: "1.5km à 6:30-6:45/km")
   - Corps de séance :
     * Pour le seuil : découpe en 2 blocs si >3km (ex: "2.4km au seuil + 800m récup + 800m au seuil")
     * Pour le fractionné : précise récupération entre intervalles (ex: "6 x 1000m à 4:00-4:06/km, récup 2min trot entre chaque")
     * Pour le facile/longue : donne une fourchette d'allure recommandée
   - Retour au calme : distance précise + allure

4. **Conseils personnalisés** (3-4 bullet points) :
   - **CRITICAL** : Si l'athlète a mentionné des douleurs (genoux, rotule, etc.) dans ses commentaires, adapte les conseils en conséquence
   - CITE les allures précises des séances récentes (ex: "Tes sorties à 6:10-6:16/km sont parfaites")
   - Si l'athlète a trouvé des séances "trop dures", recommande des ajustements
   - Anticipe les erreurs courantes pour ce type de séance
   - Donne des repères concrets basés sur l'historique
   - Utilise un ton direct et encourageant ("Résiste à...", "Concentre-toi sur...")

**FORMAT DE SORTIE**

CRITICAL: Tu DOIS générer EXACTEMENT {len(workouts_plan)} descriptions (une pour chaque séance listée ci-dessus).

Réponds UNIQUEMENT avec un objet JSON valide contenant un tableau "workouts".
PAS de markdown, PAS de commentaires, JUSTE le JSON.

Format JSON attendu :
{{
  "workouts": [
    {{
      "title": "Séance au seuil - Semaine 1/4",
      "objective": "Relancer le travail au seuil après une période axée principalement sur l'endurance. Cette séance permet de retrouver les sensations à allure semi-marathon tout en restant dans un volume accessible.",
      "structure": [
        "Échauffement : 1.5km en allure facile (6:30-6:45/km)",
        "Corps de séance : 2.4km au seuil (4:18-4:24/km) en continu",
        "Récupération active : 800m en trottinant (7:00/km)",
        "Deuxième bloc : 800m au seuil (4:18-4:24/km)",
        "Retour au calme : 500m en allure facile (6:30/km)"
      ],
      "tips": [
        "Tes dernières sorties montrent que tu cours souvent plus vite que l'allure facile recommandée, concentre-toi sur le respect des zones",
        "Le seuil peut sembler lent au début mais maintiens cette allure pour construire une base solide",
        "Si tu sens une fatigue résiduelle de tes sorties récentes, n'hésite pas à raccourcir légèrement les blocs au seuil"
      ]
    }},
    {{
      "title": "Sortie facile - Semaine 1/4",
      "objective": "...",
      "structure": ["..."],
      "tips": ["..."]
    }}
  ]
}}
"""

    # Call Claude API
    model = "claude-sonnet-4-20250514" if use_sonnet else "claude-3-5-haiku-20241022"

    response = client.messages.create(
        model=model,
        max_tokens=8000,
        temperature=0.7,
        messages=[{
            "role": "user",
            "content": prompt
        }]
    )

    # Parse JSON response
    import json
    import re

    full_text = response.content[0].text

    # Extract JSON (sometimes Claude wraps it in markdown)
    json_match = re.search(r'\{[\s\S]*\}', full_text)
    if not json_match:
        raise ValueError("No JSON found in AI response")

    json_str = json_match.group(0)
    data = json.loads(json_str)

    # Validate structure
    if "workouts" not in data:
        raise ValueError("JSON response missing 'workouts' key")

    workouts_data = data["workouts"]

    # Ensure we have the right number of descriptions
    if len(workouts_data) != len(workouts_plan):
        raise ValueError(
            f"AI generated {len(workouts_data)} descriptions but expected {len(workouts_plan)}"
        )

    # Format as markdown for storage
    descriptions = []
    for w in workouts_data:
        desc = f"**{w['title']}**\n\n"
        desc += f"Objectif : {w['objective']}\n\n"
        desc += "Structure :\n"
        for item in w['structure']:
            desc += f"- {item}\n"
        desc += "\nConseils :\n"
        for tip in w['tips']:
            desc += f"- {tip}\n"
        descriptions.append(desc.strip())

    return descriptions
