"""
Injury History router for managing past injuries and strengthening recommendations.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, or_

from database import get_db
from models import InjuryHistory
from schemas import (
    InjuryHistoryCreate,
    InjuryHistoryUpdate,
    InjuryHistoryResponse
)

router = APIRouter()


@router.post("/injury-history", response_model=InjuryHistoryResponse)
async def create_injury_record(
    injury: InjuryHistoryCreate,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """Create a new injury record."""
    db_injury = InjuryHistory(
        user_id=user_id,
        injury_type=injury.injury_type,
        location=injury.location,
        side=injury.side,
        severity=injury.severity,
        occurred_at=injury.occurred_at,
        resolved_at=injury.resolved_at,
        recurrence_count=injury.recurrence_count,
        description=injury.description,
        status=injury.status,
        strengthening_focus=injury.strengthening_focus
    )

    db.add(db_injury)
    db.commit()
    db.refresh(db_injury)

    return db_injury


@router.get("/injury-history", response_model=List[InjuryHistoryResponse])
async def list_injury_history(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
    status: Optional[str] = None
):
    """
    List all injury records for the user.
    Optionally filter by status (active, monitoring, resolved).
    """
    query = db.query(InjuryHistory).filter(InjuryHistory.user_id == user_id)

    if status:
        query = query.filter(InjuryHistory.status == status)

    injuries = query.order_by(desc(InjuryHistory.occurred_at)).all()

    return injuries


@router.get("/injury-history/active", response_model=List[InjuryHistoryResponse])
async def get_active_injuries(
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Get active or monitoring injuries.
    Used for personalized strengthening recommendations.
    """
    injuries = db.query(InjuryHistory).filter(
        and_(
            InjuryHistory.user_id == user_id,
            or_(
                InjuryHistory.status == "active",
                InjuryHistory.status == "monitoring",
                InjuryHistory.recurrence_count > 0
            )
        )
    ).all()

    return injuries


@router.get("/injury-history/{injury_id}", response_model=InjuryHistoryResponse)
async def get_injury(
    injury_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """Get a specific injury record by ID."""
    injury = db.query(InjuryHistory).filter(
        and_(
            InjuryHistory.id == injury_id,
            InjuryHistory.user_id == user_id
        )
    ).first()

    if not injury:
        raise HTTPException(status_code=404, detail="Injury record not found")

    return injury


@router.patch("/injury-history/{injury_id}", response_model=InjuryHistoryResponse)
async def update_injury(
    injury_id: int,
    update_data: InjuryHistoryUpdate,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """Update an injury record."""
    injury = db.query(InjuryHistory).filter(
        and_(
            InjuryHistory.id == injury_id,
            InjuryHistory.user_id == user_id
        )
    ).first()

    if not injury:
        raise HTTPException(status_code=404, detail="Injury record not found")

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(injury, key, value)

    injury.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(injury)

    return injury


@router.delete("/injury-history/{injury_id}")
async def delete_injury(
    injury_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """Delete an injury record."""
    injury = db.query(InjuryHistory).filter(
        and_(
            InjuryHistory.id == injury_id,
            InjuryHistory.user_id == user_id
        )
    ).first()

    if not injury:
        raise HTTPException(status_code=404, detail="Injury record not found")

    db.delete(injury)
    db.commit()

    return {"message": "Injury record deleted successfully"}
