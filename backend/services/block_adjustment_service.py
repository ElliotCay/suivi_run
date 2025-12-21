"""
Block Adjustment Service

Analyzes completed training blocks to automatically adjust future blocks based on:
- User feedback (pain, fatigue, difficulty)
- Performance patterns (failed workouts, skipped sessions)
- Progression trends (improving vs. declining)
- Long-term goal: Semi-marathon preparation
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from models import (
    TrainingBlock,
    PlannedWorkout,
    Workout,
    WorkoutFeedback
)
from services.claude_service import call_claude_api
import json
import logging

logger = logging.getLogger(__name__)


def analyze_previous_block(db: Session, user_id: int) -> Optional[Dict]:
    """
    Analyze the most recently completed training block.

    Returns a structured analysis of:
    - Completed vs. planned sessions
    - Performance on key workouts (tempo, intervals)
    - Recurring issues (pain, fatigue)
    - Readiness for next block

    Args:
        db: Database session
        user_id: User ID

    Returns:
        Dictionary with block analysis or None if no previous block
    """
    # Get the most recent completed block
    previous_block = db.query(TrainingBlock).filter(
        and_(
            TrainingBlock.user_id == user_id,
            TrainingBlock.status == "completed"
        )
    ).order_by(desc(TrainingBlock.end_date)).first()

    if not previous_block:
        logger.info(f"No previous block found for user {user_id}")
        return None

    # Get all planned workouts from that block
    planned_workouts = db.query(PlannedWorkout).filter(
        PlannedWorkout.block_id == previous_block.id
    ).order_by(PlannedWorkout.scheduled_date).all()

    # Analyze each planned workout
    workout_analysis = []
    for planned in planned_workouts:
        analysis_entry = {
            "planned_date": planned.scheduled_date.strftime("%Y-%m-%d"),
            "workout_type": planned.workout_type,
            "target_distance": planned.distance_km,
            "target_pace": planned.target_pace_min if planned.target_pace_min else None,
            "description": planned.description,
            "completed": False,
            "actual_data": None,
            "user_feedback": None,
            "issues": []
        }

        # Check if workout was completed
        if planned.completed_workout_id:
            workout = db.query(Workout).filter(
                Workout.id == planned.completed_workout_id
            ).first()

            if workout:
                analysis_entry["completed"] = True
                analysis_entry["actual_data"] = {
                    "distance": workout.distance,
                    "avg_pace": workout.avg_pace,
                    "avg_hr": workout.avg_hr,
                    "notes": workout.notes
                }

                # Check for issues in user comment
                if workout.notes:
                    comment_lower = workout.notes.lower()
                    if any(word in comment_lower for word in ["douleur", "mal", "blessure", "injury", "pain"]):
                        analysis_entry["issues"].append("pain_reported")
                    if any(word in comment_lower for word in ["fatigué", "épuisé", "fatigue", "tired", "exhausted"]):
                        analysis_entry["issues"].append("fatigue_reported")
                    if any(word in comment_lower for word in ["trop dur", "impossible", "explosé", "couldn't", "too hard"]):
                        analysis_entry["issues"].append("workout_too_hard")

                # Get workout feedback if exists
                feedback = db.query(WorkoutFeedback).filter(
                    WorkoutFeedback.completed_workout_id == workout.id
                ).first()

                if feedback:
                    analysis_entry["user_feedback"] = {
                        "rpe": feedback.rpe,
                        "difficulty": feedback.difficulty,
                        "pain_level": feedback.pain_level,
                        "fatigue_level": feedback.fatigue_level
                    }

                    # Flag high difficulty/pain/fatigue
                    if feedback.pain_level and feedback.pain_level >= 6:
                        analysis_entry["issues"].append("high_pain")
                    if feedback.fatigue_level and feedback.fatigue_level >= 8:
                        analysis_entry["issues"].append("high_fatigue")
                    if feedback.difficulty and feedback.difficulty >= 8:
                        analysis_entry["issues"].append("high_difficulty")

        workout_analysis.append(analysis_entry)

    # Calculate block-level metrics
    total_planned = len(planned_workouts)
    completed_count = sum(1 for w in workout_analysis if w["completed"])
    completion_rate = completed_count / total_planned if total_planned > 0 else 0

    # Count issue patterns
    pain_count = sum(1 for w in workout_analysis if "pain_reported" in w["issues"] or "high_pain" in w["issues"])
    fatigue_count = sum(1 for w in workout_analysis if "fatigue_reported" in w["issues"] or "high_fatigue" in w["issues"])
    too_hard_count = sum(1 for w in workout_analysis if "workout_too_hard" in w["issues"] or "high_difficulty" in w["issues"])

    return {
        "block_id": previous_block.id,
        "block_phase": previous_block.phase,
        "start_date": previous_block.start_date.strftime("%Y-%m-%d"),
        "end_date": previous_block.end_date.strftime("%Y-%m-%d"),
        "total_planned_sessions": total_planned,
        "completed_sessions": completed_count,
        "completion_rate": completion_rate,
        "issue_counts": {
            "pain_episodes": pain_count,
            "fatigue_episodes": fatigue_count,
            "too_hard_episodes": too_hard_count
        },
        "workouts": workout_analysis
    }


def generate_block_adjustments_with_ai(
    db: Session,
    user_id: int,
    previous_block_analysis: Dict,
    next_phase: str,
    recent_context: Dict = None
) -> Dict:
    """
    Use Claude Sonnet to analyze previous block and generate adjustments.

    Args:
        db: Database session
        user_id: User ID
        previous_block_analysis: Output from analyze_previous_block()
        next_phase: Planned phase for next block ("base", "development", "peak")

    Returns:
        Dictionary with adjustment recommendations
    """
    # Fetch Strava/Apple Health workouts from last 4 weeks with user comments
    from datetime import datetime, timedelta
    from models import Workout

    end_date = datetime.now()
    start_date = end_date - timedelta(weeks=4)

    strava_workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= start_date,
        Workout.date <= end_date,
        Workout.source.in_(["strava", "apple_health"])
    ).order_by(Workout.date).all()

    # Format workouts as JSON for Claude
    strava_context = []
    if strava_workouts:
        logger.info(f"🏃 Formatting {len(strava_workouts)} Strava/Apple Health workouts for block generation")
        for w in strava_workouts:
            workout_data = {
                "date": w.date.strftime("%Y-%m-%d"),
                "distance_km": round(w.distance, 2) if w.distance else None,
                "duration_minutes": round(w.duration / 60, 1) if w.duration else None,
                "avg_pace_per_km": f"{int(w.avg_pace // 60)}:{int(w.avg_pace % 60):02d}" if w.avg_pace else None,
                "avg_hr": w.avg_hr,
                "max_hr": w.max_hr,
                "workout_type": w.workout_type,
                "source": w.source,
            }
            if w.notes:
                workout_data["notes"] = w.notes
            strava_context.append(workout_data)

        logger.info(f"✅ Formatted {len(strava_context)} workouts with comments into JSON context")

    # Build prompt for Claude
    strava_section = ""
    if strava_context:
        strava_section = f"""

HISTORIQUE STRAVA/APPLE HEALTH (4 DERNIÈRES SEMAINES):
```json
{json.dumps(strava_context, indent=2, ensure_ascii=False)}
```

Ces données montrent ce que l'athlète a réellement couru avec ses commentaires sur les sensations, douleurs, etc."""

    # Add injury section if recent_context is provided
    injury_section = ""
    if recent_context and recent_context.get("injury_details"):
        from services.injury_strengthening import get_injury_summary_for_ai
        injury_summary = get_injury_summary_for_ai(db, user_id)
        injury_section = f"""

BLESSURES ET HISTORIQUE MÉDICAL:
{injury_summary}
Détails: {json.dumps(recent_context.get('injury_details', []), indent=2, ensure_ascii=False)}

⚠️ IMPORTANT: Les blessures actives ou récurrentes DOIVENT être prises en compte prioritairement."""

    prompt = f"""Tu es un coach running expert spécialisé dans la préparation semi-marathon.

OBJECTIF LONG TERME: Préparer l'athlète à courir un semi-marathon (21.1km) dans de bonnes conditions.

ANALYSE DU BLOC PRÉCÉDENT:
{json.dumps(previous_block_analysis, indent=2, ensure_ascii=False)}
{strava_section}
{injury_section}

PHASE PRÉVUE POUR LE PROCHAIN BLOC: {next_phase}

CONSIGNES:
1. Analyse chronologiquement les séances du bloc précédent ET l'historique Strava/Apple Health
2. Identifie les patterns problématiques:
   - Douleurs récurrentes (même zone 2x+) dans les commentaires utilisateur
   - Fatigue excessive répétée
   - Séances "trop dures" systématiques
   - Taux d'abandon élevé
   - Commentaires négatifs répétés sur certains types de séances
3. Utilise les commentaires Strava pour comprendre les sensations réelles de l'athlète
4. Propose des ajustements concrets pour le prochain bloc:
   - Réduction d'allure si nécessaire (-5 à -15 sec/km)
   - Fractionnement des séances longues (ex: 3km → 2x1.5km)
   - Ajout de jours de repos si surcharge
   - Maintien de la charge si tout va bien
5. Garde en tête l'objectif semi-marathon (progression progressive)
6. Sois factuel et direct, pas de superlatifs
7. Si l'athlète mentionne des douleurs spécifiques (genoux, rotule, etc.), adapte les séances en conséquence

RÉPONDS EN JSON STRICT:
{{
  "overall_assessment": "good" | "needs_adjustment" | "needs_significant_reduction",
  "key_findings": [
    "Description factuelle des problèmes ou succès"
  ],
  "adjustments": {{
    "pace_adjustments": {{
      "easy_runs": {{"change_seconds_per_km": 0, "reason": "..."}},
      "tempo_runs": {{"change_seconds_per_km": -10, "reason": "..."}},
      "intervals": {{"change_seconds_per_km": -5, "reason": "..."}}
    }},
    "volume_adjustments": {{
      "weekly_volume_change_percent": -10,
      "reason": "..."
    }},
    "workout_modifications": [
      {{
        "workout_type": "tempo",
        "modification": "split_into_intervals",
        "details": "Fractionner les 3km tempo en 2x1.5km avec 2-3min récup",
        "reason": "Douleurs genoux répétées sur tempo long"
      }}
    ],
    "recovery_recommendations": [
      "Ajouter 1 jour de repos supplémentaire par semaine",
      "Insister sur les étirements post-tempo"
    ]
  }},
  "next_block_strategy": "Description de l'approche pour le prochain bloc (2-3 phrases)"
}}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après."""

    try:
        # Call Claude Sonnet for detailed analysis
        response = call_claude_api(prompt, use_sonnet=True)
        content = response["content"]

        # Extract JSON
        start_idx = content.find("{")
        end_idx = content.rfind("}") + 1

        if start_idx >= 0 and end_idx > start_idx:
            adjustments = json.loads(content[start_idx:end_idx])

            logger.info(f"✅ Block adjustments generated for user {user_id}")
            logger.info(f"   Overall assessment: {adjustments.get('overall_assessment')}")
            logger.info(f"   Key findings: {len(adjustments.get('key_findings', []))} items")

            return adjustments
        else:
            raise ValueError("Invalid JSON in Claude response")

    except Exception as e:
        logger.error(f"❌ Error generating block adjustments: {e}")
        # Return safe default (no adjustments)
        return {
            "overall_assessment": "good",
            "key_findings": ["Unable to analyze previous block"],
            "adjustments": {
                "pace_adjustments": {
                    "easy_runs": {"change_seconds_per_km": 0, "reason": "Maintaining current paces"},
                    "tempo_runs": {"change_seconds_per_km": 0, "reason": "Maintaining current paces"},
                    "intervals": {"change_seconds_per_km": 0, "reason": "Maintaining current paces"}
                },
                "volume_adjustments": {
                    "weekly_volume_change_percent": 0,
                    "reason": "No data for adjustment"
                },
                "workout_modifications": [],
                "recovery_recommendations": []
            },
            "next_block_strategy": "Continuing with standard progression plan"
        }


def apply_adjustments_to_paces(
    base_paces: Dict[str, Dict],
    adjustments: Dict
) -> Dict[str, Dict]:
    """
    Apply pace adjustments to base training paces.

    Args:
        base_paces: Base paces from VDOT calculation
        adjustments: Adjustments from generate_block_adjustments_with_ai()

    Returns:
        Adjusted paces dictionary
    """
    adjusted_paces = base_paces.copy()

    pace_adj = adjustments.get("adjustments", {}).get("pace_adjustments", {})

    # Apply easy pace adjustment
    if "easy_runs" in pace_adj:
        change = pace_adj["easy_runs"].get("change_seconds_per_km", 0)
        if "easy" in adjusted_paces:
            adjusted_paces["easy"]["min_pace_sec"] += change
            adjusted_paces["easy"]["max_pace_sec"] += change

    # Apply tempo/threshold adjustment
    if "tempo_runs" in pace_adj:
        change = pace_adj["tempo_runs"].get("change_seconds_per_km", 0)
        if "threshold" in adjusted_paces:
            adjusted_paces["threshold"]["min_pace_sec"] += change
            adjusted_paces["threshold"]["max_pace_sec"] += change

    # Apply interval adjustment
    if "intervals" in pace_adj:
        change = pace_adj["intervals"].get("change_seconds_per_km", 0)
        if "interval" in adjusted_paces:
            adjusted_paces["interval"]["min_pace_sec"] += change
            adjusted_paces["interval"]["max_pace_sec"] += change
        if "repetition" in adjusted_paces:
            adjusted_paces["repetition"]["min_pace_sec"] += change
            adjusted_paces["repetition"]["max_pace_sec"] += change

    return adjusted_paces
