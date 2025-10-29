"""
Suggestions router for AI-powered workout recommendations.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from database import get_db
from models import User, Workout, Suggestion
from services.claude_service import (
    build_suggestion_prompt,
    build_week_prompt,
    call_claude_api,
    parse_suggestion_response
)
from schemas import SuggestionResponse, SuggestionGenerateRequest

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/suggestions/generate")
async def generate_suggestion(
    request: SuggestionGenerateRequest,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Generate AI-powered workout suggestion(s) via Claude."""

    # 1. Get user profile
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Get last 4 weeks of workouts
    four_weeks_ago = datetime.now() - timedelta(weeks=4)
    recent_workouts = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= four_weeks_ago
    ).order_by(Workout.date.desc()).all()

    logger.info(f"Found {len(recent_workouts)} workouts in last 4 weeks")

    # 3. Build user dict
    user_dict = {
        'current_level': user.current_level,
        'weekly_volume': user.weekly_volume,
        'injury_history': user.injury_history,
        'objectives': user.objectives
    }

    # 4. Generate week or single workout
    if request.generate_week:
        # Generate a complete week (3 workouts)
        prompt = build_week_prompt(user_dict, recent_workouts, program_week=2)
        response = call_claude_api(prompt, use_sonnet=request.use_sonnet)
        week_data = parse_suggestion_response(response["content"])

        # Create suggestions for each workout in the week
        suggestions = []
        for workout in week_data.get("workouts", []):
            new_suggestion = Suggestion(
                user_id=user_id,
                workout_type=workout.get("type", "facile"),
                distance=workout.get("distance_km"),
                pace_target=None,
                structure=workout,  # Store the workout object with day info
                reasoning=workout.get("raison"),
                model_used=response["model"],
                tokens_used=response["tokens"] // len(week_data.get("workouts", [])),  # Split tokens
                completed=0
            )
            db.add(new_suggestion)
            suggestions.append(new_suggestion)

        db.commit()
        for s in suggestions:
            db.refresh(s)

        logger.info(f"Created {len(suggestions)} suggestions for week")
        return {"week_description": week_data.get("week_description"), "suggestions": suggestions}

    else:
        # Generate single workout
        prompt = build_suggestion_prompt(
            user_dict,
            recent_workouts,
            program_week=2,
            workout_type=request.workout_type
        )

        response = call_claude_api(prompt, use_sonnet=request.use_sonnet)
        suggestion_data = parse_suggestion_response(response["content"])

        new_suggestion = Suggestion(
            user_id=user_id,
            workout_type=suggestion_data.get("type", "facile"),
            distance=suggestion_data.get("distance_km"),
            pace_target=None,
            structure=suggestion_data,
            reasoning=suggestion_data.get("raison"),
            model_used=response["model"],
            tokens_used=response["tokens"],
            completed=0
        )

        db.add(new_suggestion)
        db.commit()
        db.refresh(new_suggestion)

        logger.info(f"Created suggestion {new_suggestion.id}")
        return new_suggestion


@router.get("/suggestions", response_model=list[SuggestionResponse])
async def get_suggestions(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
    limit: int = 10
):
    """Get user's suggestion history."""
    suggestions = db.query(Suggestion).filter(
        Suggestion.user_id == user_id
    ).order_by(Suggestion.created_at.desc()).limit(limit).all()

    return suggestions


@router.patch("/suggestions/{suggestion_id}/complete", response_model=SuggestionResponse)
async def mark_suggestion_complete(
    suggestion_id: int,
    workout_id: int | None = None,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Mark a suggestion as completed."""
    suggestion = db.query(Suggestion).filter(
        Suggestion.id == suggestion_id,
        Suggestion.user_id == user_id
    ).first()

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    suggestion.completed = 1
    suggestion.completed_workout_id = workout_id

    db.commit()
    db.refresh(suggestion)

    return suggestion


@router.delete("/suggestions/{suggestion_id}")
async def delete_suggestion(
    suggestion_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Delete a suggestion."""
    suggestion = db.query(Suggestion).filter(
        Suggestion.id == suggestion_id,
        Suggestion.user_id == user_id
    ).first()

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    db.delete(suggestion)
    db.commit()

    return {"message": "Suggestion deleted successfully", "id": suggestion_id}
