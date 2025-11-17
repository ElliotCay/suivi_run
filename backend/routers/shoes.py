"""
Shoes router for managing running shoes tracking.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from database import get_db
from models import Shoe
from schemas_shoes import ShoeCreate, ShoeUpdate, ShoeResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


def calculate_shoe_metrics(shoe: Shoe) -> dict:
    """Calculate wear percentage, alert level, and remaining km."""
    # Total km = initial_km (km already on shoe when bought) + current_km (km since purchase)
    total_km = shoe.initial_km + shoe.current_km
    wear_percentage = (total_km / shoe.max_km) * 100 if shoe.max_km > 0 else 0
    km_remaining = max(0, shoe.max_km - total_km)

    # Determine alert level
    if wear_percentage >= 100:
        alert_level = "critical"
    elif wear_percentage >= 90:
        alert_level = "danger"
    elif wear_percentage >= 75:
        alert_level = "warning"
    else:
        alert_level = "none"

    return {
        "total_km": round(total_km, 1),
        "wear_percentage": round(wear_percentage, 1),
        "km_remaining": round(km_remaining, 1),
        "alert_level": alert_level
    }


@router.get("/shoes", response_model=List[ShoeResponse])
async def get_shoes(
    db: Session = Depends(get_db),
    user_id: int = 1,  # TODO: Get from auth
    active_only: bool = False
):
    """Get all shoes for a user."""
    query = db.query(Shoe).filter(Shoe.user_id == user_id)

    if active_only:
        query = query.filter(Shoe.is_active == True)

    shoes = query.order_by(Shoe.is_default.desc(), Shoe.current_km.asc()).all()

    # Add computed fields
    result = []
    for shoe in shoes:
        metrics = calculate_shoe_metrics(shoe)
        shoe_dict = {
            **shoe.__dict__,
            **metrics
        }
        result.append(shoe_dict)

    return result


@router.get("/shoes/{shoe_id}", response_model=ShoeResponse)
async def get_shoe(
    shoe_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1
):
    """Get a specific shoe."""
    shoe = db.query(Shoe).filter(
        Shoe.id == shoe_id,
        Shoe.user_id == user_id
    ).first()

    if not shoe:
        raise HTTPException(status_code=404, detail="Shoe not found")

    metrics = calculate_shoe_metrics(shoe)
    return {**shoe.__dict__, **metrics}


@router.post("/shoes", response_model=ShoeResponse)
async def create_shoe(
    shoe_data: ShoeCreate,
    db: Session = Depends(get_db),
    user_id: int = 1
):
    """Create a new shoe."""

    # If this is set as default, unset other defaults
    if shoe_data.is_default:
        db.query(Shoe).filter(
            Shoe.user_id == user_id,
            Shoe.is_default == True
        ).update({"is_default": False})

    # Create shoe with current_km = 0 (will be incremented with workouts)
    # Total km = initial_km + current_km
    new_shoe = Shoe(
        user_id=user_id,
        **shoe_data.dict()
    )

    db.add(new_shoe)
    db.commit()
    db.refresh(new_shoe)

    logger.info(f"Created shoe {new_shoe.brand} {new_shoe.model} for user {user_id}")

    metrics = calculate_shoe_metrics(new_shoe)
    return {**new_shoe.__dict__, **metrics}


@router.patch("/shoes/{shoe_id}", response_model=ShoeResponse)
async def update_shoe(
    shoe_id: int,
    shoe_update: ShoeUpdate,
    db: Session = Depends(get_db),
    user_id: int = 1
):
    """Update a shoe."""
    shoe = db.query(Shoe).filter(
        Shoe.id == shoe_id,
        Shoe.user_id == user_id
    ).first()

    if not shoe:
        raise HTTPException(status_code=404, detail="Shoe not found")

    # If setting as default, unset other defaults
    if shoe_update.is_default is True:
        db.query(Shoe).filter(
            Shoe.user_id == user_id,
            Shoe.is_default == True,
            Shoe.id != shoe_id
        ).update({"is_default": False})

    # Update fields
    update_data = shoe_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(shoe, field, value)

    shoe.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(shoe)

    logger.info(f"Updated shoe {shoe.id} for user {user_id}")

    metrics = calculate_shoe_metrics(shoe)
    return {**shoe.__dict__, **metrics}


@router.delete("/shoes/{shoe_id}")
async def delete_shoe(
    shoe_id: int,
    db: Session = Depends(get_db),
    user_id: int = 1
):
    """Delete (archive) a shoe."""
    shoe = db.query(Shoe).filter(
        Shoe.id == shoe_id,
        Shoe.user_id == user_id
    ).first()

    if not shoe:
        raise HTTPException(status_code=404, detail="Shoe not found")

    # Soft delete: mark as inactive
    shoe.is_active = False
    shoe.updated_at = datetime.utcnow()

    db.commit()

    logger.info(f"Archived shoe {shoe.id} for user {user_id}")

    return {"success": True, "message": "Shoe archived"}


@router.post("/shoes/{shoe_id}/add-km")
async def add_kilometers(
    shoe_id: int,
    km: float,
    db: Session = Depends(get_db),
    user_id: int = 1
):
    """Add kilometers to a shoe (used for manual adjustments or auto-tracking)."""
    shoe = db.query(Shoe).filter(
        Shoe.id == shoe_id,
        Shoe.user_id == user_id
    ).first()

    if not shoe:
        raise HTTPException(status_code=404, detail="Shoe not found")

    if km < 0:
        raise HTTPException(status_code=400, detail="Cannot add negative kilometers")

    shoe.current_km += km
    shoe.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(shoe)

    logger.info(f"Added {km} km to shoe {shoe.id}, now at {shoe.current_km} km")

    metrics = calculate_shoe_metrics(shoe)
    return {**shoe.__dict__, **metrics}


@router.get("/shoes/alerts/active")
async def get_active_alerts(
    db: Session = Depends(get_db),
    user_id: int = 1
):
    """Get active wear alerts for all shoes."""
    shoes = db.query(Shoe).filter(
        Shoe.user_id == user_id,
        Shoe.is_active == True
    ).all()

    alerts = []
    for shoe in shoes:
        metrics = calculate_shoe_metrics(shoe)
        if metrics["alert_level"] != "none":
            alerts.append({
                "shoe_id": shoe.id,
                "brand": shoe.brand,
                "model": shoe.model,
                "current_km": shoe.current_km,
                "max_km": shoe.max_km,
                "alert_level": metrics["alert_level"],
                "wear_percentage": metrics["wear_percentage"],
                "km_remaining": metrics["km_remaining"]
            })

    return {
        "count": len(alerts),
        "alerts": alerts
    }
