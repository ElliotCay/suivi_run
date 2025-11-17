"""
API endpoints for weekly recaps.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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
