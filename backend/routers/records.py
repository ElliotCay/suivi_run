"""
Personal records router for managing manual PR entries.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from database import get_db
from models import PersonalRecord
from schemas import PersonalRecordCreate, PersonalRecordResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


def format_time(seconds: int) -> str:
    """Format seconds to MM:SS"""
    minutes = seconds // 60
    secs = seconds % 60
    return f"{minutes}:{secs:02d}"


@router.get("/records", response_model=List[PersonalRecordResponse])
async def get_personal_records(
    db: Session = Depends(get_db),
    user_id: int = 1,
    include_history: bool = False
):
    """
    Get personal records for all distances.

    If include_history=False, returns only current records.
    If include_history=True, returns all records including superseded ones.
    """
    query = db.query(PersonalRecord).filter(PersonalRecord.user_id == user_id)

    if not include_history:
        query = query.filter(PersonalRecord.is_current == 1)

    records = query.order_by(PersonalRecord.distance, PersonalRecord.date_achieved.desc()).all()

    # Add formatted time to response
    response = []
    for record in records:
        response.append(PersonalRecordResponse(
            id=record.id,
            distance=record.distance,
            time_seconds=record.time_seconds,
            time_display=format_time(record.time_seconds),
            date_achieved=record.date_achieved,
            is_current=bool(record.is_current),
            notes=record.notes,
            created_at=record.created_at,
            superseded_at=record.superseded_at
        ))

    return response


@router.get("/records/{distance}")
async def get_record_history(
    distance: str,
    db: Session = Depends(get_db),
    user_id: int = 1,
):
    """
    Get all records (current + history) for a specific distance.
    Shows progression over time.
    """
    records = db.query(PersonalRecord).filter(
        PersonalRecord.user_id == user_id,
        PersonalRecord.distance == distance
    ).order_by(PersonalRecord.date_achieved.desc()).all()

    if not records:
        return []

    response = []
    for record in records:
        response.append({
            "id": record.id,
            "time_seconds": record.time_seconds,
            "time_display": format_time(record.time_seconds),
            "date_achieved": record.date_achieved.isoformat(),
            "is_current": bool(record.is_current),
            "notes": record.notes,
            "created_at": record.created_at.isoformat(),
            "superseded_at": record.superseded_at.isoformat() if record.superseded_at else None
        })

    return response


@router.post("/records", response_model=PersonalRecordResponse)
async def create_personal_record(
    record: PersonalRecordCreate,
    db: Session = Depends(get_db),
    user_id: int = 1,
):
    """
    Create or update a personal record.

    If a better time is submitted, the old record is marked as superseded.
    """
    # Check if there's an existing current record for this distance
    existing_record = db.query(PersonalRecord).filter(
        PersonalRecord.user_id == user_id,
        PersonalRecord.distance == record.distance,
        PersonalRecord.is_current == 1
    ).first()

    # If exists and new time is worse, don't update
    if existing_record and record.time_seconds >= existing_record.time_seconds:
        raise HTTPException(
            status_code=400,
            detail=f"Le temps saisi ({format_time(record.time_seconds)}) n'est pas meilleur que le record actuel ({format_time(existing_record.time_seconds)})"
        )

    # If exists and new time is better, mark old as superseded
    if existing_record:
        existing_record.is_current = 0
        existing_record.superseded_at = datetime.utcnow()
        db.commit()
        logger.info(f"Superseded old record for {record.distance}: {format_time(existing_record.time_seconds)} -> {format_time(record.time_seconds)}")

    # Create new record
    new_record = PersonalRecord(
        user_id=user_id,
        distance=record.distance,
        time_seconds=record.time_seconds,
        date_achieved=record.date_achieved,
        is_current=1,
        notes=record.notes
    )

    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    logger.info(f"Created new personal record for {record.distance}: {format_time(record.time_seconds)}")

    return PersonalRecordResponse(
        id=new_record.id,
        distance=new_record.distance,
        time_seconds=new_record.time_seconds,
        time_display=format_time(new_record.time_seconds),
        date_achieved=new_record.date_achieved,
        is_current=True,
        notes=new_record.notes,
        created_at=new_record.created_at,
        superseded_at=None
    )


@router.put("/records/{record_id}")
async def update_personal_record(
    record_id: int,
    time_seconds: int,
    date_achieved: datetime,
    notes: str = None,
    db: Session = Depends(get_db),
    user_id: int = 1,
):
    """Update an existing personal record (time, date, or notes)."""
    record = db.query(PersonalRecord).filter(
        PersonalRecord.id == record_id,
        PersonalRecord.user_id == user_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    record.time_seconds = time_seconds
    record.date_achieved = date_achieved
    if notes is not None:
        record.notes = notes

    db.commit()
    db.refresh(record)

    return PersonalRecordResponse(
        id=record.id,
        distance=record.distance,
        time_seconds=record.time_seconds,
        time_display=format_time(record.time_seconds),
        date_achieved=record.date_achieved,
        is_current=bool(record.is_current),
        notes=record.notes,
        created_at=record.created_at,
        superseded_at=record.superseded_at
    )


@router.delete("/records/{record_id}")
async def delete_personal_record(
    record_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1,
):
    """Delete a personal record."""
    record = db.query(PersonalRecord).filter(
        PersonalRecord.id == record_id,
        PersonalRecord.user_id == user_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    db.delete(record)
    db.commit()

    logger.info(f"Deleted personal record: {record.distance} - {format_time(record.time_seconds)}")

    return {"message": "Record deleted successfully", "id": record_id}
