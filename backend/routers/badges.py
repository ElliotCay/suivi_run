"""
Badges router for user achievements and gamification.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from services import badges_service
from models import UserBadge

router = APIRouter()


class BadgeResponse(BaseModel):
    """Badge response schema."""
    id: int
    badge_type: str
    badge_key: str
    badge_name: str
    badge_icon: Optional[str]
    badge_description: Optional[str]
    metric_value: Optional[float]
    unlocked_at: datetime
    is_viewed: bool

    class Config:
        from_attributes = True


class BadgeCheckResponse(BaseModel):
    """Response for badge detection check."""
    new_badges_count: int
    new_badges: List[dict]


@router.get("/badges", response_model=List[BadgeResponse])
async def get_badges(
    include_viewed: bool = True,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Get all user badges."""
    badges = badges_service.get_user_badges(db, user_id, include_viewed=include_viewed)
    return badges


@router.get("/badges/unviewed", response_model=List[BadgeResponse])
async def get_unviewed_badges(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Get only unviewed badges (for toast notifications)."""
    badges = badges_service.get_user_badges(db, user_id, include_viewed=False)
    return badges


@router.post("/badges/check", response_model=BadgeCheckResponse)
async def check_for_new_badges(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Check for new badges and unlock them.
    This endpoint should be called after workouts are added or updated.
    """
    new_badges = badges_service.detect_new_badges(db, user_id)

    return {
        "new_badges_count": len(new_badges),
        "new_badges": new_badges
    }


@router.patch("/badges/mark-viewed")
async def mark_badges_viewed(
    badge_ids: Optional[List[int]] = None,
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """
    Mark badges as viewed.
    If badge_ids is not provided, marks all badges as viewed.
    """
    badges_service.mark_badges_as_viewed(db, user_id, badge_ids)

    return {
        "message": "Badges marked as viewed",
        "count": len(badge_ids) if badge_ids else "all"
    }


@router.get("/badges/stats")
async def get_badge_stats(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
):
    """Get badge statistics (total count by type)."""
    all_badges = badges_service.get_user_badges(db, user_id)

    stats = {
        "total": len(all_badges),
        "by_type": {}
    }

    for badge in all_badges:
        badge_type = badge.badge_type
        if badge_type not in stats["by_type"]:
            stats["by_type"][badge_type] = 0
        stats["by_type"][badge_type] += 1

    return stats
