"""
Post-Workout Analysis Service

Analyzes completed workouts against planned targets and generates
intelligent training plan adjustments.

Key features:
- Performance analysis (pace, HR, RPE vs plan)
- Fatigue detection
- Injury risk scoring
- Auto-adjustment <10% changes
- Proposal for >10% changes requiring validation
"""

import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc

from models import (
    Workout,
    WorkoutAnalysis,
    AdjustmentProposal,
    PlannedWorkout,
    WorkoutFeedback,
    TrainingZone,
    User
)
from services.claude_service import call_claude_api
import logging

logger = logging.getLogger(__name__)


def format_pace(seconds_per_km: float) -> str:
    """Convert pace in seconds/km to MM:SS/km format."""
    if not seconds_per_km:
        return "N/A"
    minutes = int(seconds_per_km // 60)
    seconds = int(seconds_per_km % 60)
    return f"{minutes}:{seconds:02d}/km"


def format_recent_workouts(workouts: List[Workout]) -> str:
    """Format recent workouts for AI prompt."""
    if not workouts:
        return "Aucune séance récente"

    lines = []
    for w in workouts:
        pace_str = format_pace(w.avg_pace) if w.avg_pace else "N/A"
        date_str = w.date.strftime("%d/%m")
        lines.append(
            f"- {date_str}: {w.workout_type or 'unknown'}, "
            f"{w.distance:.1f}km @ {pace_str}, FC: {w.avg_hr or 'N/A'}"
        )
    return "\n".join(lines)


def analyze_workout_performance(
    workout_id: int,
    db: Session
) -> Optional[WorkoutAnalysis]:
    """
    Analyze a completed workout's performance vs plan.

    Args:
        workout_id: ID of completed workout
        db: Database session

    Returns:
        WorkoutAnalysis object or None if analysis not possible
    """
    # Get workout
    workout = db.query(Workout).filter(Workout.id == workout_id).first()
    if not workout:
        logger.error(f"Workout {workout_id} not found")
        return None

    # Check if already analyzed
    existing = db.query(WorkoutAnalysis).filter(
        WorkoutAnalysis.workout_id == workout_id
    ).first()
    if existing:
        logger.info(f"Workout {workout_id} already analyzed")
        return existing

    # Get user profile
    user = db.query(User).filter(User.id == workout.user_id).first()

    # Get training zones
    zones = db.query(TrainingZone).filter(
        TrainingZone.user_id == workout.user_id,
        TrainingZone.is_current == True
    ).first()

    # Try to find planned workout for this session
    planned = db.query(PlannedWorkout).filter(
        PlannedWorkout.user_id == workout.user_id,
        PlannedWorkout.scheduled_date == workout.date.date(),
        PlannedWorkout.status == "scheduled"
    ).first()

    # Get feedback if exists
    feedback = db.query(WorkoutFeedback).filter(
        WorkoutFeedback.completed_workout_id == workout_id
    ).first()

    # Get recent workout history (last 7 days)
    week_ago = datetime.now() - timedelta(days=7)
    recent_workouts = db.query(Workout).filter(
        Workout.user_id == workout.user_id,
        Workout.date >= week_ago,
        Workout.id != workout_id
    ).order_by(desc(Workout.date)).limit(5).all()

    # Build AI prompt
    prompt = build_analysis_prompt(
        workout=workout,
        planned_workout=planned,
        user=user,
        zones=zones,
        feedback=feedback,
        recent_history=recent_workouts
    )

    # Call Claude API
    try:
        response = call_claude_api(
            prompt=prompt,
            use_sonnet=True
        )

        # Parse response - Claude sometimes adds text before/after JSON
        content = response["content"].strip()

        # Try to extract JSON if wrapped in markdown code blocks
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        # Find JSON object boundaries
        start_idx = content.find("{")
        end_idx = content.rfind("}")

        if start_idx == -1 or end_idx == -1:
            logger.error(f"No JSON found in Claude response: {content[:200]}")
            return None

        json_str = content[start_idx:end_idx+1]
        analysis_data = json.loads(json_str)

        # Create WorkoutAnalysis record
        analysis = WorkoutAnalysis(
            workout_id=workout_id,
            user_id=workout.user_id,
            performance_vs_plan=analysis_data.get("performance_vs_plan"),
            pace_variance_pct=analysis_data.get("ecart_allure_pct"),
            hr_zone_variance=analysis_data.get("ecart_fc_zones"),
            fatigue_detected=analysis_data.get("fatigue_detected", False),
            injury_risk_score=calculate_injury_risk_score(analysis_data.get("injury_risk_factors", [])),
            injury_risk_factors=analysis_data.get("injury_risk_factors"),
            summary=analysis_data.get("narrative_summary"),
            model_used="claude-sonnet-4",
            analyzed_at=datetime.utcnow()
        )

        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        logger.info(f"✅ Workout {workout_id} analyzed successfully")
        return analysis

    except Exception as e:
        logger.error(f"Error analyzing workout {workout_id}: {str(e)}")
        db.rollback()
        return None


def build_analysis_prompt(
    workout: Workout,
    planned_workout: Optional[PlannedWorkout],
    user: User,
    zones: Optional[TrainingZone],
    feedback: Optional[WorkoutFeedback],
    recent_history: List[Workout]
) -> str:
    """Build AI prompt for workout analysis."""

    # Format zones
    zones_str = "Non disponibles"
    if zones:
        zones_str = f"""
- Facile: {format_pace(zones.easy_min_pace_sec)}-{format_pace(zones.easy_max_pace_sec)}
- Tempo: {format_pace(zones.threshold_min_pace_sec)}-{format_pace(zones.threshold_max_pace_sec)}
- Intervalle: {format_pace(zones.interval_min_pace_sec)}-{format_pace(zones.interval_max_pace_sec)}
"""

    # Format planned workout
    planned_str = "Aucune séance planifiée (séance libre)"
    if planned_workout:
        planned_str = f"""
- Type: {planned_workout.workout_type}
- Distance: {planned_workout.distance_km}km
- Allure cible: {format_pace(planned_workout.target_pace_min)}-{format_pace(planned_workout.target_pace_max)}
- Objectif: {planned_workout.description or 'Non spécifié'}
"""

    # Format feedback
    feedback_str = "Non renseigné"
    if feedback:
        feedback_str = f"""
- RPE: {feedback.rpe}/10
- Difficulté: {feedback.difficulty}
- Douleurs: {', '.join(feedback.pain_locations) if feedback.pain_locations else 'aucune'}
- Commentaire: {feedback.comment or 'aucun'}
"""

    prompt = f"""Tu es un coach running expert. Analyse cette séance terminée.

SÉANCE PLANIFIÉE:
{planned_str}

SÉANCE RÉALISÉE:
- Distance: {workout.distance:.2f}km
- Allure moyenne: {format_pace(workout.avg_pace)}
- FC moyenne: {workout.avg_hr or 'N/A'} bpm
- FC max: {workout.max_hr or 'N/A'} bpm
- Type: {workout.workout_type or 'non classifié'}
- Commentaire: {workout.user_comment or 'aucun'}

FEEDBACK UTILISATEUR:
{feedback_str}

ZONES D'ENTRAÎNEMENT (basées sur VDOT):
{zones_str}

HISTORIQUE 7 DERNIERS JOURS:
{format_recent_workouts(recent_history)}

ANALYSE DEMANDÉE (réponds UNIQUEMENT en JSON, pas de texte avant ou après):
{{
  "performance_vs_plan": "sur_objectif|conforme|sous_objectif|séance_libre",
  "ecart_allure_pct": -5.2 (négatif = plus rapide que prévu, positif = plus lent),
  "ecart_fc_zones": "zone_3_au_lieu_de_zone_2" ou null,
  "fatigue_detected": true/false,
  "injury_risk_factors": ["volume_progression_15pct", "douleur_tfl_repetee", "fc_elevee_inhabituelle"] ou [],
  "adjustments_needed": [
    {{
      "workout_id": null (sera rempli par le système),
      "action": "reduce_distance|reduce_intensity|postpone|cancel|none",
      "current_value": "15km",
      "proposed_value": "12km",
      "change_pct": 20,
      "reasoning": "FC élevée + RPE 9/10 indiquent fatigue accumulée"
    }}
  ],
  "narrative_summary": "Excellente séance tempo, allure 3% plus rapide que prévu. Attention : FC légèrement élevée, signe de fatigue accumulée. Réduction de 20% du volume jeudi recommandée."
}}

RÈGLES IMPORTANTES:
1. Si "séance libre" (pas planifiée), analyse uniquement le risque blessure basé sur les zones et l'historique
2. Détecte fatigue si RPE >8 OU FC >10bpm au-dessus zone prévue
3. Détecte risque blessure si: volume +10% en 7j, douleurs répétées, FC anormale
4. Sois précis et concis dans narrative_summary (2-3 phrases max)
5. Réponds SEULEMENT en JSON valide, rien d'autre
"""

    return prompt


def calculate_injury_risk_score(risk_factors: List[str]) -> float:
    """Calculate injury risk score 0-10 based on detected factors."""
    if not risk_factors:
        return 0.0

    # Scoring weights
    factor_weights = {
        "volume_progression_15pct": 3.0,
        "volume_progression_20pct": 5.0,
        "douleur_tfl_repetee": 4.0,
        "douleur_genou_repetee": 4.0,
        "douleur_mollet_repetee": 3.5,
        "fc_elevee_inhabituelle": 2.0,
        "rpe_eleve_consecutif": 2.5,
        "fatigue_accumulee": 2.0,
    }

    score = 0.0
    for factor in risk_factors:
        score += factor_weights.get(factor, 1.5)

    return min(score, 10.0)  # Cap at 10


def generate_adjustment_proposal(
    analysis: WorkoutAnalysis,
    user_id: int,
    db: Session
) -> Optional[AdjustmentProposal]:
    """
    Generate training plan adjustments based on workout analysis.

    Args:
        analysis: WorkoutAnalysis object
        user_id: User ID
        db: Database session

    Returns:
        AdjustmentProposal object with status (auto_applied or pending)
    """
    # Parse analysis for adjustments
    if not analysis.summary:
        return None

    # Get all future planned workouts
    today = datetime.now().date()
    future_workouts = db.query(PlannedWorkout).filter(
        PlannedWorkout.user_id == user_id,
        PlannedWorkout.scheduled_date >= today,
        PlannedWorkout.status == "scheduled"
    ).order_by(PlannedWorkout.scheduled_date).all()

    if not future_workouts:
        logger.info("No future workouts to adjust")
        return None

    # Build adjustment prompt
    prompt = build_adjustment_prompt(analysis, future_workouts)

    try:
        response = call_claude_api(
            prompt=prompt,
            use_sonnet=True
        )

        adjustment_data = json.loads(response["content"])
        adjustments = adjustment_data.get("adjustments", [])

        if not adjustments:
            logger.info("No adjustments recommended by AI")
            return None

        # Enrich adjustments with workout IDs
        for i, adj in enumerate(adjustments):
            if i < len(future_workouts):
                adj["workout_id"] = future_workouts[i].id
                adj["scheduled_date"] = future_workouts[i].scheduled_date.isoformat()

        # Determine if auto-apply or need validation
        max_change = max((adj.get("change_pct", 0) for adj in adjustments), default=0)

        if max_change < 10:
            # Auto-apply small changes
            status = "auto_applied"
            apply_adjustments_automatically(adjustments, db)
        else:
            # Need validation
            status = "pending"

        # Create proposal
        proposal = AdjustmentProposal(
            analysis_id=analysis.id,
            user_id=user_id,
            status=status,
            adjustments=adjustments,
            applied=(status == "auto_applied"),
            created_at=datetime.utcnow()
        )

        db.add(proposal)
        db.commit()
        db.refresh(proposal)

        logger.info(f"✅ Adjustment proposal created: {status}")
        return proposal

    except Exception as e:
        logger.error(f"Error generating adjustment proposal: {str(e)}")
        db.rollback()
        return None


def build_adjustment_prompt(
    analysis: WorkoutAnalysis,
    future_workouts: List[PlannedWorkout]
) -> str:
    """Build prompt for adjustment recommendations."""

    workout_list = "\n".join([
        f"{i+1}. {w.scheduled_date.strftime('%d/%m')} - {w.workout_type}: "
        f"{w.distance_km}km @ {format_pace(w.target_pace_min)}-{format_pace(w.target_pace_max)}"
        for i, w in enumerate(future_workouts[:7])  # Only next 7 workouts
    ])

    prompt = f"""Tu es un coach running expert. Basé sur cette analyse de séance, recommande des ajustements.

ANALYSE SÉANCE:
{analysis.summary}

Performance vs plan: {analysis.performance_vs_plan}
Écart allure: {analysis.pace_variance_pct:+.1f}%
Fatigue détectée: {'Oui' if analysis.fatigue_detected else 'Non'}
Risque blessure: {analysis.injury_risk_score:.1f}/10

PROCHAINES SÉANCES PLANIFIÉES:
{workout_list}

GÉNÈRE AJUSTEMENTS (JSON uniquement):
{{
  "adjustments": [
    {{
      "action": "reduce_distance|reduce_intensity|postpone|cancel|none",
      "current_value": "15km",
      "proposed_value": "12km",
      "change_pct": 20,
      "reasoning": "Fatigue détectée, réduction prudente recommandée"
    }}
  ]
}}

RÈGLES:
1. Si séance s'est bien passée ET pas de fatigue → adjustments: []
2. Limite ajustements à 2-3 séances max (les plus proches)
3. Sois conservateur : mieux prévenir que guérir
4. Si risque blessure >6/10, réduis significativement (20-30%)
5. Si fatigue simple, réduis modérément (10-15%)
6. Réponds SEULEMENT en JSON valide
"""

    return prompt


def apply_adjustments_automatically(
    adjustments: List[Dict[str, Any]],
    db: Session
) -> None:
    """Apply adjustments automatically (<10% changes)."""
    for adj in adjustments:
        workout_id = adj.get("workout_id")
        if not workout_id:
            continue

        workout = db.query(PlannedWorkout).filter(
            PlannedWorkout.id == workout_id
        ).first()

        if not workout:
            continue

        action = adj.get("action")

        if action == "reduce_distance":
            # Parse proposed value (e.g., "12km" -> 12.0)
            proposed_str = adj.get("proposed_value", "")
            try:
                new_distance = float(proposed_str.replace("km", "").strip())
                workout.distance_km = new_distance
                logger.info(f"Auto-adjusted workout {workout_id}: distance {workout.distance_km} -> {new_distance}")
            except:
                pass

        elif action == "reduce_intensity":
            # Increase target pace by 5-10 sec/km
            if workout.target_pace_min:
                workout.target_pace_min += 5
                workout.target_pace_max += 5
                logger.info(f"Auto-adjusted workout {workout_id}: reduced intensity")

        elif action == "cancel":
            workout.status = "skipped"
            logger.info(f"Auto-canceled workout {workout_id}")

    db.commit()


def detect_injury_risk(
    workout_id: int,
    user_id: int,
    db: Session
) -> Optional[Dict[str, Any]]:
    """
    Detect injury risk patterns.

    Returns dict with risk factors or None
    """
    # Get recent workouts (last 14 days)
    two_weeks_ago = datetime.now() - timedelta(days=14)
    recent = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= two_weeks_ago
    ).order_by(desc(Workout.date)).all()

    if len(recent) < 2:
        return None

    risk_factors = []

    # Check volume progression
    week1_volume = sum(w.distance for w in recent[:7] if w.distance)
    week2_volume = sum(w.distance for w in recent[7:14] if w.distance)

    if week2_volume > 0:
        progression_pct = ((week1_volume - week2_volume) / week2_volume) * 100
        if progression_pct > 15:
            risk_factors.append("volume_progression_15pct")
        if progression_pct > 20:
            risk_factors.append("volume_progression_20pct")

    # Check repeated pain
    feedbacks = db.query(WorkoutFeedback).join(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= two_weeks_ago,
        WorkoutFeedback.pain_locations.isnot(None)
    ).all()

    pain_counts = {}
    for f in feedbacks:
        if f.pain_locations:
            for location in f.pain_locations:
                pain_counts[location] = pain_counts.get(location, 0) + 1

    for location, count in pain_counts.items():
        if count >= 3:
            risk_factors.append(f"douleur_{location}_repetee")

    # Check consecutive high RPE
    high_rpe_count = sum(
        1 for f in db.query(WorkoutFeedback).join(Workout).filter(
            Workout.user_id == user_id,
            Workout.date >= two_weeks_ago
        ).all()
        if f.rpe and f.rpe >= 8
    )

    if high_rpe_count >= 3:
        risk_factors.append("rpe_eleve_consecutif")

    if risk_factors:
        return {
            "risk_factors": risk_factors,
            "score": calculate_injury_risk_score(risk_factors)
        }

    return None
