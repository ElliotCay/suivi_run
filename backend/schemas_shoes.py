"""
Pydantic schemas for shoes management.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ShoeBase(BaseModel):
    """Base shoe schema with common fields."""
    brand: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=100)
    type: Optional[str] = Field(None, description="training, competition, trail, recovery")
    purchase_date: Optional[datetime] = None
    initial_km: float = Field(0.0, ge=0)
    max_km: float = Field(800.0, ge=100, le=2000)
    is_active: bool = True
    is_default: bool = False
    description: Optional[str] = Field(None, description="AI-readable description for suggestions")


class ShoeCreate(ShoeBase):
    """Schema for creating a new shoe."""
    pass


class ShoeUpdate(BaseModel):
    """Schema for updating a shoe (all fields optional)."""
    brand: Optional[str] = Field(None, min_length=1, max_length=100)
    model: Optional[str] = Field(None, min_length=1, max_length=100)
    type: Optional[str] = None
    purchase_date: Optional[datetime] = None
    initial_km: Optional[float] = Field(None, ge=0)
    current_km: Optional[float] = Field(None, ge=0)
    max_km: Optional[float] = Field(None, ge=100, le=2000)
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    description: Optional[str] = None


class ShoeResponse(ShoeBase):
    """Schema for shoe response with computed fields."""
    id: int
    user_id: int
    current_km: float = Field(description="Km run since purchase")
    total_km: float = Field(description="initial_km + current_km (total km on shoe)")
    wear_percentage: float = Field(description="Percentage of wear (0-100)")
    km_remaining: float = Field(description="Kilometers remaining before max")
    alert_level: Optional[str] = Field(None, description="none, warning (75%), danger (90%), critical (100%)")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ShoeStats(BaseModel):
    """Statistics for a shoe."""
    total_workouts: int = 0
    avg_km_per_workout: float = 0.0
    estimated_days_remaining: Optional[int] = None
    last_used: Optional[datetime] = None
