"""
Workouts router for managing running workout data.
"""

from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from pydantic import BaseModel

from database import get_db
from models import Workout, TrainingBlock, PlannedWorkout, WorkoutAnalysis, AdjustmentProposal
from schemas import WorkoutResponse, WorkoutUpdate
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class AnalyzeWorkoutRequest(BaseModel):
    """Request to analyze a workout with optional conversation history."""
    message: str
    conversation_history: Optional[List[dict]] = None


class AnalyzeWorkoutResponse(BaseModel):
    """Response from workout analysis."""
    response: str
    suggested_block_adjustments: Optional[dict] = None
    conversation_id: Optional[str] = None


class AnalyzeMultipleWorkoutsRequest(BaseModel):
    """Request to analyze multiple workouts in a date range."""
    message: str
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    conversation_history: Optional[List[dict]] = None


class AnalyzeMultipleWorkoutsResponse(BaseModel):
    """Response from multi-workout analysis."""
    response: str
    workouts_analyzed: int
    date_range: dict
    conversation_id: Optional[str] = None


@router.get("/workouts", response_model=List[WorkoutResponse])
async def get_workouts(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=2000),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    workout_type: Optional[str] = None,
    min_distance: Optional[float] = None,
    max_distance: Optional[float] = None,
):
    """
    Get list of workouts with optional filters.
    
    Args:
        user_id: User ID (from auth)
        skip: Number of records to skip (pagination)
        limit: Maximum number of records to return
        start_date: Filter workouts after this date (YYYY-MM-DD)
        end_date: Filter workouts before this date (YYYY-MM-DD)
        workout_type: Filter by workout type
        min_distance: Minimum distance in km
        max_distance: Maximum distance in km
    """
    query = db.query(Workout).filter(Workout.user_id == user_id)
    
    # Apply filters
    if start_date:
        query = query.filter(Workout.date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(Workout.date <= datetime.fromisoformat(end_date))
    if workout_type:
        query = query.filter(Workout.workout_type == workout_type)
    if min_distance:
        query = query.filter(Workout.distance >= min_distance)
    if max_distance:
        query = query.filter(Workout.distance <= max_distance)
    
    # Order by date descending
    query = query.order_by(desc(Workout.date))
    
    # Pagination
    workouts = query.offset(skip).limit(limit).all()
    
    return workouts


@router.get("/workouts/missing-feedback")
async def get_workouts_missing_feedback(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
    days_back: int = Query(30, ge=1, le=90)
):
    """
    Get workouts that don't have feedback (RPE, difficulty, comments).

    Returns workouts from the last N days that are missing feedback data.
    This helps users complete their training logs.

    Args:
        days_back: How many days back to check (default 30, max 90)

    Returns:
        List of workouts without feedback
    """
    from datetime import timedelta
    from models import WorkoutFeedback

    cutoff_date = datetime.now() - timedelta(days=days_back)

    # Get all workouts in date range
    workouts = db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= cutoff_date
        )
    ).order_by(desc(Workout.date)).all()

    # Filter out workouts that already have feedback
    # A workout has feedback if it has:
    # 1. A WorkoutFeedback entry, OR
    # 2. A notes, OR
    # 3. A user_rating
    workouts_with_feedback_ids = set(
        f.completed_workout_id for f in db.query(WorkoutFeedback).filter(
            WorkoutFeedback.user_id == user_id,
            WorkoutFeedback.completed_workout_id.isnot(None)
        ).all()
    )

    workouts_without_feedback = [
        {
            "id": w.id,
            "date": w.date.isoformat(),
            "distance": w.distance,
            "duration": w.duration,
            "avg_pace": w.avg_pace,
            "workout_type": w.workout_type
        }
        for w in workouts
        if (
            w.id not in workouts_with_feedback_ids
            and not w.notes  # No comment
        )
    ]

    return {
        "count": len(workouts_without_feedback),
        "workouts": workouts_without_feedback
    }


@router.get("/workouts/recent-analysis")
async def get_recent_analysis(
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Get most recent workout analysis (last 24h).
    Used by /coach page to display post-workout insights.

    Returns:
        analysis: Most recent WorkoutAnalysis
        proposal: Associated AdjustmentProposal (if exists)
    """
    from datetime import timedelta

    # Get most recent analysis within 24h
    yesterday = datetime.now() - timedelta(hours=24)

    analysis = db.query(WorkoutAnalysis).join(Workout).filter(
        Workout.user_id == user_id,
        WorkoutAnalysis.analyzed_at >= yesterday
    ).order_by(desc(WorkoutAnalysis.analyzed_at)).first()

    if not analysis:
        return {"analysis": None, "proposal": None}

    # Get associated proposal if exists
    proposal = db.query(AdjustmentProposal).filter(
        AdjustmentProposal.analysis_id == analysis.id
    ).first()

    # Get the workout data
    workout = db.query(Workout).filter(Workout.id == analysis.workout_id).first()

    return {
        "analysis": {
            "id": analysis.id,
            "workout_id": analysis.workout_id,
            "performance_vs_plan": analysis.performance_vs_plan,
            "pace_variance_pct": analysis.pace_variance_pct,
            "hr_zone_variance": analysis.hr_zone_variance,
            "fatigue_detected": analysis.fatigue_detected,
            "injury_risk_score": analysis.injury_risk_score,
            "injury_risk_factors": analysis.injury_risk_factors,
            "summary": analysis.summary,
            "analyzed_at": analysis.analyzed_at.isoformat()
        },
        "workout": {
            "id": workout.id,
            "date": workout.date.isoformat(),
            "distance": workout.distance,
            "duration": workout.duration,
            "avg_pace": workout.avg_pace,
            "avg_hr": workout.avg_hr,
            "max_hr": workout.max_hr,
            "workout_type": workout.workout_type,
            "notes": workout.notes
        } if workout else None,
        "proposal": {
            "id": proposal.id,
            "status": proposal.status,
            "adjustments": proposal.adjustments,
            "applied": proposal.applied,
            "created_at": proposal.created_at.isoformat()
        } if proposal else None
    }


@router.get("/workouts/{workout_id}", response_model=WorkoutResponse)
async def get_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Get a specific workout by ID."""
    workout = db.query(Workout).filter(
        and_(Workout.id == workout_id, Workout.user_id == user_id)
    ).first()

    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    return workout


@router.patch("/workouts/{workout_id}", response_model=WorkoutResponse)
async def update_workout(
    workout_id: int,
    workout_update: WorkoutUpdate,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Update a workout (typically to add comments/rating/type).
    """
    workout = db.query(Workout).filter(
        and_(Workout.id == workout_id, Workout.user_id == user_id)
    ).first()

    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    # Update fields if provided
    update_data = workout_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(workout, field, value)

    db.commit()
    db.refresh(workout)

    logger.info(f"Updated workout {workout_id}")

    return workout


@router.delete("/workouts/{workout_id}")
async def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Delete a workout (only allowed for test workouts).
    """
    workout = db.query(Workout).filter(
        and_(Workout.id == workout_id, Workout.user_id == user_id)
    ).first()

    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    # Only allow deletion of test workouts
    if not workout.is_test:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete non-test workouts. Only test workouts can be deleted."
        )

    # Delete related workout_analyses first (cascade delete)
    if workout.analysis:
        # Also delete any adjustment proposals related to this analysis
        proposals = db.query(AdjustmentProposal).filter(
            AdjustmentProposal.analysis_id == workout.analysis.id
        ).all()
        for proposal in proposals:
            db.delete(proposal)

        db.delete(workout.analysis)

    db.delete(workout)
    db.commit()

    logger.info(f"Deleted test workout {workout_id}")

    return {"message": "Workout deleted successfully", "id": workout_id}


@router.get("/workouts/stats/weekly")
async def get_weekly_stats(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
    weeks: int = Query(8, ge=1, le=52),
):
    """
    Get weekly statistics for the last N weeks.
    """
    from datetime import timedelta
    from sqlalchemy import func
    
    today = date.today()
    start_date = today - timedelta(weeks=weeks)
    
    workouts = db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= start_date
        )
    ).all()
    
    # Group by week
    weekly_data = {}
    for workout in workouts:
        # Get ISO week number
        year, week, _ = workout.date.isocalendar()
        week_key = f"{year}-W{week:02d}"
        
        if week_key not in weekly_data:
            weekly_data[week_key] = {
                "week": week_key,
                "total_distance": 0,
                "total_duration": 0,
                "workout_count": 0,
                "workouts": []
            }
        
        weekly_data[week_key]["total_distance"] += workout.distance or 0
        weekly_data[week_key]["total_duration"] += workout.duration or 0
        weekly_data[week_key]["workout_count"] += 1
        weekly_data[week_key]["workouts"].append({
            "id": workout.id,
            "date": workout.date.isoformat(),
            "distance": workout.distance,
        })
    
    # Sort by week
    result = sorted(weekly_data.values(), key=lambda x: x["week"])

    return result


@router.post("/workouts/classify")
async def classify_workouts(
    db: Session = Depends(get_db),
    user_id: int = 1,
):
    """
    Classify all workouts without workout_type using Claude Haiku.
    Analyzes pace, distance, and heart rate to determine:
    - facile (easy run)
    - tempo (tempo run)
    - fractionne (interval training)
    - longue (long run)
    - recuperation (recovery run)
    """
    from services.claude_service import call_claude_api
    import json

    # Get workouts WITHOUT type (to classify)
    unclassified = db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            or_(Workout.workout_type == None, Workout.workout_type == '')
        )
    ).all()

    if not unclassified:
        return {"message": "All workouts already classified", "classified": 0}

    # Get workouts WITH type (reference for learning)
    classified = db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            Workout.workout_type != None,
            Workout.workout_type != ''
        )
    ).order_by(Workout.date.desc()).limit(30).all()

    # Prepare reference data from already classified workouts
    reference_data = []
    for w in classified:
        pace_min_km = round(w.avg_pace / 60, 2) if w.avg_pace else None
        ref_entry = {
            "type": w.workout_type,
            "distance_km": round(w.distance, 2) if w.distance is not None else None,
            "pace_min_km": pace_min_km,
            "avg_hr": w.avg_hr
        }

        # Add GPX metrics if available
        if w.raw_data and isinstance(w.raw_data, dict) and 'gpx' in w.raw_data:
            gpx = w.raw_data['gpx']
            ref_entry['pace_variability'] = gpx.get('pace_variability', 0)
            if gpx.get('splits'):
                ref_entry['num_splits'] = len(gpx['splits'])

        reference_data.append(ref_entry)

    # Prepare unclassified workout data
    workout_data = []
    for w in unclassified:
        pace_min_km = round(w.avg_pace / 60, 2) if w.avg_pace else None
        workout_entry = {
            "id": w.id,
            "date": w.date.strftime("%Y-%m-%d"),
            "distance_km": round(w.distance, 2) if w.distance is not None else None,
            "duration_min": round(w.duration / 60, 1) if w.duration else None,
            "pace_min_km": pace_min_km,
            "avg_hr": w.avg_hr,
            "max_hr": w.max_hr
        }

        # Add GPX metrics if available for better classification
        if w.raw_data and isinstance(w.raw_data, dict) and 'gpx' in w.raw_data:
            gpx = w.raw_data['gpx']
            workout_entry['pace_variability'] = gpx.get('pace_variability', 0)

            # Include split info if available
            splits = gpx.get('splits', [])
            if splits:
                workout_entry['num_splits'] = len(splits)
                # Calculate pace range (fastest vs slowest km)
                paces = [s['pace'] for s in splits]
                if len(paces) > 1:
                    min_pace = min(paces) / 60
                    max_pace = max(paces) / 60
                    workout_entry['pace_range_min_km'] = f"{min_pace:.2f}-{max_pace:.2f}"

            # Include lap info for track workouts
            laps = gpx.get('laps', [])
            if laps:
                workout_entry['has_laps'] = True
                workout_entry['num_laps'] = len(laps)

        workout_data.append(workout_entry)

    reference_section = ""
    if reference_data:
        reference_section = f"""
SÉANCES DÉJÀ CLASSIFIÉES (RÉFÉRENCES):
{json.dumps(reference_data[:15], indent=2)}

Analyse ces séances de référence pour comprendre les allures personnelles de l'utilisateur.
Utilise ces patterns pour classifier les nouvelles séances ci-dessous."""

    prompt = f"""Tu es un coach running. Classifie ces {len(workout_data)} nouvelles séances de course à pied.
{reference_section}

NOUVELLES SÉANCES À CLASSIFIER:
{json.dumps(workout_data, indent=2)}

TYPES POSSIBLES:
- facile: Allure confortable, endurance fondamentale
- tempo: Allure soutenue mais tenable, effort contrôlé
- fractionne: Courte distance avec allure rapide
- longue: Distance >9km en allure facile
- recuperation: Très lente, courte, récupération active

RÈGLES:
1. Adapte les critères selon les allures personnelles vues dans les références
2. Si l'utilisateur progresse, ses anciennes "faciles" peuvent devenir ses nouvelles "tempo"
3. Base-toi sur: allure, distance, FC, et patterns des références
4. UTILISE LES MÉTRIQUES GPX quand disponibles:
   - pace_variability > 0.15 = forte probabilité de fractionné (allure variable)
   - pace_variability < 0.05 = allure très stable (facile, tempo, ou longue)
   - pace_range_min_km montre l'écart min-max entre les km (utile pour détecter fractionné)
   - has_laps = True avec num_laps ≈ 10-15 = séance piste (400m tours)
   - num_splits indique le nombre de km complets

RÉPONDS EN JSON STRICT:
{{
  "classifications": [
    {{"id": 1, "type": "facile"}},
    {{"id": 2, "type": "tempo"}},
    ...
  ]
}}"""

    try:
        response = call_claude_api(prompt, use_sonnet=False)  # Use Haiku
        content = response["content"]

        # Parse response
        start_idx = content.find("{")
        end_idx = content.rfind("}") + 1
        if start_idx >= 0 and end_idx > start_idx:
            result = json.loads(content[start_idx:end_idx])
            classifications = result.get("classifications", [])

            # Update workouts
            classified_count = 0
            for classification in classifications:
                workout_id = classification.get("id")
                workout_type = classification.get("type")

                if workout_id and workout_type:
                    workout = db.query(Workout).filter(Workout.id == workout_id).first()
                    if workout:
                        workout.workout_type = workout_type
                        classified_count += 1

            db.commit()

            return {
                "message": f"Successfully classified {classified_count} workouts",
                "classified": classified_count,
                "model_used": response["model"],
                "tokens_used": response["tokens"]
            }
        else:
            raise ValueError("Invalid JSON response from Claude")

    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/workouts/{workout_id}/analyze", response_model=AnalyzeWorkoutResponse)
async def analyze_workout(
    workout_id: int,
    request: AnalyzeWorkoutRequest,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Analyze a workout session with Claude Haiku.

    Provides interactive chat-based analysis of the workout:
    - Reviews workout performance vs. planned targets
    - Analyzes user comments and feedback
    - Detects patterns (e.g., repeated pain/fatigue)
    - Suggests block adjustments if needed
    - Allows follow-up questions and discussion

    Args:
        workout_id: ID of the workout to analyze
        request: User message and optional conversation history
        user_id: User ID (from auth)
        db: Database session

    Returns:
        AI analysis with optional block adjustment suggestions
    """
    from services.claude_service import call_claude_api
    from datetime import timedelta
    import json

    # Get the workout
    workout = db.query(Workout).filter(
        and_(Workout.id == workout_id, Workout.user_id == user_id)
    ).first()

    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    # Get recent workouts for context (last 2 weeks)
    recent_workouts = db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= workout.date - timedelta(days=14),
            Workout.date < workout.date
        )
    ).order_by(desc(Workout.date)).limit(10).all()

    # Get active training block if exists
    active_block = db.query(TrainingBlock).filter(
        and_(
            TrainingBlock.user_id == user_id,
            TrainingBlock.status == "active"
        )
    ).first()

    # Check if this workout was part of a planned workout
    planned_workout = None
    if active_block:
        planned_workout = db.query(PlannedWorkout).filter(
            and_(
                PlannedWorkout.block_id == active_block.id,
                PlannedWorkout.completed_workout_id == workout_id
            )
        ).first()

    # Extract best efforts from raw_data if available
    best_efforts = {}
    if workout.raw_data and isinstance(workout.raw_data, dict):
        best_efforts = workout.raw_data.get('best_efforts', {})

    # Format workout data
    workout_data = {
        "date": workout.date.strftime("%A %d %B %Y"),
        "type": workout.workout_type or "Non classifié",
        "distance_km": round(workout.distance, 2) if workout.distance else None,
        "duration_min": round(workout.duration / 60, 1) if workout.duration else None,
        "avg_pace": f"{int(workout.avg_pace // 60)}:{int(workout.avg_pace % 60):02d}/km" if workout.avg_pace else None,
        "avg_hr": workout.avg_hr,
        "max_hr": workout.max_hr,
        "notes": workout.notes or "Aucun commentaire",
        "best_efforts": {k: f"{int(v['time_seconds'] // 60)}:{int(v['time_seconds'] % 60):02d} ({v['pace_seconds_per_km']//60}:{int(v['pace_seconds_per_km']%60):02d}/km)"
                        for k, v in best_efforts.items()} if best_efforts else None
    }

    # Format planned workout if exists
    planned_data = None
    if planned_workout:
        planned_data = {
            "target_distance_km": planned_workout.target_distance,
            "target_pace": f"{int(planned_workout.target_pace // 60)}:{int(planned_workout.target_pace % 60):02d}/km" if planned_workout.target_pace else None,
            "description": planned_workout.description,
            "workout_type": planned_workout.workout_type
        }

    # Format recent workouts for pattern detection
    recent_data = []
    for w in recent_workouts:
        recent_data.append({
            "date": w.date.strftime("%d/%m"),
            "type": w.workout_type,
            "distance_km": round(w.distance, 2) if w.distance else None,
            "avg_pace": f"{int(w.avg_pace // 60)}:{int(w.avg_pace % 60):02d}/km" if w.avg_pace else None,
            "comment": w.notes[:50] + "..." if w.notes and len(w.notes) > 50 else w.notes
        })

    # Build conversation context
    conversation_context = ""
    if request.conversation_history:
        for msg in request.conversation_history:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            conversation_context += f"\n{role.upper()}: {content}\n"

    # Build prompt
    prompt = f"""Tu es un coach running expérimenté qui analyse les séances d'entraînement.

SÉANCE À ANALYSER:
{json.dumps(workout_data, indent=2, ensure_ascii=False)}

{"SÉANCE PLANIFIÉE:" if planned_data else ""}
{json.dumps(planned_data, indent=2, ensure_ascii=False) if planned_data else ""}

HISTORIQUE RÉCENT (2 dernières semaines):
{json.dumps(recent_data, indent=2, ensure_ascii=False)}

{"CONVERSATION PRÉCÉDENTE:" if conversation_context else ""}
{conversation_context}

MESSAGE DE L'UTILISATEUR:
{request.message}

CONSIGNES:
1. Analyse factuelle basée sur les données
2. Compare avec l'objectif prévu si applicable
3. Détecte les patterns problématiques (douleurs répétées, surcharge, etc.)
4. Si tu suggères un ajustement de bloc, indique-le clairement avec "AJUSTEMENT RECOMMANDÉ:"
5. Sois direct et encourageant sans être excessif
6. Tutoiement, ton professionnel
7. Si l'utilisateur pose une question de suivi, réponds en contexte

FORMAT DE RÉPONSE:
- Réponse conversationnelle (max 200 mots)
- Si ajustement nécessaire, termine par:

  AJUSTEMENT RECOMMANDÉ:
  {{
    "type": "pace_reduction" | "split_workout" | "rest_day" | "swap_sessions",
    "reason": "Explication brève",
    "suggestion": "Description concrète de l'ajustement"
  }}

Réponds maintenant:"""

    try:
        # Call Claude Haiku
        response = call_claude_api(prompt, use_sonnet=False)
        content = response["content"]

        # Parse adjustment if present
        suggested_adjustments = None
        if "AJUSTEMENT RECOMMANDÉ:" in content:
            adjustment_start = content.find("AJUSTEMENT RECOMMANDÉ:")
            adjustment_text = content[adjustment_start:]

            # Extract JSON from adjustment section
            json_start = adjustment_text.find("{")
            json_end = adjustment_text.rfind("}") + 1

            if json_start >= 0 and json_end > json_start:
                try:
                    suggested_adjustments = json.loads(adjustment_text[json_start:json_end])
                except json.JSONDecodeError:
                    pass

            # Remove adjustment section from main response
            content = content[:adjustment_start].strip()

        return AnalyzeWorkoutResponse(
            response=content,
            suggested_block_adjustments=suggested_adjustments,
            conversation_id=f"workout_{workout_id}"
        )

    except Exception as e:
        logger.error(f"Workout analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/workouts/analyze-range", response_model=AnalyzeMultipleWorkoutsResponse)
async def analyze_workouts_range(
    request: AnalyzeMultipleWorkoutsRequest,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Analyze multiple workouts in a date range with Claude.

    Provides interactive chat-based analysis for a period of training:
    - Reviews overall training load and progression
    - Analyzes patterns across multiple sessions
    - Reviews user comments and feedback from all workouts
    - Detects recurring issues or improvements
    - Allows follow-up questions and discussion

    Args:
        request: Date range, user message and optional conversation history
        user_id: User ID (from auth)
        db: Database session

    Returns:
        AI analysis of the training period
    """
    from services.claude_service import call_claude_api
    import json

    # Parse dates
    try:
        start = datetime.fromisoformat(request.start_date)
        end = datetime.fromisoformat(request.end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Get workouts in range
    workouts = db.query(Workout).filter(
        and_(
            Workout.user_id == user_id,
            Workout.date >= start,
            Workout.date <= end
        )
    ).order_by(Workout.date).all()

    if not workouts:
        raise HTTPException(
            status_code=404,
            detail=f"No workouts found between {request.start_date} and {request.end_date}"
        )

    # Format workouts data with comments
    workouts_data = []
    total_distance = 0
    total_duration = 0

    for w in workouts:
        total_distance += w.distance or 0
        total_duration += w.duration or 0

        workout_entry = {
            "date": w.date.strftime("%A %d %B"),
            "type": w.workout_type or "Non classifié",
            "distance_km": round(w.distance, 2) if w.distance else None,
            "duration_min": round(w.duration / 60, 1) if w.duration else None,
            "avg_pace": f"{int(w.avg_pace // 60)}:{int(w.avg_pace % 60):02d}/km" if w.avg_pace else None,
            "avg_hr": w.avg_hr,
            "user_rating": w.user_rating,
            "notes": w.notes or None
        }
        workouts_data.append(workout_entry)

    # Calculate summary stats
    num_days = (end - start).days + 1
    summary = {
        "period": f"{request.start_date} au {request.end_date}",
        "days": num_days,
        "num_workouts": len(workouts),
        "total_distance_km": round(total_distance, 2),
        "total_duration_hours": round(total_duration / 3600, 1),
        "avg_workouts_per_week": round(len(workouts) / (num_days / 7), 1) if num_days >= 7 else len(workouts)
    }

    # Build conversation context
    conversation_context = ""
    if request.conversation_history:
        for msg in request.conversation_history:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            conversation_context += f"\n{role.upper()}: {content}\n"

    # Build prompt
    prompt = f"""Tu es un coach running expérimenté qui analyse une période d'entraînement.

RÉSUMÉ DE LA PÉRIODE:
{json.dumps(summary, indent=2, ensure_ascii=False)}

DÉTAIL DES SÉANCES:
{json.dumps(workouts_data, indent=2, ensure_ascii=False)}

{"CONVERSATION PRÉCÉDENTE:" if conversation_context else ""}
{conversation_context}

MESSAGE DE L'UTILISATEUR:
{request.message}

CONSIGNES:
1. Analyse factuelle basée sur les données de TOUTES les séances
2. Identifie les patterns: progression, régularité, types de séances
3. Prends en compte TOUS les commentaires utilisateur pour détecter:
   - Fatigue récurrente
   - Douleurs ou blessures
   - Difficultés mentales
   - Points positifs et progrès
4. Évalue la charge d'entraînement (volume, intensité)
5. Donne des insights sur la période (tendances, points d'attention)
6. Si l'utilisateur pose une question de suivi, réponds en contexte
7. Tutoiement, ton professionnel et direct

FORMAT DE RÉPONSE:
- Réponse conversationnelle structurée (max 400 mots)
- Utilise des points clés pour la lisibilité

Réponds maintenant:"""

    try:
        # Call Claude (use Sonnet for better analysis on larger context)
        response = call_claude_api(prompt, use_sonnet=True)
        content = response["content"]

        return AnalyzeMultipleWorkoutsResponse(
            response=content,
            workouts_analyzed=len(workouts),
            date_range={
                "start": request.start_date,
                "end": request.end_date,
                "days": num_days
            },
            conversation_id=f"range_{request.start_date}_{request.end_date}"
        )

    except Exception as e:
        logger.error(f"Multi-workout analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/workouts/{workout_id}/characterize")
async def characterize_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1
):
    """
    Automatically characterize a single workout using best efforts analysis.

    Uses Strava best_efforts data to determine workout type more accurately
    than using global average pace alone.

    Args:
        workout_id: Workout ID to characterize

    Returns:
        Workout type and analysis details
    """
    from services.workout_characterization_service import auto_characterize_workout

    # Verify workout exists and belongs to user
    workout = db.query(Workout).filter(
        Workout.id == workout_id,
        Workout.user_id == user_id
    ).first()

    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    # Characterize
    try:
        workout_type = auto_characterize_workout(db, workout_id)

        # Get updated workout
        db.refresh(workout)

        analysis = workout.raw_data.get("characterization_analysis", {}) if workout.raw_data else {}

        return {
            "success": True,
            "workout_id": workout_id,
            "workout_type": workout_type,
            "analysis": analysis
        }

    except Exception as e:
        logger.error(f"Characterization error for workout {workout_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Characterization failed: {str(e)}")


@router.post("/workouts/characterize-all")
async def characterize_all_workouts(
    db: Session = Depends(get_db),
    user_id: int = 1,
    limit: int = Query(100, ge=1, le=500)
):
    """
    Bulk characterize all uncharacterized workouts for a user.

    Processes workouts without a workout_type and assigns them based on
    best efforts analysis.

    Args:
        limit: Maximum number of workouts to process (default 100, max 500)

    Returns:
        Summary with counts and breakdown by type
    """
    from services.workout_characterization_service import bulk_characterize_workouts

    try:
        result = bulk_characterize_workouts(db, user_id, limit=limit)

        return {
            "success": True,
            **result
        }

    except Exception as e:
        logger.error(f"Bulk characterization error: {e}")
        raise HTTPException(status_code=500, detail=f"Bulk characterization failed: {str(e)}")


# ============================================================================
# POST-WORKOUT AI ANALYSIS ENDPOINTS
# ============================================================================

@router.post("/workouts/{workout_id}/analyze-performance")
def analyze_workout_performance_endpoint(
    workout_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Trigger AI analysis of completed workout performance.

    This endpoint:
    1. Analyzes workout vs planned targets
    2. Detects fatigue and injury risks
    3. Generates adjustment proposals
    4. Auto-applies <10% changes, proposes >10% for validation

    Returns:
        analysis: WorkoutAnalysis object
        proposal: AdjustmentProposal object (if adjustments needed)
        status: "no_adjustments" | "auto_applied" | "pending_validation"
    """
    from services.post_workout_analyzer import (
        analyze_workout_performance,
        generate_adjustment_proposal
    )

    # Verify workout exists and belongs to user
    workout = db.query(Workout).filter(
        Workout.id == workout_id,
        Workout.user_id == user_id
    ).first()

    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    # Run AI analysis
    analysis = analyze_workout_performance(workout_id, db)

    if not analysis:
        raise HTTPException(status_code=500, detail="Analysis failed")

    # Check if adjustments needed
    if analysis.fatigue_detected or analysis.injury_risk_score > 5.0:
        proposal = generate_adjustment_proposal(analysis, user_id, db)

        if proposal:
            return {
                "analysis": {
                    "id": analysis.id,
                    "performance_vs_plan": analysis.performance_vs_plan,
                    "pace_variance_pct": analysis.pace_variance_pct,
                    "hr_zone_variance": analysis.hr_zone_variance,
                    "fatigue_detected": analysis.fatigue_detected,
                    "injury_risk_score": analysis.injury_risk_score,
                    "injury_risk_factors": analysis.injury_risk_factors,
                    "summary": analysis.summary,
                    "analyzed_at": analysis.analyzed_at.isoformat()
                },
                "proposal": {
                    "id": proposal.id,
                    "status": proposal.status,
                    "adjustments": proposal.adjustments,
                    "applied": proposal.applied
                },
                "status": proposal.status
            }

    # No adjustments needed
    return {
        "analysis": {
            "id": analysis.id,
            "performance_vs_plan": analysis.performance_vs_plan,
            "pace_variance_pct": analysis.pace_variance_pct,
            "hr_zone_variance": analysis.hr_zone_variance,
            "fatigue_detected": analysis.fatigue_detected,
            "injury_risk_score": analysis.injury_risk_score,
            "summary": analysis.summary,
            "analyzed_at": analysis.analyzed_at.isoformat()
        },
        "proposal": None,
        "status": "no_adjustments"
    }


@router.post("/adjustments/{proposal_id}/validate")
def validate_adjustment_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Validate and apply proposed training plan adjustments.

    Only works for proposals with status "pending".
    Changes status to "validated" and applies adjustments.
    """
    from services.post_workout_analyzer import apply_adjustments_automatically

    proposal = db.query(AdjustmentProposal).filter(
        AdjustmentProposal.id == proposal_id,
        AdjustmentProposal.user_id == user_id
    ).first()

    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Proposal already {proposal.status}"
        )

    # Apply adjustments
    apply_adjustments_automatically(proposal.adjustments, db)

    # Update proposal status
    proposal.status = "validated"
    proposal.applied = True
    proposal.validated_at = datetime.utcnow()

    db.commit()

    logger.info(f"✅ Proposal {proposal_id} validated and applied")

    return {
        "success": True,
        "message": "Ajustements appliqués avec succès",
        "proposal": {
            "id": proposal.id,
            "status": proposal.status,
            "applied": proposal.applied,
            "validated_at": proposal.validated_at.isoformat()
        }
    }


@router.post("/adjustments/{proposal_id}/reject")
async def reject_adjustment_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Reject proposed training plan adjustments.

    Changes status to "rejected" without applying changes.
    """
    proposal = db.query(AdjustmentProposal).filter(
        AdjustmentProposal.id == proposal_id,
        AdjustmentProposal.user_id == user_id
    ).first()

    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Proposal already {proposal.status}"
        )

    # Reject proposal
    proposal.status = "rejected"
    proposal.applied = False

    db.commit()

    logger.info(f"❌ Proposal {proposal_id} rejected")

    return {
        "success": True,
        "message": "Proposition ignorée",
        "proposal": {
            "id": proposal.id,
            "status": proposal.status,
            "applied": proposal.applied
        }
    }
