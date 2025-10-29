"""
Workouts router for managing running workout data.
"""

from typing import List, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from database import get_db
from models import Workout
from schemas import WorkoutResponse, WorkoutUpdate
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/workouts", response_model=List[WorkoutResponse])
async def get_workouts(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
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
