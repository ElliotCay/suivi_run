"""
API endpoints for weekly recaps.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from services.weekly_recap_service import (
    generate_weekly_recap,
    get_user_recaps,
    get_latest_recap,
    mark_recap_as_viewed,
    get_week_boundaries
)


router = APIRouter()


class WeeklyRecapResponse(BaseModel):
    """Response model for weekly recap."""
    id: int
    user_id: int
    week_start_date: datetime
    week_end_date: datetime
    recap_text: str
    sessions_completed: Optional[int]
    sessions_planned: Optional[int]
    total_volume_km: Optional[float]
    avg_pace_seconds: Optional[int]
    avg_heart_rate: Optional[int]
    readiness_avg: Optional[int]
    generated_at: datetime
    is_viewed: bool

    class Config:
        from_attributes = True


class GenerateRecapRequest(BaseModel):
    """Request model for generating a recap."""
    week_start_date: Optional[str] = None  # ISO format date string


@router.get("/weekly-recaps", response_model=List[WeeklyRecapResponse])
async def get_recaps(
    limit: int = 10,
    user_id: int = 1,  # TODO: Get from auth
    db: Session = Depends(get_db)
):
    """
    Get weekly recaps for the current user.

    Args:
        limit: Maximum number of recaps to return (default 10)
        user_id: User ID (from auth)
        db: Database session

    Returns:
        List of weekly recaps ordered by most recent first
    """
    recaps = get_user_recaps(db, user_id, limit)
    return recaps


@router.get("/weekly-recaps/latest", response_model=Optional[WeeklyRecapResponse])
async def get_latest_recap_endpoint(
    user_id: int = 1,  # TODO: Get from auth
    db: Session = Depends(get_db)
):
    """
    Get the most recent weekly recap for the current user.

    Args:
        user_id: User ID (from auth)
        db: Database session

    Returns:
        Latest weekly recap or None
    """
    recap = get_latest_recap(db, user_id)
    return recap


@router.post("/weekly-recaps/generate", response_model=WeeklyRecapResponse)
async def generate_recap(
    request: GenerateRecapRequest,
    user_id: int = 1,  # TODO: Get from auth
    db: Session = Depends(get_db)
):
    """
    Generate a new weekly recap using AI.

    Args:
        request: Generation request with optional week_start_date
        user_id: User ID (from auth)
        db: Database session

    Returns:
        Generated weekly recap

    Raises:
        HTTPException: If recap generation fails
    """
    # Parse week start date if provided
    week_start = None
    if request.week_start_date:
        try:
            week_start = datetime.fromisoformat(request.week_start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use ISO format (YYYY-MM-DD)")

    # Generate recap
    recap = await generate_weekly_recap(db, user_id, week_start)

    if not recap:
        raise HTTPException(status_code=500, detail="Failed to generate weekly recap")

    return recap


@router.patch("/weekly-recaps/{recap_id}/mark-viewed")
async def mark_viewed(
    recap_id: int,
    user_id: int = 1,  # TODO: Get from auth
    db: Session = Depends(get_db)
):
    """
    Mark a weekly recap as viewed.

    Args:
        recap_id: ID of the recap to mark as viewed
        user_id: User ID (from auth)
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException: If recap not found
    """
    success = mark_recap_as_viewed(db, recap_id)

    if not success:
        raise HTTPException(status_code=404, detail="Weekly recap not found")

    return {"message": "Weekly recap marked as viewed"}


@router.get("/weekly-recaps/current-week", response_model=dict)
async def get_current_week_info(user_id: int = 1):
    """
    Get information about the current week.

    Returns:
        Dictionary with week_start and week_end dates
    """
    monday, sunday = get_week_boundaries()

    return {
        "week_start": monday.isoformat(),
        "week_end": sunday.isoformat(),
        "week_number": monday.isocalendar()[1]
    }


@router.post("/weekly-recaps/generate-last-week", response_model=Optional[WeeklyRecapResponse])
async def generate_last_week_recap(
    user_id: int = 1,  # TODO: Get from auth
    db: Session = Depends(get_db)
):
    """
    Generate recap for last week automatically (if it doesn't exist).

    This endpoint is called automatically on dashboard load to ensure
    the user always has a recap for the completed week.

    Logic:
    - If today is Monday-Wednesday, check for last week's recap
    - If recap doesn't exist and there were workouts, generate it
    - If recap exists, return it
    - If no workouts last week, return None

    Args:
        user_id: User ID (from auth)
        db: Database session

    Returns:
        Generated weekly recap or existing recap if already exists
    """
    from datetime import timedelta

    try:
        # Calculate last week's Monday
        today = datetime.now()
        current_monday, _ = get_week_boundaries(today)
        last_week_monday = current_monday - timedelta(days=7)

        # Try to get existing recap for last week
        from services.weekly_recap_service import get_week_workouts
        from models import WeeklyRecap
        from sqlalchemy import and_

        # Compare only dates (not times) to handle microsecond differences
        existing_recap = db.query(WeeklyRecap).filter(
            and_(
                WeeklyRecap.user_id == user_id,
                func.date(WeeklyRecap.week_start_date) == last_week_monday.date()
            )
        ).first()

        if existing_recap:
            print(f"✅ Found existing recap for week starting {last_week_monday.date()}")
            return existing_recap

        # Check if there were any workouts last week
        last_week_sunday = last_week_monday + timedelta(days=6, hours=23, minutes=59, seconds=59)
        workouts = get_week_workouts(db, user_id, last_week_monday, last_week_sunday)

        # Only generate if there were workouts
        if not workouts:
            print(f"ℹ️  No workouts found for week starting {last_week_monday.date()}, skipping recap generation")
            return None

        # Generate the recap for last week
        print(f"🔄 Generating recap for week starting {last_week_monday.date()} ({len(workouts)} workouts)")
        recap = await generate_weekly_recap(db, user_id, last_week_monday)

        if recap:
            print(f"✅ Successfully generated recap for week starting {last_week_monday.date()}")

        return recap
    except Exception as e:
        # Log the error but don't crash the dashboard
        print(f"❌ Error generating last week recap: {e}")
        import traceback
        traceback.print_exc()
        # Return None instead of raising HTTPException to not block dashboard
        return None
