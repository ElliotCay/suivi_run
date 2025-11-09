"""
Training Blocks router for managing 4-week training cycles.
"""

from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from database import get_db
from models import (
    TrainingBlock,
    PlannedWorkout,
    StrengtheningReminder,
    TrainingZone,
    WorkoutFeedback,
    Workout
)
from schemas import (
    GenerateBlockRequest,
    TrainingBlockResponse,
    TrainingBlockListResponse,
    PlannedWorkoutResponse,
    StrengtheningReminderResponse,
    TrainingZoneResponse,
    WorkoutFeedbackCreate,
    WorkoutFeedbackResponse
)
from services.training_block_generator import generate_4_week_block
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/training/generate-block", response_model=TrainingBlockResponse)
async def generate_training_block(
    request: GenerateBlockRequest,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Generate a new 4-week training block with periodization.

    Args:
        request: Block generation parameters
        user_id: User ID (from auth)

    Returns:
        Complete training block with all planned workouts
    """
    try:
        # Check if there's already an active block
        active_block = db.query(TrainingBlock).filter(
            and_(
                TrainingBlock.user_id == user_id,
                TrainingBlock.status == "active"
            )
        ).first()

        if active_block:
            raise HTTPException(
                status_code=400,
                detail="You already have an active training block. Complete or abandon it before creating a new one."
            )

        # Generate the block
        block = generate_4_week_block(
            db=db,
            user_id=user_id,
            phase=request.phase,
            days_per_week=request.days_per_week,
            start_date=request.start_date,
            use_ai_descriptions=request.use_ai_descriptions,
            use_sonnet=request.use_sonnet,
            add_recovery_sunday=request.add_recovery_sunday
        )

        logger.info(f"Generated training block {block.id} for user {user_id}")

        return block

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating training block: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/training/current-block", response_model=TrainingBlockResponse)
async def get_current_block(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Get the current active training block with all planned workouts.

    Returns:
        Current training block or 404 if no active block
    """
    block = db.query(TrainingBlock).filter(
        and_(
            TrainingBlock.user_id == user_id,
            TrainingBlock.status == "active"
        )
    ).first()

    if not block:
        raise HTTPException(status_code=404, detail="No active training block found")

    return block


@router.get("/training/blocks", response_model=List[TrainingBlockListResponse])
async def list_training_blocks(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    List all training blocks for the user.

    Returns:
        List of training blocks (without detailed workouts)
    """
    blocks = db.query(TrainingBlock).filter(
        TrainingBlock.user_id == user_id
    ).order_by(desc(TrainingBlock.start_date)).all()

    # Calculate progress percentage
    result = []
    for block in blocks:
        total_workouts = len(block.planned_workouts)
        completed_workouts = sum(
            1 for w in block.planned_workouts if w.status == "completed"
        )
        progress_pct = (completed_workouts / total_workouts * 100) if total_workouts > 0 else 0

        result.append(TrainingBlockListResponse(
            id=block.id,
            user_id=block.user_id,
            name=block.name,
            phase=block.phase,
            start_date=block.start_date,
            end_date=block.end_date,
            days_per_week=block.days_per_week,
            status=block.status,
            progress_percentage=round(progress_pct, 1)
        ))

    return result


@router.get("/training/blocks/{block_id}", response_model=TrainingBlockResponse)
async def get_training_block(
    block_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Get a specific training block by ID."""
    block = db.query(TrainingBlock).filter(
        and_(TrainingBlock.id == block_id, TrainingBlock.user_id == user_id)
    ).first()

    if not block:
        raise HTTPException(status_code=404, detail="Training block not found")

    return block


@router.delete("/training/blocks/{block_id}")
async def delete_training_block(
    block_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Delete a training block and all associated workouts and reminders.

    Args:
        block_id: Block ID
        user_id: User ID (from auth)
    """
    block = db.query(TrainingBlock).filter(
        and_(TrainingBlock.id == block_id, TrainingBlock.user_id == user_id)
    ).first()

    if not block:
        raise HTTPException(status_code=404, detail="Training block not found")

    # Delete the block (cascade will delete workouts and reminders)
    db.delete(block)
    db.commit()

    logger.info(f"Deleted training block {block_id} for user {user_id}")

    return {"message": "Training block deleted successfully", "block_id": block_id}


@router.patch("/training/blocks/{block_id}/status")
async def update_block_status(
    block_id: int,
    status: str,  # active, completed, abandoned
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Update training block status.

    Args:
        block_id: Block ID
        status: New status (active, completed, abandoned)
    """
    if status not in ["active", "completed", "abandoned"]:
        raise HTTPException(status_code=400, detail="Invalid status")

    block = db.query(TrainingBlock).filter(
        and_(TrainingBlock.id == block_id, TrainingBlock.user_id == user_id)
    ).first()

    if not block:
        raise HTTPException(status_code=404, detail="Training block not found")

    block.status = status
    db.commit()

    return {"message": f"Block status updated to {status}"}


@router.get("/training/zones", response_model=TrainingZoneResponse)
async def get_training_zones(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Get current training zones (calculated from PRs and VDOT).

    Returns:
        Current training zones with pace recommendations
    """
    zone = db.query(TrainingZone).filter(
        and_(
            TrainingZone.user_id == user_id,
            TrainingZone.is_current == True
        )
    ).first()

    if not zone:
        raise HTTPException(
            status_code=404,
            detail="No training zones found. Please add a personal record first."
        )

    return zone


@router.get("/training/strengthening-reminders", response_model=List[StrengtheningReminderResponse])
async def get_strengthening_reminders(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
    start_date: str = None,
    end_date: str = None,
):
    """
    Get strengthening reminders for a date range.

    Args:
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)

    Returns:
        List of strengthening reminders
    """
    query = db.query(StrengtheningReminder).filter(
        StrengtheningReminder.user_id == user_id
    )

    if start_date:
        query = query.filter(StrengtheningReminder.scheduled_date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(StrengtheningReminder.scheduled_date <= datetime.fromisoformat(end_date))

    reminders = query.order_by(StrengtheningReminder.scheduled_date).all()

    return reminders


@router.post("/training/workouts/{workout_id}/complete")
async def complete_planned_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Mark a planned workout as completed.

    Args:
        workout_id: ID of the planned workout
        user_id: User ID (from auth)
    """
    workout = db.query(PlannedWorkout).filter(
        and_(PlannedWorkout.id == workout_id, PlannedWorkout.user_id == user_id)
    ).first()

    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    if workout.status == "completed":
        raise HTTPException(status_code=400, detail="Workout already completed")

    workout.status = "completed"
    workout.completed_at = datetime.utcnow()
    db.commit()

    logger.info(f"Marked planned workout {workout_id} as completed")

    return {"message": "Workout marked as completed", "workout_id": workout_id}


@router.patch("/training/strengthening-reminders/{reminder_id}/complete")
async def complete_strengthening_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Mark a strengthening reminder as completed."""
    reminder = db.query(StrengtheningReminder).filter(
        and_(
            StrengtheningReminder.id == reminder_id,
            StrengtheningReminder.user_id == user_id
        )
    ).first()

    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.completed = True
    reminder.completed_at = datetime.utcnow()
    db.commit()

    return {"message": "Reminder marked as completed"}


@router.post("/training/feedback", response_model=WorkoutFeedbackResponse)
async def create_workout_feedback(
    feedback: WorkoutFeedbackCreate,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Submit feedback for a completed workout.

    Args:
        feedback: Feedback data (RPE, difficulty, pain, comments)

    Returns:
        Created feedback
    """
    # Get the completed workout
    workout = db.query(Workout).filter(
        and_(
            Workout.id == feedback.completed_workout_id,
            Workout.user_id == user_id
        )
    ).first()

    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    # Calculate pace variance if planned workout exists
    planned_pace_min = None
    actual_pace = workout.avg_pace
    pace_variance = None

    if feedback.planned_workout_id:
        planned_workout = db.query(PlannedWorkout).filter(
            PlannedWorkout.id == feedback.planned_workout_id
        ).first()

        if planned_workout:
            planned_pace_min = planned_workout.target_pace_min
            if planned_pace_min and actual_pace:
                pace_variance = ((actual_pace - planned_pace_min) / planned_pace_min) * 100

    # Create feedback
    workout_feedback = WorkoutFeedback(
        user_id=user_id,
        completed_workout_id=feedback.completed_workout_id,
        planned_workout_id=feedback.planned_workout_id,
        rpe=feedback.rpe,
        difficulty=feedback.difficulty,
        pain_locations=feedback.pain_locations,
        pain_severity=feedback.pain_severity,
        comment=feedback.comment,
        planned_pace_min=planned_pace_min,
        actual_pace=actual_pace,
        pace_variance=pace_variance
    )

    db.add(workout_feedback)
    db.commit()
    db.refresh(workout_feedback)

    logger.info(f"Created workout feedback {workout_feedback.id} for workout {feedback.completed_workout_id}")

    return workout_feedback


@router.get("/training/feedback/{workout_id}", response_model=WorkoutFeedbackResponse)
async def get_workout_feedback(
    workout_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Get feedback for a specific workout."""
    feedback = db.query(WorkoutFeedback).filter(
        and_(
            WorkoutFeedback.completed_workout_id == workout_id,
            WorkoutFeedback.user_id == user_id
        )
    ).first()

    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")

    return feedback


@router.patch("/training/workouts/{workout_id}/reschedule")
async def reschedule_planned_workout(
    workout_id: int,
    new_date: str,  # ISO format YYYY-MM-DD
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Reschedule a planned workout to a different date.

    Args:
        workout_id: ID of the planned workout
        new_date: New date in YYYY-MM-DD format
        user_id: User ID (from auth)
    """
    from datetime import datetime

    # Get the workout
    workout = db.query(PlannedWorkout).filter(
        and_(PlannedWorkout.id == workout_id, PlannedWorkout.user_id == user_id)
    ).first()

    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")

    if workout.status == "completed":
        raise HTTPException(
            status_code=400,
            detail="Cannot reschedule a completed workout"
        )

    # Parse new date
    try:
        new_datetime = datetime.fromisoformat(new_date)
        # Keep the same time as the original workout
        new_datetime = new_datetime.replace(
            hour=workout.scheduled_date.hour,
            minute=workout.scheduled_date.minute,
            second=0,
            microsecond=0
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Update the workout
    old_date = workout.scheduled_date
    workout.scheduled_date = new_datetime

    # Update day_of_week
    days_fr = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    workout.day_of_week = days_fr[new_datetime.weekday()]

    db.commit()
    db.refresh(workout)

    logger.info(f"Rescheduled workout {workout_id} from {old_date.strftime('%Y-%m-%d')} to {new_datetime.strftime('%Y-%m-%d')}")

    return {
        "message": "Workout rescheduled successfully",
        "workout_id": workout_id,
        "old_date": old_date.isoformat(),
        "new_date": new_datetime.isoformat(),
        "day_of_week": workout.day_of_week
    }


@router.post("/training/blocks/{block_id}/complete-and-generate-next")
async def complete_block_and_generate_next(
    block_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Complete current training block and automatically generate the next one.

    This endpoint:
    1. Analyzes all feedback from the completed block
    2. Detects issues (overtraining, pain, pace problems)
    3. Generates recommendations for adjustments
    4. Marks current block as "completed"
    5. Creates next block with automatic adaptations based on feedback

    Args:
        block_id: ID of the block to complete
        user_id: User ID (from auth)

    Returns:
        Dictionary with:
        - completed_block: Summary of completed block
        - analysis: Feedback analysis with warnings/recommendations
        - next_block: Newly generated adapted block
    """
    from services.feedback_analyzer import get_block_summary
    from services.training_block_generator import generate_4_week_block, calculate_recent_volume

    # Get the block to complete
    block = db.query(TrainingBlock).filter(
        and_(TrainingBlock.id == block_id, TrainingBlock.user_id == user_id)
    ).first()

    if not block:
        raise HTTPException(status_code=404, detail="Training block not found")

    if block.status != "active":
        raise HTTPException(
            status_code=400,
            detail=f"Block is already {block.status}. Only active blocks can be completed."
        )

    try:
        # Step 1: Analyze feedback from completed block
        logger.info(f"Analyzing feedback for block {block_id}")
        summary = get_block_summary(db, block_id)

        # Step 2: Mark block as completed
        block.status = "completed"
        db.commit()

        logger.info(f"Block {block_id} marked as completed")

        # Step 3: Calculate adjustments for next block
        volume_adjustment = summary.get("suggested_volume_adjustment", 0.0)
        suggested_phase = summary.get("suggested_phase", block.phase)

        # Use the PLANNED volume from current block as base (not actual volume)
        # This ensures we don't compound issues from underperforming
        base_volume = block.target_weekly_volume

        # Apply suggested volume adjustment
        new_volume = base_volume * (1 + volume_adjustment / 100)

        # Ensure volume doesn't drop below minimum or increase too much
        min_volume = 15.0
        max_volume = base_volume * 1.3  # Max 30% increase from current plan
        new_volume = max(min_volume, min(new_volume, max_volume))

        logger.info(f"Volume calculation: base={base_volume:.1f}km, adjustment={volume_adjustment:+.0f}%, new={new_volume:.1f}km")

        # Step 4: Determine next phase progression
        # If critical issues detected, stay in base phase (most conservative)
        if summary["analysis"].get("has_critical_issues", False):
            next_phase = "base"  # Always use base phase when critical issues
            logger.warning(f"Critical issues detected. Staying in base phase")
        elif suggested_phase == "recovery":
            next_phase = "base"  # Recovery suggestion → use base phase
        else:
            # Natural progression: base → development → peak → base
            phase_progression = {
                "base": "development",
                "development": "peak",
                "peak": "base"
            }
            next_phase = phase_progression.get(block.phase, "base")

            # Override if feedback suggests staying in same phase
            if volume_adjustment < -10:  # Significant reduction needed
                next_phase = block.phase  # Stay in same phase
                logger.info(f"Significant volume reduction needed. Staying in {next_phase} phase")

        logger.info(f"Next block parameters: phase={next_phase}, volume={new_volume:.1f}km, adjustment={volume_adjustment:+.0f}%")

        # Step 5: Generate next block with adaptations
        next_block = generate_4_week_block(
            db=db,
            user_id=user_id,
            phase=next_phase,
            days_per_week=block.days_per_week,
            start_date=block.end_date + timedelta(days=1),  # Start day after current block ends
            target_volume=new_volume  # Pass calculated volume with adjustments
        )

        logger.info(f"Generated next block {next_block.id} starting {next_block.start_date.strftime('%d/%m/%Y')}")

        return {
            "message": "Block completed and next block generated successfully",
            "completed_block": {
                "id": block.id,
                "name": block.name,
                "phase": block.phase,
                "start_date": block.start_date,
                "end_date": block.end_date,
                "total_volume": block.target_weekly_volume * 4,
                "completion_rate": summary.get("completion_rate", 0)
            },
            "analysis": {
                "avg_rpe": summary["analysis"]["avg_rpe"],
                "too_hard_percentage": summary["analysis"]["too_hard_percentage"],
                "pain_percentage": summary["analysis"]["pain_percentage"],
                "warnings": summary["warnings"],
                "recommendations": summary["recommendations"],
                "volume_adjustment_applied": volume_adjustment,
                "has_critical_issues": summary["analysis"]["has_critical_issues"]
            },
            "next_block": {
                "id": next_block.id,
                "name": next_block.name,
                "phase": next_block.phase,
                "start_date": next_block.start_date,
                "end_date": next_block.end_date,
                "days_per_week": next_block.days_per_week,
                "target_weekly_volume": next_block.target_weekly_volume,
                "total_workouts": len(next_block.planned_workouts),
                "ratios": f"{next_block.easy_percentage}/{next_block.threshold_percentage}/{next_block.interval_percentage}"
            }
        }

    except ValueError as e:
        # If generation fails, rollback the completion
        block.status = "active"
        db.commit()
        logger.error(f"Failed to generate next block: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error completing block and generating next: {e}")
        raise HTTPException(status_code=500, detail=str(e))
