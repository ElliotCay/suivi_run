"""
Training plans router for multi-week structured training programs.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
import logging

from database import get_db
from models import User, Workout, TrainingPlan, TrainingWeek, TrainingSession
from services.claude_service import generate_training_plan, adapt_training_plan
from schemas import (
    TrainingPlanCreate,
    TrainingPlanResponse,
    TrainingPlanUpdate,
    TrainingPlanListResponse,
    TrainingWeekResponse,
    TrainingWeekUpdate,
    TrainingSessionUpdate,
    TrainingSessionResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/training-plans", response_model=TrainingPlanResponse)
async def create_training_plan(
    request: TrainingPlanCreate,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Create a new training plan with AI-generated content.

    This endpoint:
    1. Gets user profile and recent workouts
    2. Calls Claude to generate 8-12 weeks with periodization
    3. Creates TrainingPlan, TrainingWeek, and TrainingSession records
    """
    # 1. Get user profile
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Get last 4 weeks of workouts for context
    four_weeks_ago = datetime.now() - timedelta(weeks=4)
    recent_workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= four_weeks_ago
    ).order_by(Workout.date.desc()).all()

    logger.info(f"Generating {request.weeks_count}-week plan for {request.goal_type}")

    # 3. Build user profile dict with safe defaults
    user_dict = {
        'current_level': user.current_level or {},
        'weekly_volume': user.weekly_volume or 20.0,
        'injury_history': user.injury_history or [],
        'objectives': user.objectives or []
    }

    # 4. Generate plan via Claude
    try:
        result = generate_training_plan(
            user_dict,
            recent_workouts,
            request.goal_type,
            request.weeks_count,
            request.current_level,
            request.use_sonnet
        )

        plan_data = result["plan_data"]

        # 5. Create TrainingPlan record
        start_date = datetime.now()
        end_date = start_date + timedelta(weeks=request.weeks_count)

        new_plan = TrainingPlan(
            user_id=user_id,
            name=plan_data.get("plan_name", f"Plan {request.goal_type} - {request.weeks_count} semaines"),
            goal_type=request.goal_type,
            target_date=request.target_date,
            current_level=request.current_level,
            weeks_count=request.weeks_count,
            start_date=start_date,
            end_date=end_date,
            status="active"
        )

        db.add(new_plan)
        db.flush()  # Get the plan ID

        # 6. Create TrainingWeek and TrainingSession records
        for week_data in plan_data.get("weeks", []):
            week_number = week_data.get("week_number", 1)
            week_start = start_date + timedelta(weeks=week_number - 1)
            week_end = week_start + timedelta(days=6)

            new_week = TrainingWeek(
                plan_id=new_plan.id,
                week_number=week_number,
                phase=week_data.get("phase", "base"),
                description=week_data.get("description", ""),
                status="pending",
                start_date=week_start,
                end_date=week_end
            )

            db.add(new_week)
            db.flush()  # Get the week ID

            # Create sessions for this week
            for session_data in week_data.get("sessions", []):
                new_session = TrainingSession(
                    week_id=new_week.id,
                    day_of_week=session_data.get("day", "Lundi"),
                    session_order=session_data.get("order", 1),
                    workout_type=session_data.get("type", "facile"),
                    distance=session_data.get("distance_km"),
                    pace_target=session_data.get("pace_target"),
                    structure=session_data.get("structure"),
                    reasoning=session_data.get("reasoning"),
                    status="pending"
                )

                db.add(new_session)

        db.commit()
        db.refresh(new_plan)

        logger.info(f"Created training plan {new_plan.id} with {request.weeks_count} weeks")

        return new_plan

    except Exception as e:
        db.rollback()
        logger.error(f"Error creating training plan: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create training plan: {str(e)}")


@router.get("/training-plans", response_model=List[TrainingPlanListResponse])
async def get_training_plans(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
    status: str = None
):
    """
    Get all training plans for the user.

    Query params:
    - status: Filter by status (active, completed, paused, abandoned)
    """
    query = db.query(TrainingPlan).filter(TrainingPlan.user_id == user_id)

    if status:
        query = query.filter(TrainingPlan.status == status)

    plans = query.order_by(TrainingPlan.created_at.desc()).all()

    # Calculate progress for each plan
    result = []
    for plan in plans:
        completed_weeks = db.query(TrainingWeek).filter(
            TrainingWeek.plan_id == plan.id,
            TrainingWeek.status == "completed"
        ).count()

        progress = (completed_weeks / plan.weeks_count * 100) if plan.weeks_count > 0 else 0

        result.append(TrainingPlanListResponse(
            id=plan.id,
            user_id=plan.user_id,
            name=plan.name,
            goal_type=plan.goal_type,
            target_date=plan.target_date,
            weeks_count=plan.weeks_count,
            start_date=plan.start_date,
            end_date=plan.end_date,
            status=plan.status,
            progress_percentage=progress,
            created_at=plan.created_at
        ))

    return result


@router.get("/training-plans/{plan_id}", response_model=TrainingPlanResponse)
async def get_training_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Get detailed training plan with all weeks and sessions.
    """
    plan = db.query(TrainingPlan).filter(
        TrainingPlan.id == plan_id,
        TrainingPlan.user_id == user_id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Training plan not found")

    return plan


@router.patch("/training-plans/{plan_id}", response_model=TrainingPlanResponse)
async def update_training_plan(
    plan_id: int,
    update: TrainingPlanUpdate,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Update training plan (name, status, target_date).
    """
    plan = db.query(TrainingPlan).filter(
        TrainingPlan.id == plan_id,
        TrainingPlan.user_id == user_id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Training plan not found")

    if update.name is not None:
        plan.name = update.name
    if update.status is not None:
        plan.status = update.status
    if update.target_date is not None:
        plan.target_date = update.target_date

    db.commit()
    db.refresh(plan)

    return plan


@router.delete("/training-plans/{plan_id}")
async def delete_training_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Delete a training plan (cascade deletes weeks and sessions).
    """
    plan = db.query(TrainingPlan).filter(
        TrainingPlan.id == plan_id,
        TrainingPlan.user_id == user_id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Training plan not found")

    db.delete(plan)
    db.commit()

    return {"message": "Training plan deleted successfully", "id": plan_id}


@router.patch("/training-plans/{plan_id}/weeks/{week_number}", response_model=TrainingWeekResponse)
async def update_training_week(
    plan_id: int,
    week_number: int,
    update: TrainingWeekUpdate,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Update a specific week in the training plan.
    """
    # Verify plan ownership
    plan = db.query(TrainingPlan).filter(
        TrainingPlan.id == plan_id,
        TrainingPlan.user_id == user_id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Training plan not found")

    # Get the week
    week = db.query(TrainingWeek).filter(
        TrainingWeek.plan_id == plan_id,
        TrainingWeek.week_number == week_number
    ).first()

    if not week:
        raise HTTPException(status_code=404, detail="Week not found")

    if update.status is not None:
        week.status = update.status
    if update.description is not None:
        week.description = update.description

    db.commit()
    db.refresh(week)

    return week


@router.patch("/training-plans/{plan_id}/sessions/{session_id}", response_model=TrainingSessionResponse)
async def update_training_session(
    plan_id: int,
    session_id: int,
    update: TrainingSessionUpdate,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Update a training session (mark as completed, skipped, etc.).
    """
    # Verify plan ownership
    plan = db.query(TrainingPlan).filter(
        TrainingPlan.id == plan_id,
        TrainingPlan.user_id == user_id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Training plan not found")

    # Get the session
    session = db.query(TrainingSession).join(TrainingWeek).filter(
        TrainingSession.id == session_id,
        TrainingWeek.plan_id == plan_id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if update.status is not None:
        session.status = update.status
    if update.completed_workout_id is not None:
        session.completed_workout_id = update.completed_workout_id

    db.commit()
    db.refresh(session)

    return session


@router.post("/training-plans/{plan_id}/adapt")
async def adapt_plan(
    plan_id: int,
    user_feedback: str,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Adapt the training plan based on missed sessions and user feedback.

    This uses Claude to analyze performance and suggest adjustments.
    """
    plan = db.query(TrainingPlan).filter(
        TrainingPlan.id == plan_id,
        TrainingPlan.user_id == user_id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Training plan not found")

    # Get missed/skipped sessions
    missed_sessions_data = []
    for week in plan.weeks:
        for session in week.sessions:
            if session.status == "skipped":
                missed_sessions_data.append({
                    "week": week.week_number,
                    "day": session.day_of_week,
                    "type": session.workout_type,
                    "distance": session.distance,
                    "reason": "skipped"
                })

    # Get remaining weeks
    current_week = db.query(TrainingWeek).filter(
        TrainingWeek.plan_id == plan_id,
        TrainingWeek.status == "in_progress"
    ).first()

    remaining_weeks = plan.weeks_count - (current_week.week_number if current_week else 0)

    plan_data = {
        "plan_name": plan.name,
        "remaining_weeks": remaining_weeks,
        "goal_type": plan.goal_type
    }

    # Call Claude for adaptation
    try:
        result = adapt_training_plan(
            plan_data,
            missed_sessions_data,
            user_feedback,
            use_sonnet=True
        )

        logger.info(f"Generated adaptation for plan {plan_id}")

        return {
            "plan_id": plan_id,
            "adaptation": result["adaptation"],
            "model_used": result["model_used"],
            "tokens_used": result["tokens_used"]
        }

    except Exception as e:
        logger.error(f"Error adapting plan: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to adapt plan: {str(e)}")
