"""
Race Objectives router for managing race goals and preparation.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from database import get_db
from models import RaceObjective
from schemas import (
    RaceObjectiveCreate,
    RaceObjectiveUpdate,
    RaceObjectiveResponse
)

router = APIRouter()


@router.post("/race-objectives", response_model=RaceObjectiveResponse)
async def create_race_objective(
    objective: RaceObjectiveCreate,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Create a new race objective.
    Only one active race objective is allowed at a time.
    """
    # Check if there's already an active race objective
    existing_active = db.query(RaceObjective).filter(
        and_(
            RaceObjective.user_id == user_id,
            RaceObjective.status == "active"
        )
    ).first()

    if existing_active:
        raise HTTPException(
            status_code=400,
            detail="You already have an active race objective. Complete or cancel it before creating a new one."
        )

    # Create new objective
    db_objective = RaceObjective(
        user_id=user_id,
        name=objective.name,
        race_date=objective.race_date,
        distance=objective.distance,
        target_time_seconds=objective.target_time_seconds,
        location=objective.location,
        status="active"
    )

    db.add(db_objective)
    db.commit()
    db.refresh(db_objective)

    return db_objective


@router.get("/race-objectives", response_model=List[RaceObjectiveResponse])
async def list_race_objectives(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
    status: Optional[str] = None
):
    """
    List all race objectives for the user.
    Optionally filter by status (active, completed, cancelled).
    """
    query = db.query(RaceObjective).filter(RaceObjective.user_id == user_id)

    if status:
        query = query.filter(RaceObjective.status == status)

    objectives = query.order_by(desc(RaceObjective.race_date)).all()

    return objectives


@router.get("/race-objectives/current", response_model=RaceObjectiveResponse)
async def get_current_race_objective(
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Get the current active race objective.
    Returns 404 if no active objective exists.
    """
    objective = db.query(RaceObjective).filter(
        and_(
            RaceObjective.user_id == user_id,
            RaceObjective.status == "active"
        )
    ).first()

    if not objective:
        raise HTTPException(status_code=404, detail="No active race objective found")

    return objective


@router.get("/race-objectives/{objective_id}", response_model=RaceObjectiveResponse)
async def get_race_objective(
    objective_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """Get a specific race objective by ID."""
    objective = db.query(RaceObjective).filter(
        and_(
            RaceObjective.id == objective_id,
            RaceObjective.user_id == user_id
        )
    ).first()

    if not objective:
        raise HTTPException(status_code=404, detail="Race objective not found")

    return objective


@router.patch("/race-objectives/{objective_id}", response_model=RaceObjectiveResponse)
async def update_race_objective(
    objective_id: int,
    update_data: RaceObjectiveUpdate,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """Update a race objective."""
    objective = db.query(RaceObjective).filter(
        and_(
            RaceObjective.id == objective_id,
            RaceObjective.user_id == user_id
        )
    ).first()

    if not objective:
        raise HTTPException(status_code=404, detail="Race objective not found")

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(objective, key, value)

    objective.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(objective)

    return objective


@router.patch("/race-objectives/{objective_id}/complete", response_model=RaceObjectiveResponse)
async def complete_race_objective(
    objective_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """Mark a race objective as completed."""
    objective = db.query(RaceObjective).filter(
        and_(
            RaceObjective.id == objective_id,
            RaceObjective.user_id == user_id
        )
    ).first()

    if not objective:
        raise HTTPException(status_code=404, detail="Race objective not found")

    objective.status = "completed"
    objective.completed_at = datetime.utcnow()
    objective.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(objective)

    return objective


@router.delete("/race-objectives/{objective_id}")
async def delete_race_objective(
    objective_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1  # TODO: Get from auth
):
    """
    Delete a race objective.
    This will also unlink all associated training blocks.
    """
    objective = db.query(RaceObjective).filter(
        and_(
            RaceObjective.id == objective_id,
            RaceObjective.user_id == user_id
        )
    ).first()

    if not objective:
        raise HTTPException(status_code=404, detail="Race objective not found")

    db.delete(objective)
    db.commit()

    return {"message": "Race objective deleted successfully"}
