"""
Feedback Analyzer

Analyzes workout feedback to detect issues and recommend adjustments for the next training block:
- Overtraining signals (high RPE, too hard difficulty)
- Injury risk (pain locations, severity)
- Pace variance (actual vs planned)
- ACWR (Acute Chronic Workload Ratio)
- 80/20 ratio compliance
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_

from models import (
    WorkoutFeedback,
    PlannedWorkout,
    Workout,
    TrainingBlock
)


class FeedbackAnalysis:
    """Results of feedback analysis."""

    def __init__(self):
        self.total_workouts = 0
        self.avg_rpe = 0.0
        self.too_hard_percentage = 0.0
        self.pain_percentage = 0.0
        self.avg_pace_variance = 0.0
        self.pain_locations = {}  # {location: count}
        self.warnings = []
        self.recommendations = []
        self.suggested_volume_adjustment = 0.0  # Percentage
        self.suggested_phase = None

    def has_critical_issues(self) -> bool:
        """Check if there are critical issues requiring immediate action."""
        return len(self.warnings) > 0 and (
            self.too_hard_percentage > 50 or
            self.pain_percentage > 30 or
            self.avg_rpe > 7.5
        )


def analyze_block_feedback(db: Session, block_id: int) -> FeedbackAnalysis:
    """
    Analyze all feedback for a training block.

    Args:
        db: Database session
        block_id: Training block ID

    Returns:
        FeedbackAnalysis with warnings and recommendations
    """
    analysis = FeedbackAnalysis()

    # Get all planned workouts for this block
    planned_workouts = db.query(PlannedWorkout).filter(
        PlannedWorkout.block_id == block_id,
        PlannedWorkout.status == "completed"
    ).all()

    if not planned_workouts:
        return analysis

    analysis.total_workouts = len(planned_workouts)

    # Get all feedback for completed workouts
    completed_workout_ids = [w.completed_workout_id for w in planned_workouts if w.completed_workout_id]

    feedbacks = db.query(WorkoutFeedback).filter(
        WorkoutFeedback.completed_workout_id.in_(completed_workout_ids)
    ).all()

    if not feedbacks:
        return analysis

    # Calculate metrics
    rpes = [f.rpe for f in feedbacks if f.rpe is not None]
    if rpes:
        analysis.avg_rpe = sum(rpes) / len(rpes)

    too_hard_count = sum(1 for f in feedbacks if f.difficulty == "too_hard")
    analysis.too_hard_percentage = (too_hard_count / len(feedbacks)) * 100

    pain_count = sum(1 for f in feedbacks if f.pain_locations and len(f.pain_locations) > 0)
    analysis.pain_percentage = (pain_count / len(feedbacks)) * 100

    # Aggregate pain locations
    for f in feedbacks:
        if f.pain_locations:
            for location in f.pain_locations:
                if location != "none":
                    analysis.pain_locations[location] = analysis.pain_locations.get(location, 0) + 1

    # Calculate pace variance
    pace_variances = [f.pace_variance for f in feedbacks if f.pace_variance is not None]
    if pace_variances:
        analysis.avg_pace_variance = sum(pace_variances) / len(pace_variances)

    # Generate warnings
    _generate_warnings(analysis)

    # Generate recommendations
    _generate_recommendations(analysis)

    return analysis


def _generate_warnings(analysis: FeedbackAnalysis):
    """Generate warnings based on analysis."""

    # High RPE warning
    if analysis.avg_rpe > 7.5:
        analysis.warnings.append({
            "type": "overtraining",
            "severity": "critical" if analysis.avg_rpe > 8.5 else "high",
            "message": f"RPE moyen très élevé ({analysis.avg_rpe:.1f}/10). Risque de surentraînement.",
            "icon": "🚨"
        })

    # Too hard workouts
    if analysis.too_hard_percentage > 50:
        analysis.warnings.append({
            "type": "difficulty",
            "severity": "critical",
            "message": f"{analysis.too_hard_percentage:.0f}% des séances jugées trop difficiles. Le plan est trop ambitieux.",
            "icon": "⚠️"
        })
    elif analysis.too_hard_percentage > 25:
        analysis.warnings.append({
            "type": "difficulty",
            "severity": "medium",
            "message": f"{analysis.too_hard_percentage:.0f}% des séances trop difficiles. Ajustement recommandé.",
            "icon": "⚠️"
        })

    # Pain warnings
    if analysis.pain_percentage > 30:
        pain_list = ", ".join([f"{loc} ({count}x)" for loc, count in sorted(analysis.pain_locations.items(), key=lambda x: x[1], reverse=True)])
        analysis.warnings.append({
            "type": "injury_risk",
            "severity": "critical",
            "message": f"{analysis.pain_percentage:.0f}% des séances avec douleur ({pain_list}). Risque de blessure élevé.",
            "icon": "🩹"
        })

        # Specific IT band warning
        if "it_band" in analysis.pain_locations:
            analysis.warnings.append({
                "type": "it_band",
                "severity": "high",
                "message": f"Syndrome de la bandelette IT détecté ({analysis.pain_locations['it_band']} séances). Repos et renforcement TFL/hanche prioritaires.",
                "icon": "🚨"
            })

        # Ankle warning
        if "ankle" in analysis.pain_locations:
            analysis.warnings.append({
                "type": "ankle",
                "severity": "high",
                "message": f"Douleurs cheville récurrentes ({analysis.pain_locations['ankle']} séances). Renforcement proprioception urgente.",
                "icon": "🚨"
            })

    # Pace variance warning
    if analysis.avg_pace_variance > 15:
        analysis.warnings.append({
            "type": "pace_variance",
            "severity": "high",
            "message": f"Allures {analysis.avg_pace_variance:+.0f}% par rapport au plan. Les zones d'entraînement sont mal calibrées.",
            "icon": "⏱️"
        })


def _generate_recommendations(analysis: FeedbackAnalysis):
    """Generate recommendations for next block."""

    # Volume adjustment
    if analysis.too_hard_percentage > 50 or analysis.avg_rpe > 7.5:
        analysis.suggested_volume_adjustment = -20.0
        analysis.recommendations.append({
            "type": "volume",
            "priority": "high",
            "message": "Réduire le volume de -20% pour le prochain bloc",
            "icon": "📉"
        })
    elif analysis.too_hard_percentage > 25:
        analysis.suggested_volume_adjustment = -10.0
        analysis.recommendations.append({
            "type": "volume",
            "priority": "medium",
            "message": "Réduire le volume de -10% pour le prochain bloc",
            "icon": "📉"
        })
    elif analysis.avg_pace_variance > 15:
        analysis.suggested_volume_adjustment = -15.0
        analysis.recommendations.append({
            "type": "volume",
            "priority": "high",
            "message": "Volume actuel trop élevé pour ton niveau. Réduire de -15%",
            "icon": "📉"
        })

    # Phase adjustment
    if analysis.has_critical_issues():
        analysis.suggested_phase = "recovery"
        analysis.recommendations.append({
            "type": "phase",
            "priority": "critical",
            "message": "Passer en phase RÉCUPÉRATION (80/15/5) au lieu de poursuivre la progression",
            "icon": "🛑"
        })

    # Intensity adjustment
    if analysis.too_hard_percentage > 30:
        analysis.recommendations.append({
            "type": "intensity",
            "priority": "high",
            "message": "Réduire l'intensité des séances qualité de 5-10 sec/km",
            "icon": "🎯"
        })

    # Pain-specific recommendations
    if "it_band" in analysis.pain_locations:
        analysis.recommendations.append({
            "type": "strengthening",
            "priority": "critical",
            "message": "URGENT: Renforcement TFL/abducteurs de hanche 4-5x/semaine minimum",
            "icon": "💪"
        })
        analysis.recommendations.append({
            "type": "rest",
            "priority": "high",
            "message": "Ajouter 1-2 jours de repos supplémentaires par semaine",
            "icon": "😴"
        })

    if "ankle" in analysis.pain_locations:
        analysis.recommendations.append({
            "type": "strengthening",
            "priority": "critical",
            "message": "URGENT: Proprioception cheville 5x/semaine minimum",
            "icon": "💪"
        })

    # VDOT recalibration
    if analysis.avg_pace_variance > 15:
        analysis.recommendations.append({
            "type": "vdot",
            "priority": "high",
            "message": f"Recalibrer les zones d'entraînement (allures actuelles {analysis.avg_pace_variance:+.0f}% vs plan)",
            "icon": "🔄"
        })

    # Positive feedback
    if analysis.avg_rpe <= 6.5 and analysis.too_hard_percentage < 10 and analysis.pain_percentage == 0:
        analysis.recommendations.append({
            "type": "progression",
            "priority": "low",
            "message": "Progression solide ! Tu peux augmenter le volume de +5-10% prudemment",
            "icon": "✅"
        })


def calculate_acwr(db: Session, user_id: int) -> float:
    """
    Calculate Acute Chronic Workload Ratio (ACWR).

    ACWR = (Load last 7 days) / (Load last 28 days / 4)
    Safe range: 0.8 - 1.3
    > 1.5 = high injury risk

    Args:
        db: Database session
        user_id: User ID

    Returns:
        ACWR ratio
    """
    today = datetime.now()
    last_7_days = today - timedelta(days=7)
    last_28_days = today - timedelta(days=28)

    # Get workouts
    recent_workouts = db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= last_7_days,
            Workout.distance.isnot(None)
        )
    ).all()

    chronic_workouts = db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= last_28_days,
            Workout.distance.isnot(None)
        )
    ).all()

    if not chronic_workouts:
        return 0.0

    acute_load = sum(w.distance for w in recent_workouts if w.distance)
    chronic_load = sum(w.distance for w in chronic_workouts if w.distance) / 4

    if chronic_load == 0:
        return 0.0

    return acute_load / chronic_load


def get_block_summary(db: Session, block_id: int) -> Dict:
    """
    Get a complete summary of a training block with feedback analysis.

    Args:
        db: Database session
        block_id: Training block ID

    Returns:
        Dictionary with block stats and analysis
    """
    block = db.query(TrainingBlock).filter(TrainingBlock.id == block_id).first()

    if not block:
        raise ValueError(f"Block {block_id} not found")

    total_workouts = len(block.planned_workouts)
    completed = sum(1 for w in block.planned_workouts if w.status == "completed")
    skipped = sum(1 for w in block.planned_workouts if w.status == "skipped")

    analysis = analyze_block_feedback(db, block_id)

    return {
        "block_id": block.id,
        "block_name": block.name,
        "phase": block.phase,
        "start_date": block.start_date,
        "end_date": block.end_date,
        "total_workouts": total_workouts,
        "completed_workouts": completed,
        "skipped_workouts": skipped,
        "completion_rate": (completed / total_workouts * 100) if total_workouts > 0 else 0,
        "analysis": {
            "avg_rpe": analysis.avg_rpe,
            "too_hard_percentage": analysis.too_hard_percentage,
            "pain_percentage": analysis.pain_percentage,
            "avg_pace_variance": analysis.avg_pace_variance,
            "pain_locations": analysis.pain_locations,
            "has_critical_issues": analysis.has_critical_issues(),
        },
        "warnings": analysis.warnings,
        "recommendations": analysis.recommendations,
        "suggested_volume_adjustment": analysis.suggested_volume_adjustment,
        "suggested_phase": analysis.suggested_phase or block.phase
    }
