"""
Service for generating and managing weekly recaps using Claude Haiku.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from models import WeeklyRecap, Workout, User, TrainingPlan
from services.claude_service import call_claude_api
from services.readiness_service import calculate_readiness_score


def get_week_boundaries(date: datetime = None) -> tuple[datetime, datetime]:
    """
    Get Monday and Sunday for a given week.

    Args:
        date: Any date in the week (defaults to today)

    Returns:
        Tuple of (monday, sunday) datetime objects
    """
    if date is None:
        date = datetime.now()

    # Get Monday (weekday 0)
    monday = date - timedelta(days=date.weekday())
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)

    # Get Sunday (6 days after Monday)
    sunday = monday + timedelta(days=6, hours=23, minutes=59, seconds=59)

    return monday, sunday


def get_week_workouts(db: Session, user_id: int, week_start: datetime, week_end: datetime) -> List[Workout]:
    """Get all workouts for a specific week."""
    return db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= week_start,
            Workout.date <= week_end
        )
    ).order_by(Workout.date).all()


def calculate_week_metrics(workouts: List[Workout]) -> Dict:
    """Calculate aggregate metrics for the week."""
    if not workouts:
        return {
            "sessions_completed": 0,
            "total_volume_km": 0.0,
            "avg_pace_seconds": None,
            "avg_heart_rate": None,
        }

    total_volume = sum(w.distance for w in workouts if w.distance)
    total_duration = sum(w.duration for w in workouts if w.duration)

    # Calculate average pace (weighted by distance)
    avg_pace = None
    if total_volume > 0 and total_duration > 0:
        avg_pace = int((total_duration / 60) / total_volume * 60)  # seconds per km

    # Calculate average heart rate
    hr_values = [w.avg_heart_rate for w in workouts if w.avg_heart_rate]
    avg_hr = int(sum(hr_values) / len(hr_values)) if hr_values else None

    return {
        "sessions_completed": len(workouts),
        "total_volume_km": round(total_volume, 1),
        "avg_pace_seconds": avg_pace,
        "avg_heart_rate": avg_hr,
    }


def format_pace(seconds_per_km: int) -> str:
    """Format pace in mm:ss format."""
    if not seconds_per_km:
        return "N/A"
    minutes = seconds_per_km // 60
    seconds = seconds_per_km % 60
    return f"{minutes}:{seconds:02d}/km"


def generate_weekly_recap_prompt(
    user: User,
    workouts: List[Workout],
    metrics: Dict,
    previous_week_volume: float = 0.0,
    training_plan: Optional[TrainingPlan] = None
) -> str:
    """
    Generate the prompt for Claude Haiku to create the weekly recap.

    Args:
        user: User object
        workouts: List of workouts for the week
        metrics: Calculated metrics dictionary
        previous_week_volume: Volume from previous week for comparison
        training_plan: Current training plan if any

    Returns:
        Formatted prompt string
    """
    # Format workouts
    workout_details = []
    for w in workouts:
        date_str = w.date.strftime("%A")  # Day name (Monday, Tuesday, etc.)
        distance = f"{w.distance:.1f}km" if w.distance else "N/A"
        pace = format_pace(int(w.duration / 60 / w.distance * 60)) if w.distance and w.duration else "N/A"
        hr = f"{w.avg_heart_rate} bpm" if w.avg_heart_rate else "N/A"
        workout_type = w.workout_type or "Run"

        workout_details.append(f"- {date_str}: {workout_type} {distance} à {pace}, FC {hr}")

    workouts_text = "\n".join(workout_details) if workout_details else "Aucune séance cette semaine"

    # Calculate volume change
    volume_change = ""
    if previous_week_volume > 0:
        change_pct = ((metrics['total_volume_km'] - previous_week_volume) / previous_week_volume) * 100
        if change_pct > 0:
            volume_change = f"(+{change_pct:.0f}% vs semaine dernière)"
        else:
            volume_change = f"({change_pct:.0f}% vs semaine dernière)"

    # Training context
    training_context = ""
    if training_plan:
        training_context = f"\nContexte : {training_plan.goal} (phase en cours)"

    prompt = f"""Tu es un coach running expérimenté. Rédige un résumé de la semaine écoulée pour cet athlète.

SEMAINE DU {workouts[0].date.strftime('%d/%m/%Y')} AU {workouts[-1].date.strftime('%d/%m/%Y') if workouts else 'aujourd\'hui'}

Séances réalisées : {metrics['sessions_completed']}
{workouts_text}

Volume total : {metrics['total_volume_km']}km {volume_change}
Allure moyenne : {format_pace(metrics['avg_pace_seconds']) if metrics['avg_pace_seconds'] else 'N/A'}
FC moyenne : {metrics['avg_heart_rate']} bpm{training_context}

CONSIGNES :
1. Sois factuel et direct (pas de superlatifs excessifs)
2. Mets en avant les progrès concrets (chiffres)
3. Identifie les erreurs éventuelles (surcharge, allure trop rapide, manque récup)
4. Donne 1-2 conseils pour la semaine à venir
5. Format : 3-4 paragraphes courts, ton professionnel mais encourageant
6. Longueur max : 200 mots
7. Utilise un ton français naturel (tutoiement)

Réponds UNIQUEMENT avec le texte du récapitulatif, sans introduction ni conclusion additionnelle."""

    return prompt


async def generate_weekly_recap(db: Session, user_id: int, week_start: datetime = None) -> Optional[WeeklyRecap]:
    """
    Generate a weekly recap for a user using Claude Haiku.

    Args:
        db: Database session
        user_id: User ID
        week_start: Optional week start date (defaults to current week)

    Returns:
        WeeklyRecap object or None if generation fails
    """
    # Get week boundaries
    if week_start is None:
        # Default to previous week (Monday to Sunday)
        today = datetime.now()
        monday_this_week = today - timedelta(days=today.weekday())
        week_start = monday_this_week - timedelta(days=7)

    week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)

    # Check if recap already exists for this week
    existing_recap = db.query(WeeklyRecap).filter(
        and_(
            WeeklyRecap.user_id == user_id,
            WeeklyRecap.week_start_date == week_start
        )
    ).first()

    if existing_recap:
        print(f"Weekly recap already exists for week starting {week_start.date()}")
        return existing_recap

    # Get user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        print(f"User {user_id} not found")
        return None

    # Get workouts for the week
    workouts = get_week_workouts(db, user_id, week_start, week_end)

    if not workouts:
        print(f"No workouts found for week starting {week_start.date()}")
        # Still create a recap for weeks with no activity
        recap_text = f"Aucune séance enregistrée cette semaine. Prends le temps de te reposer si besoin, mais n'oublie pas que la régularité est clé pour progresser. Essaie de reprendre progressivement la semaine prochaine avec 1-2 séances faciles."

        recap = WeeklyRecap(
            user_id=user_id,
            week_start_date=week_start,
            week_end_date=week_end,
            recap_text=recap_text,
            sessions_completed=0,
            sessions_planned=0,
            total_volume_km=0.0,
            avg_pace_seconds=None,
            avg_heart_rate=None,
            readiness_avg=None
        )

        db.add(recap)
        db.commit()
        db.refresh(recap)
        return recap

    # Calculate metrics
    metrics = calculate_week_metrics(workouts)

    # Get previous week's volume for comparison
    previous_week_start = week_start - timedelta(days=7)
    previous_week_end = week_start - timedelta(seconds=1)
    previous_workouts = get_week_workouts(db, user_id, previous_week_start, previous_week_end)
    previous_week_volume = sum(w.distance for w in previous_workouts if w.distance)

    # Get current training plan if any
    training_plan = db.query(TrainingPlan).filter(
        and_(
            TrainingPlan.user_id == user_id,
            TrainingPlan.status == "active"
        )
    ).first()

    # Generate prompt
    prompt = generate_weekly_recap_prompt(
        user=user,
        workouts=workouts,
        metrics=metrics,
        previous_week_volume=previous_week_volume,
        training_plan=training_plan
    )

    # Call Claude Haiku
    try:
        response = call_claude_api(prompt=prompt, use_sonnet=False)  # use_sonnet=False for Haiku
        recap_text = response.get('content', '')

        # Create recap record
        recap = WeeklyRecap(
            user_id=user_id,
            week_start_date=week_start,
            week_end_date=week_end,
            recap_text=recap_text,
            sessions_completed=metrics['sessions_completed'],
            sessions_planned=0,  # TODO: Get from training plan if available
            total_volume_km=metrics['total_volume_km'],
            avg_pace_seconds=metrics['avg_pace_seconds'],
            avg_heart_rate=metrics['avg_heart_rate'],
            readiness_avg=None  # TODO: Calculate average readiness for the week
        )

        db.add(recap)
        db.commit()
        db.refresh(recap)

        print(f"✅ Weekly recap generated for week starting {week_start.date()}")
        return recap

    except Exception as e:
        print(f"❌ Error generating weekly recap: {e}")
        db.rollback()
        return None


def get_user_recaps(db: Session, user_id: int, limit: int = 10) -> List[WeeklyRecap]:
    """
    Get weekly recaps for a user, ordered by most recent first.

    Args:
        db: Database session
        user_id: User ID
        limit: Maximum number of recaps to return

    Returns:
        List of WeeklyRecap objects
    """
    return db.query(WeeklyRecap).filter(
        WeeklyRecap.user_id == user_id
    ).order_by(WeeklyRecap.week_start_date.desc()).limit(limit).all()


def get_latest_recap(db: Session, user_id: int) -> Optional[WeeklyRecap]:
    """Get the most recent weekly recap for a user."""
    return db.query(WeeklyRecap).filter(
        WeeklyRecap.user_id == user_id
    ).order_by(WeeklyRecap.week_start_date.desc()).first()


def mark_recap_as_viewed(db: Session, recap_id: int) -> bool:
    """Mark a weekly recap as viewed by the user."""
    recap = db.query(WeeklyRecap).filter(WeeklyRecap.id == recap_id).first()
    if recap:
        recap.is_viewed = True
        db.commit()
        return True
    return False
