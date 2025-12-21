"""
Training Block Generator

Generates 4-week training blocks with scientific periodization principles:
- Week 1-3: Progressive volume increase
- Week 4: Recovery week (-30-40% volume)
- Respects 80/20 ratio (80% easy, 20% hard)
- Includes strengthening reminders
- Personalized paces based on VDOT
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from models import (
    TrainingBlock,
    PlannedWorkout,
    StrengtheningReminder,
    TrainingZone,
    PersonalRecord,
    Workout,
    UserPreferences,
    InjuryHistory
)
from services.vdot_calculator import get_best_vdot_from_prs, calculate_training_paces
from services.ai_workout_generator import generate_personalized_workout_descriptions
from services.block_adjustment_service import (
    analyze_previous_block,
    generate_block_adjustments_with_ai,
    apply_adjustments_to_paces
)
from services.injury_strengthening import (
    get_injury_summary_for_ai,
    get_strengthening_priorities,
    select_strengthening_sessions
)
import logging

logger = logging.getLogger(__name__)


# Phase configurations (easy%, threshold%, interval%)
PHASE_RATIOS = {
    "base": {"easy": 70, "threshold": 20, "interval": 10},
    "development": {"easy": 60, "threshold": 25, "interval": 15},
    "peak": {"easy": 50, "threshold": 30, "interval": 20},
    "taper": {"easy": 75, "threshold": 15, "interval": 10},  # Volume réduit, intensité maintenue
}

# French day names
DAYS_FR = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]

# Day name to offset mapping (English, lowercase)
DAY_NAME_TO_OFFSET = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6
}


def calculate_or_update_training_zones(db: Session, user_id: int) -> TrainingZone:
    """
    Calculate training zones from personal records and store/update in database.

    Args:
        db: Database session
        user_id: User ID

    Returns:
        TrainingZone object with current zones
    """
    # Get user's personal records
    prs = db.query(PersonalRecord).filter(
        PersonalRecord.user_id == user_id,
        PersonalRecord.is_current == 1
    ).all()

    if not prs:
        raise ValueError("No personal records found. Please add at least one PR to calculate training zones.")

    # Calculate VDOT from best PR
    vdot, source_distance = get_best_vdot_from_prs(prs)

    # Get training paces
    paces = calculate_training_paces(vdot)

    # Find source PR details
    source_pr = next((pr for pr in prs if pr.distance == source_distance), prs[0])

    # Check if we need to update zones (VDOT changed significantly)
    current_zone = db.query(TrainingZone).filter(
        TrainingZone.user_id == user_id,
        TrainingZone.is_current == True
    ).first()

    if current_zone and abs(current_zone.vdot - vdot) < 0.5:
        # VDOT hasn't changed significantly, return current zone
        return current_zone

    # Supersede old zone if exists
    if current_zone:
        current_zone.is_current = False
        current_zone.superseded_at = datetime.utcnow()

    # Create new training zone
    new_zone = TrainingZone(
        user_id=user_id,
        vdot=vdot,
        source_distance=source_distance,
        source_time_seconds=source_pr.time_seconds,
        easy_min_pace_sec=paces["easy"]["min_pace_sec"],
        easy_max_pace_sec=paces["easy"]["max_pace_sec"],
        marathon_pace_sec=paces["marathon"]["pace_sec"],
        threshold_min_pace_sec=paces["threshold"]["min_pace_sec"],
        threshold_max_pace_sec=paces["threshold"]["max_pace_sec"],
        interval_min_pace_sec=paces["interval"]["min_pace_sec"],
        interval_max_pace_sec=paces["interval"]["max_pace_sec"],
        repetition_min_pace_sec=paces["repetition"]["min_pace_sec"],
        repetition_max_pace_sec=paces["repetition"]["max_pace_sec"],
        is_current=True
    )

    db.add(new_zone)
    db.commit()
    db.refresh(new_zone)

    return new_zone


def _get_user_schedule_from_preferences(
    db: Session,
    user_id: int,
    days_per_week: int,
    override_preferred_days: Optional[List[str]] = None
) -> Dict[int, Tuple[str, float]]:
    """
    Get training schedule based on user preferences.

    Args:
        db: Database session
        user_id: User ID
        days_per_week: Number of training days per week
        override_preferred_days: Optional list to override DB preferences

    Returns:
        Dictionary mapping day_offset -> (workout_type, volume_percentage)
        e.g., {1: ("quality", 0.30), 3: ("easy", 0.25), 5: ("long", 0.45)}
    """
    # Query user preferences from DB
    user_prefs = db.query(UserPreferences).filter(
        UserPreferences.user_id == user_id
    ).first()

    # Use override if provided, otherwise use DB preferences
    preferred_days = override_preferred_days or (user_prefs.preferred_days if user_prefs else None)

    # Default schedules if no preferences
    default_schedules = {
        3: {1: ("quality", 0.30), 3: ("easy", 0.25), 5: ("long", 0.45)},  # Tue/Thu/Sat
        4: {1: ("quality", 0.25), 3: ("easy", 0.25), 5: ("long", 0.35), 6: ("recovery", 0.15)},
        5: {1: ("easy", 0.20), 2: ("quality", 0.25), 3: ("easy", 0.15), 5: ("long", 0.30), 6: ("recovery", 0.10)},
        6: {0: ("easy", 0.15), 1: ("quality", 0.25), 2: ("easy", 0.15), 4: ("quality", 0.20), 5: ("long", 0.20), 6: ("recovery", 0.05)}
    }

    # If no preferences or preferred_days not set, use defaults
    if not preferred_days or len(preferred_days) < days_per_week:
        logger.info(f"No user preferences found or insufficient preferred days, using default schedule for {days_per_week} days/week")
        return default_schedules.get(days_per_week, default_schedules[3])

    # Convert preferred day names to offsets
    day_offsets = []
    for day_name in preferred_days[:days_per_week]:
        offset = DAY_NAME_TO_OFFSET.get(day_name.lower())
        if offset is not None:
            day_offsets.append(offset)

    # Ensure we have enough days
    if len(day_offsets) < days_per_week:
        logger.warning(f"Only found {len(day_offsets)} valid day offsets from preferences, using default schedule")
        return default_schedules.get(days_per_week, default_schedules[3])

    # Sort days
    day_offsets.sort()

    # Build schedule based on number of days per week
    schedule = {}

    if days_per_week == 3:
        # Quality (30%), Easy (25%), Long (45%)
        schedule[day_offsets[0]] = ("quality", 0.30)
        schedule[day_offsets[1]] = ("easy", 0.25)
        schedule[day_offsets[2]] = ("long", 0.45)
    elif days_per_week == 4:
        # Quality, Easy, Long, Recovery
        schedule[day_offsets[0]] = ("quality", 0.25)
        schedule[day_offsets[1]] = ("easy", 0.25)
        schedule[day_offsets[2]] = ("long", 0.35)
        schedule[day_offsets[3]] = ("recovery", 0.15)
    elif days_per_week == 5:
        # Easy, Quality, Easy, Long, Recovery
        schedule[day_offsets[0]] = ("easy", 0.20)
        schedule[day_offsets[1]] = ("quality", 0.25)
        schedule[day_offsets[2]] = ("easy", 0.15)
        schedule[day_offsets[3]] = ("long", 0.30)
        schedule[day_offsets[4]] = ("recovery", 0.10)
    else:  # 6 days
        # Easy, Quality, Easy, Quality, Long, Recovery
        schedule[day_offsets[0]] = ("easy", 0.15)
        schedule[day_offsets[1]] = ("quality", 0.25)
        schedule[day_offsets[2]] = ("easy", 0.15)
        schedule[day_offsets[3]] = ("quality", 0.20)
        schedule[day_offsets[4]] = ("long", 0.20)
        schedule[day_offsets[5]] = ("recovery", 0.05)

    logger.info(f"Using user preferences: preferred_days={preferred_days}, schedule={schedule}")
    return schedule


def _should_add_sunday_recovery(
    db: Session,
    user_id: int,
    base_volume: float,
    phase: str,
    days_per_week: int
) -> bool:
    """
    Automatically determine if Sunday recovery runs should be added.

    Criteria for adding recovery runs:
    1. Volume threshold: >= 25km/week (high enough to benefit from active recovery)
    2. Not in base phase: development/peak phases handle more volume better with recovery
    3. Consistent training: Recent 4-week average shows regular training
    4. Days per week: Only 3-4 days (5-6 days already have enough frequency)

    Returns:
        True if Sunday recovery runs should be added
    """
    # Criterion 1: Volume threshold
    if base_volume < 25.0:
        logger.info(f"Volume {base_volume:.1f}km < 25km, no Sunday recovery needed")
        return False

    # Criterion 2: Phase - only in development/peak
    if phase not in ["development", "peak"]:
        logger.info(f"Phase '{phase}' is base/taper, no Sunday recovery needed yet")
        return False

    # Criterion 3: Days per week - only beneficial for 3-4 days/week
    if days_per_week >= 5:
        logger.info(f"Already training {days_per_week} days/week, no need for Sunday recovery")
        return False

    # Criterion 4: Check consistency - user has been training regularly
    recent_volume = calculate_recent_volume(db, user_id, weeks=4)
    if recent_volume < 15.0:  # Less than 15km/week average = not ready yet
        logger.info(f"Recent volume {recent_volume:.1f}km too low, not ready for Sunday recovery")
        return False

    logger.info(f"✅ Auto-adding Sunday recovery: volume={base_volume:.1f}km, phase={phase}, days={days_per_week}")
    return True


def analyze_recent_context(db: Session, user_id: int, weeks: int = 4) -> Dict:
    """
    Analyze recent workout comments and injuries to gather context for block generation.
    This works independently of whether a previous block was completed.

    Args:
        db: Database session
        user_id: User ID
        weeks: Number of weeks to analyze

    Returns:
        Dictionary with context information including issues found
    """
    cutoff_date = datetime.now() - timedelta(weeks=weeks)

    # Get recent workouts with comments
    workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= cutoff_date
    ).order_by(Workout.date.desc()).all()

    # Analyze comments for issues
    pain_mentions = 0
    fatigue_mentions = 0
    too_hard_mentions = 0
    workouts_with_comments = 0
    comment_details = []

    pain_keywords = ["douleur", "mal", "blessure", "injury", "pain", "genou", "rotule", "cheville", "mollet", "tendon"]
    fatigue_keywords = ["fatigué", "épuisé", "fatigue", "tired", "exhausted", "lourd", "jambes lourdes"]
    hard_keywords = ["trop dur", "impossible", "explosé", "couldn't", "too hard", "difficile", "abandon"]

    for w in workouts:
        if w.notes:
            workouts_with_comments += 1
            comment_lower = w.notes.lower()

            if any(word in comment_lower for word in pain_keywords):
                pain_mentions += 1
                comment_details.append({
                    "date": w.date.strftime("%Y-%m-%d"),
                    "type": "pain",
                    "comment": w.notes[:200]
                })
            if any(word in comment_lower for word in fatigue_keywords):
                fatigue_mentions += 1
                comment_details.append({
                    "date": w.date.strftime("%Y-%m-%d"),
                    "type": "fatigue",
                    "comment": w.notes[:200]
                })
            if any(word in comment_lower for word in hard_keywords):
                too_hard_mentions += 1
                comment_details.append({
                    "date": w.date.strftime("%Y-%m-%d"),
                    "type": "too_hard",
                    "comment": w.notes[:200]
                })

    # Get active injuries
    active_injuries = db.query(InjuryHistory).filter(
        InjuryHistory.user_id == user_id,
        (InjuryHistory.status.in_(["active", "monitoring"])) | (InjuryHistory.recurrence_count > 0)
    ).all()

    injury_details = []
    for injury in active_injuries:
        injury_details.append({
            "location": injury.location,
            "status": injury.status,
            "severity": injury.severity,
            "recurring": injury.recurrence_count > 0,
            "description": injury.description
        })

    has_issues = pain_mentions > 0 or fatigue_mentions >= 2 or too_hard_mentions > 0
    has_injuries = len(active_injuries) > 0

    return {
        "total_workouts": len(workouts),
        "workouts_with_comments": workouts_with_comments,
        "pain_mentions": pain_mentions,
        "fatigue_mentions": fatigue_mentions,
        "too_hard_mentions": too_hard_mentions,
        "comment_details": comment_details,
        "active_injuries": len(active_injuries),
        "injury_details": injury_details,
        "has_issues": has_issues,
        "has_injuries": has_injuries
    }


def generate_initial_adjustments_from_context(
    db: Session,
    user_id: int,
    recent_context: Dict,
    next_phase: str
) -> Dict:
    """
    Generate block adjustments based on recent context when no previous block exists.
    Uses a simpler rule-based approach combined with AI for recommendations.

    Args:
        db: Database session
        user_id: User ID
        recent_context: Output from analyze_recent_context()
        next_phase: Planned phase for next block

    Returns:
        Dictionary with adjustment recommendations
    """
    from services.claude_service import call_claude_api
    import json

    # Build context for AI
    injury_summary = get_injury_summary_for_ai(db, user_id)

    prompt = f"""Tu es un coach running expert. Un nouvel athlète veut commencer un bloc d'entraînement.
Il n'a pas de bloc précédent complété, mais voici ce que nous savons de son contexte récent (4 dernières semaines).

CONTEXTE RÉCENT:
- Séances totales: {recent_context['total_workouts']}
- Séances avec commentaires: {recent_context['workouts_with_comments']}
- Mentions de douleur: {recent_context['pain_mentions']}
- Mentions de fatigue: {recent_context['fatigue_mentions']}
- Séances "trop dures": {recent_context['too_hard_mentions']}

COMMENTAIRES SIGNIFICATIFS:
{json.dumps(recent_context.get('comment_details', []), indent=2, ensure_ascii=False)}

BLESSURES:
{injury_summary}
Détails: {json.dumps(recent_context.get('injury_details', []), indent=2, ensure_ascii=False)}

PHASE PRÉVUE: {next_phase}

CONSIGNES:
1. Analyse les problèmes potentiels (douleurs, blessures, fatigue)
2. Propose des ajustements CONSERVATEURS pour le premier bloc
3. Si blessures actives → réduction d'allure significative (-10 à -20 sec/km)
4. Si douleurs récurrentes → adapter le volume et éviter certains types de séances
5. Sois prudent : mieux vaut être conservateur au début

RÉPONDS EN JSON STRICT:
{{
  "overall_assessment": "good" | "needs_adjustment" | "needs_significant_reduction",
  "key_findings": [
    "Description factuelle des problèmes identifiés"
  ],
  "adjustments": {{
    "pace_adjustments": {{
      "easy_runs": {{"change_seconds_per_km": 0, "reason": "..."}},
      "tempo_runs": {{"change_seconds_per_km": 0, "reason": "..."}},
      "intervals": {{"change_seconds_per_km": 0, "reason": "..."}}
    }},
    "volume_adjustments": {{
      "weekly_volume_change_percent": 0,
      "reason": "..."
    }},
    "workout_modifications": [],
    "recovery_recommendations": []
  }},
  "next_block_strategy": "Description de l'approche recommandée (2-3 phrases)"
}}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après."""

    try:
        response = call_claude_api(prompt, use_sonnet=True)
        content = response["content"]

        start_idx = content.find("{")
        end_idx = content.rfind("}") + 1

        if start_idx >= 0 and end_idx > start_idx:
            adjustments = json.loads(content[start_idx:end_idx])
            logger.info(f"✅ Initial adjustments generated from context for user {user_id}")
            return adjustments
        else:
            raise ValueError("Invalid JSON in Claude response")

    except Exception as e:
        logger.error(f"❌ Error generating initial adjustments: {e}")

        # Rule-based fallback
        assessment = "good"
        findings = []
        pace_adj = {"easy_runs": {"change_seconds_per_km": 0, "reason": "Standard"},
                    "tempo_runs": {"change_seconds_per_km": 0, "reason": "Standard"},
                    "intervals": {"change_seconds_per_km": 0, "reason": "Standard"}}
        volume_adj = {"weekly_volume_change_percent": 0, "reason": "Standard progression"}

        if recent_context.get("active_injuries", 0) > 0:
            assessment = "needs_significant_reduction"
            findings.append("Blessures actives détectées - approche conservatrice requise")
            pace_adj = {"easy_runs": {"change_seconds_per_km": 10, "reason": "Blessure active"},
                        "tempo_runs": {"change_seconds_per_km": 15, "reason": "Blessure active"},
                        "intervals": {"change_seconds_per_km": 10, "reason": "Blessure active"}}
            volume_adj = {"weekly_volume_change_percent": -15, "reason": "Réduction pour blessure"}

        elif recent_context.get("pain_mentions", 0) >= 2:
            assessment = "needs_adjustment"
            findings.append("Douleurs récurrentes mentionnées dans les commentaires")
            pace_adj = {"easy_runs": {"change_seconds_per_km": 5, "reason": "Douleurs signalées"},
                        "tempo_runs": {"change_seconds_per_km": 10, "reason": "Douleurs signalées"},
                        "intervals": {"change_seconds_per_km": 5, "reason": "Douleurs signalées"}}
            volume_adj = {"weekly_volume_change_percent": -10, "reason": "Réduction préventive"}

        elif recent_context.get("fatigue_mentions", 0) >= 3:
            assessment = "needs_adjustment"
            findings.append("Fatigue fréquemment mentionnée")
            volume_adj = {"weekly_volume_change_percent": -10, "reason": "Fatigue accumulée"}

        return {
            "overall_assessment": assessment,
            "key_findings": findings if findings else ["Pas de problème majeur détecté"],
            "adjustments": {
                "pace_adjustments": pace_adj,
                "volume_adjustments": volume_adj,
                "workout_modifications": [],
                "recovery_recommendations": []
            },
            "next_block_strategy": "Approche standard avec surveillance des sensations"
        }


def calculate_recent_volume(db: Session, user_id: int, weeks: int = 4) -> float:
    """
    Calculate average weekly volume over recent weeks.

    Args:
        db: Database session
        user_id: User ID
        weeks: Number of weeks to average

    Returns:
        Average km per week
    """
    cutoff_date = datetime.now() - timedelta(weeks=weeks)

    workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= cutoff_date,
        Workout.distance.isnot(None)
    ).all()

    if not workouts:
        return 0.0

    total_distance = sum(w.distance for w in workouts if w.distance)
    return total_distance / weeks


def generate_4_week_block(
    db: Session,
    user_id: int,
    phase: str = "base",
    days_per_week: int = 3,
    start_date: Optional[datetime] = None,
    target_volume: Optional[float] = None,
    use_ai_descriptions: bool = True,
    use_sonnet: bool = False,
    add_recovery_sunday: bool = False,
    num_weeks: int = 4,
    preferred_days: Optional[List[str]] = None,
    preferred_time: Optional[str] = None
) -> TrainingBlock:
    """
    Generate a training block with progressive loading and recovery.

    Args:
        db: Database session
        user_id: User ID
        phase: Training phase ("base", "development", "peak")
        days_per_week: Number of running days per week (3-6)
        start_date: Start date (defaults to next Monday)
        target_volume: Optional target weekly volume in km
        use_ai_descriptions: Whether to generate AI descriptions
        use_sonnet: Whether to use Sonnet model for AI descriptions
        add_recovery_sunday: Whether to add Sunday recovery runs
        num_weeks: Number of weeks for the block (default: 4, can be 1-4)
        preferred_days: Optional list of preferred day names (e.g., ["monday", "wednesday", "saturday"])
                       If not provided, falls back to user preferences in DB
        preferred_time: Optional preferred workout time (e.g., "18:00")
                       If not provided, falls back to user preferences in DB or defaults to "18:00"

    Returns:
        TrainingBlock with all planned workouts and strengthening reminders
    """
    # Validate inputs
    if phase not in PHASE_RATIOS:
        raise ValueError(f"Invalid phase: {phase}. Must be one of: {list(PHASE_RATIOS.keys())}")
    if days_per_week < 3 or days_per_week > 6:
        raise ValueError("days_per_week must be between 3 and 6")

    # Check if there's already an active block
    existing_block = db.query(TrainingBlock).filter(
        TrainingBlock.user_id == user_id,
        TrainingBlock.status == "active"
    ).first()

    if existing_block:
        raise ValueError(
            f"You already have an active training block (ID: {existing_block.id}, started {existing_block.start_date.strftime('%d/%m/%Y')}). "
            "Please complete or abandon it before creating a new one."
        )

    # Calculate or update training zones
    zones = calculate_or_update_training_zones(db, user_id)

    # 🆕 ANALYZE CONTEXT FOR AUTOMATIC ADJUSTMENTS
    # This now works even without a completed block - uses recent workouts, comments, and injuries
    previous_block_analysis = analyze_previous_block(db, user_id)
    recent_context = analyze_recent_context(db, user_id)  # NEW: Always get context
    block_adjustments = None
    adjusted_paces = None

    # Get injury summary for logging
    injury_summary = get_injury_summary_for_ai(db, user_id)
    logger.info(f"🏥 {injury_summary}")

    if previous_block_analysis:
        logger.info(f"📊 Found previous block to analyze (ID: {previous_block_analysis['block_id']})")
        logger.info(f"   Completion rate: {previous_block_analysis['completion_rate']:.1%}")
        logger.info(f"   Pain episodes: {previous_block_analysis['issue_counts']['pain_episodes']}")
        logger.info(f"   Fatigue episodes: {previous_block_analysis['issue_counts']['fatigue_episodes']}")
        logger.info(f"   Too hard episodes: {previous_block_analysis['issue_counts']['too_hard_episodes']}")

        # Generate AI-powered adjustments with full context
        block_adjustments = generate_block_adjustments_with_ai(
            db=db,
            user_id=user_id,
            previous_block_analysis=previous_block_analysis,
            next_phase=phase,
            recent_context=recent_context  # Pass additional context
        )
    elif recent_context and (recent_context.get("has_issues") or recent_context.get("has_injuries")):
        # NEW: Generate adjustments even without completed block if there are issues/injuries
        logger.info("ℹ️  No previous block, but found recent context to analyze")
        logger.info(f"   Recent workouts with comments: {recent_context.get('workouts_with_comments', 0)}")
        logger.info(f"   Pain mentions: {recent_context.get('pain_mentions', 0)}")
        logger.info(f"   Fatigue mentions: {recent_context.get('fatigue_mentions', 0)}")
        logger.info(f"   Active injuries: {recent_context.get('active_injuries', 0)}")

        block_adjustments = generate_initial_adjustments_from_context(
            db=db,
            user_id=user_id,
            recent_context=recent_context,
            next_phase=phase
        )
    else:
        logger.info("ℹ️  No previous block and no concerning context - using standard progression")

    if block_adjustments:
        logger.info(f"✅ Block adjustments generated:")
        logger.info(f"   Assessment: {block_adjustments['overall_assessment']}")
        logger.info(f"   Key findings: {block_adjustments['key_findings']}")

        # Calculate base paces from VDOT
        base_paces = calculate_training_paces(zones.vdot)

        # Apply adjustments to paces
        adjusted_paces = apply_adjustments_to_paces(base_paces, block_adjustments)

        logger.info(f"🎯 Pace adjustments applied:")
        if "pace_adjustments" in block_adjustments.get("adjustments", {}):
            for workout_type, adj in block_adjustments["adjustments"]["pace_adjustments"].items():
                change = adj.get("change_seconds_per_km", 0)
                if change != 0:
                    logger.info(f"   {workout_type}: {change:+d} sec/km - {adj.get('reason', '')}")

    # Determine base volume
    if target_volume is not None:
        # Use provided target volume (e.g., from adaptation logic)
        base_volume = target_volume
    else:
        # Calculate recent volume to determine starting point
        recent_volume = calculate_recent_volume(db, user_id)
        if recent_volume == 0:
            # No recent data, start conservatively
            base_volume = 15.0 if days_per_week == 3 else 20.0
        else:
            base_volume = recent_volume

        # Apply volume adjustment if recommended
        if block_adjustments:
            volume_adj = block_adjustments.get("adjustments", {}).get("volume_adjustments", {})
            volume_change_pct = volume_adj.get("weekly_volume_change_percent", 0)
            if volume_change_pct != 0:
                base_volume = base_volume * (1 + volume_change_pct / 100)
                logger.info(f"📉 Volume adjusted by {volume_change_pct:+.0f}% → {base_volume:.1f}km/week")

    # Safety check: warn if volume seems high relative to VDOT level
    # This is informational only - we trust the user's actual training history
    vdot_volume_guidelines = {
        # VDOT ranges and suggested max weekly volume (conservative)
        # These are rough guidelines, not hard limits
        (30, 35): 30,   # Beginner: ~30km/week max
        (35, 40): 40,   # Intermediate: ~40km/week max
        (40, 45): 50,   # Good: ~50km/week max
        (45, 50): 60,   # Advanced: ~60km/week max
        (50, 55): 75,   # Very good: ~75km/week max
        (55, 100): 100, # Elite: higher volumes possible
    }

    suggested_max = None
    for (vdot_min, vdot_max), max_vol in vdot_volume_guidelines.items():
        if vdot_min <= zones.vdot < vdot_max:
            suggested_max = max_vol
            break

    if suggested_max and base_volume > suggested_max * 1.2:  # 20% tolerance
        logger.warning(
            f"⚠️ Volume élevé par rapport au niveau VDOT: "
            f"{base_volume:.1f}km/semaine (VDOT {zones.vdot:.1f} → suggestion max ~{suggested_max}km). "
            f"Basé sur l'historique réel, mais à surveiller pour éviter les blessures."
        )

    # Set start date to tomorrow if not provided (flexible start)
    if not start_date:
        today = datetime.now()
        start_date = today + timedelta(days=1)  # Start tomorrow
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

    # Calculate end date: always end on a Sunday
    # First, calculate the raw end date (start + num_weeks)
    raw_end_date = start_date + timedelta(weeks=num_weeks) - timedelta(days=1)
    # Then adjust to the next Sunday (if not already Sunday)
    days_until_sunday = (6 - raw_end_date.weekday()) % 7
    end_date = raw_end_date + timedelta(days=days_until_sunday)

    logger.info(f"Block dates: start={start_date.strftime('%Y-%m-%d')} ({DAYS_FR[start_date.weekday()]}), "
                f"end={end_date.strftime('%Y-%m-%d')} ({DAYS_FR[end_date.weekday()]})")

    # Create training block
    block = TrainingBlock(
        user_id=user_id,
        name=f"Bloc {phase.capitalize()} - {start_date.strftime('%d/%m')}",
        phase=phase,
        start_date=start_date,
        end_date=end_date,
        days_per_week=days_per_week,
        target_weekly_volume=base_volume,
        easy_percentage=PHASE_RATIOS[phase]["easy"],
        threshold_percentage=PHASE_RATIOS[phase]["threshold"],
        interval_percentage=PHASE_RATIOS[phase]["interval"],
        status="active"
    )

    db.add(block)
    db.flush()  # Get block.id

    # Apply adjusted paces to zones object if available
    if adjusted_paces:
        logger.info("🔧 Applying adjusted paces to training zones")
        if "easy" in adjusted_paces:
            zones.easy_min_pace_sec = adjusted_paces["easy"]["min_pace_sec"]
            zones.easy_max_pace_sec = adjusted_paces["easy"]["max_pace_sec"]
        if "threshold" in adjusted_paces:
            zones.threshold_min_pace_sec = adjusted_paces["threshold"]["min_pace_sec"]
            zones.threshold_max_pace_sec = adjusted_paces["threshold"]["max_pace_sec"]
        if "interval" in adjusted_paces:
            zones.interval_min_pace_sec = adjusted_paces["interval"]["min_pace_sec"]
            zones.interval_max_pace_sec = adjusted_paces["interval"]["max_pace_sec"]
        if "repetition" in adjusted_paces:
            zones.repetition_min_pace_sec = adjusted_paces["repetition"]["min_pace_sec"]
            zones.repetition_max_pace_sec = adjusted_paces["repetition"]["max_pace_sec"]
        if "marathon" in adjusted_paces:
            zones.marathon_pace_sec = adjusted_paces["marathon"]["pace_sec"]

    # Get user schedule to determine workout days (use provided preferred_days or DB preferences)
    schedule = _get_user_schedule_from_preferences(db, user_id, days_per_week, preferred_days)
    workout_days = sorted(schedule.keys())  # e.g., [1, 3, 5] for Tue/Thu/Sat

    # Get preferred time from user preferences if not provided
    if preferred_time is None:
        user_prefs = db.query(UserPreferences).filter(
            UserPreferences.user_id == user_id
        ).first()
        preferred_time = user_prefs.preferred_time if user_prefs else "18:00"

    # Generate workouts for the block
    workouts = _generate_workouts_for_block(
        db, user_id, block, zones, base_volume, days_per_week, start_date, phase,
        use_ai_descriptions, use_sonnet, add_recovery_sunday, num_weeks,
        preferred_days, preferred_time
    )

    # Generate injury-aware strengthening reminders
    # Use the same approach as race_plan_generator for consistency
    active_injuries = db.query(InjuryHistory).filter(
        InjuryHistory.user_id == user_id,
        (InjuryHistory.status.in_(["active", "monitoring"])) | (InjuryHistory.recurrence_count > 0)
    ).all()

    if active_injuries:
        # Use injury-aware strengthening selection
        logger.info(f"🏥 Using injury-aware strengthening for {len(active_injuries)} active/recurring injuries")
        strengthening_priorities = get_strengthening_priorities(active_injuries)
        logger.info(f"   Priorities: {strengthening_priorities}")

        # Find off days for strengthening
        all_days = set(range(7))
        workout_days_set = set(workout_days)
        off_days = sorted(all_days - workout_days_set)
        preferred_days = [d for d in off_days if d != 6][:2]  # Exclude Sunday, take up to 2 days

        if not preferred_days:
            preferred_days = [2, 5]  # Default: Wednesday, Saturday

        reminders = select_strengthening_sessions(
            db=db,
            user_id=user_id,
            block_id=block.id,
            start_date=start_date,
            end_date=end_date,
            preferred_days=preferred_days
        )
        for reminder in reminders:
            db.add(reminder)
    else:
        # Standard strengthening reminders
        reminders = _generate_strengthening_reminders(
            db, user_id, block, start_date, days_per_week, workout_days, num_weeks
        )

    db.commit()
    db.refresh(block)

    return block


def _generate_workouts_for_block(
    db: Session,
    user_id: int,
    block: TrainingBlock,
    zones: TrainingZone,
    base_volume: float,
    days_per_week: int,
    start_date: datetime,
    phase: str,
    use_ai_descriptions: bool = True,
    use_sonnet: bool = False,
    add_recovery_sunday: bool = False,
    num_weeks: int = 4,
    preferred_days: Optional[List[str]] = None,
    preferred_time: Optional[str] = None
) -> List[PlannedWorkout]:
    """Generate all workouts for the block (1-4 weeks).

    Args:
        preferred_days: Optional list to override user preferences for days
        preferred_time: Workout time (e.g., "18:00"), defaults to "18:00"
    """
    workouts = []
    workouts_plan_for_ai = []  # Store plan for AI generation

    # Dynamic week progression based on num_weeks
    # Standard progression: build-up weeks + recovery week
    if num_weeks == 1:
        # Single week - no progression
        week_volumes = [base_volume]
    elif num_weeks == 2:
        # Two weeks - slight build + recovery
        week_volumes = [base_volume, base_volume * 0.80]
    elif num_weeks == 3:
        # Three weeks - build + recovery
        week_volumes = [base_volume, base_volume * 1.05, base_volume * 0.75]
    else:  # 4 weeks (standard)
        # Week progression: 100%, 105%, 110%, 70% (recovery)
        week_volumes = [
            base_volume,
            base_volume * 1.05,
            base_volume * 1.10,
            base_volume * 0.70  # Recovery week
        ]

    # Get training schedule based on user preferences
    logger.info(f"Generating workouts for {days_per_week} days per week")
    logger.info(f"Week start date: {start_date}, day of week: {start_date.weekday()}")

    # Parse preferred time (default to 18:00)
    workout_hour = 18
    workout_minute = 0
    if preferred_time:
        try:
            time_parts = preferred_time.split(":")
            workout_hour = int(time_parts[0])
            workout_minute = int(time_parts[1]) if len(time_parts) > 1 else 0
            logger.info(f"Using preferred workout time: {workout_hour:02d}:{workout_minute:02d}")
        except (ValueError, IndexError):
            logger.warning(f"Invalid preferred_time format: {preferred_time}, using default 18:00")

    # Use user preferences to determine schedule
    schedule = _get_user_schedule_from_preferences(db, user_id, days_per_week, preferred_days)

    # Progressive long run percentages per week (builds up, then recovery)
    # Week 1: 30%, Week 2: 33%, Week 3: 35%, Week 4 (recovery): 25%
    long_run_progression = {
        1: 0.30,
        2: 0.33,
        3: 0.35,
        4: 0.25  # Recovery week - shorter long run
    }

    # Calculate the Monday of the week containing start_date
    # This ensures workouts are scheduled on correct weekdays regardless of start_date
    start_weekday = start_date.weekday()  # 0=Monday, 6=Sunday
    first_monday = start_date - timedelta(days=start_weekday)

    logger.info(f"Start date weekday: {DAYS_FR[start_weekday]}, first_monday: {first_monday.strftime('%Y-%m-%d')}")

    # Generate workouts for each week
    for week_num in range(1, num_weeks + 1):
        week_volume = week_volumes[week_num - 1]
        # week_start is always a Monday for proper day offset calculation
        week_monday = first_monday + timedelta(weeks=week_num - 1)

        # Alternate quality sessions between threshold and interval
        quality_type = "threshold" if week_num % 2 == 1 else "interval"

        # Get long run percentage for this week
        long_run_pct = long_run_progression.get(week_num, 0.30)

        for day_offset, (workout_type, volume_pct) in schedule.items():
            # Calculate workout date with preferred time (day_offset is relative to Monday)
            workout_date = week_monday + timedelta(days=day_offset)
            workout_date = workout_date.replace(hour=workout_hour, minute=workout_minute, second=0, microsecond=0)
            day_name = DAYS_FR[workout_date.weekday()]

            # Skip workouts that fall before the block start date (for week 1)
            if workout_date.date() < start_date.date():
                logger.info(f"Skipping workout on {day_name} {workout_date.strftime('%d/%m')} (before block start)")
                continue

            # Use progressive long run percentage instead of fixed
            if workout_type == "long":
                distance_km = week_volume * long_run_pct
            else:
                distance_km = week_volume * volume_pct

            # Replace "quality" with actual type
            actual_type = quality_type if workout_type == "quality" else workout_type

            # Store plan for AI if enabled
            if use_ai_descriptions:
                workouts_plan_for_ai.append({
                    'type': actual_type,
                    'distance_km': distance_km,
                    'week_number': week_num,
                    'day_of_week': day_name,
                    'date': workout_date
                })

            workout = _create_workout(
                user_id=user_id,
                block_id=block.id,
                zones=zones,
                workout_type=actual_type,
                distance_km=distance_km,
                week_number=week_num,
                scheduled_date=workout_date,
                day_of_week=day_name,
                phase=phase
            )

            db.add(workout)
            workouts.append(workout)

    # Decide if recovery runs needed based on training load
    # Auto-detect if user is ready for Sunday recovery runs
    should_add_recovery = add_recovery_sunday or _should_add_sunday_recovery(
        db, user_id, base_volume, phase, days_per_week
    )

    # Add recovery runs on Sundays if needed
    if should_add_recovery:
        for week_num in range(1, num_weeks + 1):
            # Use first_monday for consistent week calculation
            week_monday = first_monday + timedelta(weeks=week_num - 1)
            sunday_date = week_monday + timedelta(days=6)  # Sunday = Monday + 6 days
            # Apply preferred time to Sunday recovery too
            sunday_date = sunday_date.replace(hour=workout_hour, minute=workout_minute, second=0, microsecond=0)

            # Skip if before block start date
            if sunday_date.date() < start_date.date():
                logger.info(f"Skipping Sunday recovery on {sunday_date.strftime('%d/%m')} (before block start)")
                continue

            # Small recovery distance (3-4km)
            recovery_distance = base_volume * 0.10  # 10% of weekly volume

            recovery_workout = _create_workout(
                user_id=user_id,
                block_id=block.id,
                zones=zones,
                workout_type="recovery",
                distance_km=recovery_distance,
                week_number=week_num,
                scheduled_date=sunday_date,
                day_of_week="Dimanche",
                phase=phase
            )

            db.add(recovery_workout)
            workouts.append(recovery_workout)

    # Generate AI descriptions if enabled
    if use_ai_descriptions and workouts_plan_for_ai:
        try:
            logger.info(f"Generating AI descriptions for {len(workouts_plan_for_ai)} workouts")
            ai_descriptions = generate_personalized_workout_descriptions(
                db=db,
                user_id=user_id,
                workouts_plan=workouts_plan_for_ai,
                zones=zones,
                phase=phase,
                use_sonnet=use_sonnet
            )

            # Update workouts with AI descriptions
            for workout, ai_desc in zip(workouts, ai_descriptions):
                workout.description = ai_desc
                # Keep the title from template for now, or extract from AI description
                logger.info(f"Updated workout {workout.id} with AI description")

        except Exception as e:
            logger.error(f"Failed to generate AI descriptions: {e}")
            logger.info("Falling back to template descriptions")
            # Workouts already have template descriptions, so we can continue

    return workouts


def _create_workout(
    user_id: int,
    block_id: int,
    zones: TrainingZone,
    workout_type: str,
    distance_km: float,
    week_number: int,
    scheduled_date: datetime,
    day_of_week: str,
    phase: str
) -> PlannedWorkout:
    """Create a single planned workout with detailed structure."""

    def pace_str(min_sec: int, max_sec: int) -> str:
        """Format pace range as string."""
        min_m, min_s = divmod(min_sec, 60)
        max_m, max_s = divmod(max_sec, 60)
        return f"{min_m}:{min_s:02d}-{max_m}:{max_s:02d}/km"

    if workout_type == "easy":
        title = f"Facile {distance_km:.1f}km"
        pace_range = pace_str(zones.easy_min_pace_sec, zones.easy_max_pace_sec)
        description = f"""**Endurance fondamentale - {distance_km:.1f}km**

Allure : {pace_range} (allure conversationnelle)
Durée estimée : {int(distance_km * zones.easy_max_pace_sec / 60)} min

Structure :
- 10 min échauffement progressif
- {int(distance_km - 2)}km à allure facile stable
- 5 min retour au calme

Notes : Vous devez pouvoir tenir une conversation complète. Si vous êtes essoufflé, ralentissez !"""
        target_pace_min = zones.easy_min_pace_sec
        target_pace_max = zones.easy_max_pace_sec

    elif workout_type == "recovery":
        title = f"Récupération {distance_km:.1f}km"
        pace_range = pace_str(zones.easy_max_pace_sec, zones.easy_max_pace_sec + 30)
        description = f"""**Course de récupération - {distance_km:.1f}km**

Allure : {pace_range} (très facile)
Durée estimée : {int(distance_km * (zones.easy_max_pace_sec + 15) / 60)} min

Structure :
- Allure ultra-facile pendant toute la durée
- Dès que vous sentez de la fatigue, arrêtez

Notes : L'objectif est la récupération active, pas la performance."""
        target_pace_min = zones.easy_max_pace_sec
        target_pace_max = zones.easy_max_pace_sec + 30

    elif workout_type == "long":
        title = f"Sortie longue {distance_km:.1f}km"
        pace_range = pace_str(zones.easy_min_pace_sec, zones.easy_max_pace_sec)
        description = f"""**Sortie longue - {distance_km:.1f}km**

Allure : {pace_range} (facile)
Durée estimée : {int(distance_km * zones.easy_max_pace_sec / 60)} min

Structure :
- 10 min échauffement très progressif
- {int(distance_km - 3)}km à allure facile constante
- 2km derniers km à allure marathon si vous vous sentez bien
- 5 min retour au calme

Notes : Gérez votre effort, l'objectif est la distance pas la vitesse."""
        target_pace_min = zones.easy_min_pace_sec
        target_pace_max = zones.easy_max_pace_sec

    elif workout_type == "threshold":
        tempo_km = round(distance_km * 0.4, 1)  # ~40% at threshold
        tempo_km = max(3, tempo_km)
        pace_range = pace_str(zones.threshold_min_pace_sec, zones.threshold_max_pace_sec)
        title = f"Tempo {tempo_km:.1f}km au seuil"
        description = f"""**Séance au seuil lactique - {distance_km:.1f}km total**

Allure seuil : {pace_range}
Durée estimée : {int(distance_km * zones.easy_max_pace_sec / 60 + tempo_km * 2)} min

Structure :
- 2km échauffement facile
- {tempo_km}km au seuil (allure "confortablement difficile")
- 1-2km retour au calme facile

Notes : Allure que vous pourriez tenir 45-60 min. Respirez de manière contrôlée."""
        target_pace_min = zones.threshold_min_pace_sec
        target_pace_max = zones.threshold_max_pace_sec

    elif workout_type == "interval":
        num_intervals = 5 if phase == "base" else 6
        interval_distance = 1.0  # 1000m intervals
        pace_range = pace_str(zones.interval_min_pace_sec, zones.interval_max_pace_sec)
        title = f"Fractionné {num_intervals} x 1000m"
        description = f"""**Séance VO2max - {num_intervals} x 1000m**

Allure intervalle : {pace_range} (allure 5K)
Durée estimée : {int(60 + num_intervals * 5)}  min

Structure :
- 2km échauffement + 4-6 foulées
- {num_intervals} x 1000m à allure 5K
  - Récupération : 2-3 min jogging entre chaque
- 1-2km retour au calme

Notes : Concentrez-vous sur la régularité des intervalles. Ne partez pas trop vite !"""
        target_pace_min = zones.interval_min_pace_sec
        target_pace_max = zones.interval_max_pace_sec

    else:
        raise ValueError(f"Unknown workout type: {workout_type}")

    return PlannedWorkout(
        block_id=block_id,
        user_id=user_id,
        scheduled_date=scheduled_date,
        week_number=week_number,
        day_of_week=day_of_week,
        workout_type=workout_type,
        distance_km=distance_km,
        title=title,
        description=description,
        target_pace_min=target_pace_min,
        target_pace_max=target_pace_max,
        status="scheduled"
    )


def _generate_strengthening_reminders(
    db: Session,
    user_id: int,
    block: TrainingBlock,
    start_date: datetime,
    days_per_week: int,
    workout_days: List[int],  # List of day offsets for workouts (e.g., [1, 3, 5])
    num_weeks: int = 4
) -> List[StrengtheningReminder]:
    """
    Generate strengthening reminders for the block.

    Strategy: Place on OFF days between workouts for optimal recovery
    - Fresh legs for quality strengthening
    - Active recovery on rest days
    - Maintains regular muscle activation throughout the week
    """
    reminders = []

    # Alternate between the two types of strengthening
    session_types = [
        ("tfl_hanche", "Renforcement TFL/Hanche"),
        ("mollet_cheville", "Proprioception Cheville"),
    ]

    # Find OFF days between workout days
    all_days = set(range(7))  # 0-6 (Mon-Sun)
    workout_days_set = set(workout_days)
    off_days = sorted(all_days - workout_days_set)

    # Select days between workouts (exclude Sunday for true rest)
    strengthening_days = []
    for day in off_days:
        if day != 6:  # Not Sunday - keep it for full rest or recovery run
            strengthening_days.append(day)

    # If we have at least 2 off days (excluding Sunday), use them
    if len(strengthening_days) >= 2:
        # Take first 2-3 off days for strengthening
        selected_days = strengthening_days[:min(3, len(strengthening_days))]
    else:
        # Fallback: use any off days available
        selected_days = strengthening_days if strengthening_days else off_days[:2]

    logger.info(f"Workout days: {sorted(workout_days)}, Strengthening days: {selected_days}")

    # Generate for the block duration
    for week in range(num_weeks):
        week_start = start_date + timedelta(weeks=week)

        # Create strengthening reminders for selected off days
        for i, day_offset in enumerate(selected_days):
            # Alternate between session types
            session_type, title = session_types[i % len(session_types)]

            reminder_date = week_start + timedelta(days=day_offset)
            day_name = DAYS_FR[reminder_date.weekday()]

            reminder = StrengtheningReminder(
                user_id=user_id,
                block_id=block.id,
                scheduled_date=reminder_date,
                day_of_week=day_name,
                session_type=session_type,
                title=title,
                duration_minutes=15,
                completed=False
            )

            db.add(reminder)
            reminders.append(reminder)

    return reminders
