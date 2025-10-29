"""
Pydantic schemas for request/response validation.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# Health Check
class HealthCheckResponse(BaseModel):
    status: str


# User/Profile schemas
class UserBase(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    injury_history: Optional[List[Dict[str, Any]]] = None
    current_level: Optional[Dict[str, Any]] = None
    objectives: Optional[List[Dict[str, Any]]] = None
    weekly_volume: Optional[float] = None
    preferences: Optional[Dict[str, Any]] = None
    equipment: Optional[Dict[str, Any]] = None


class UserUpdate(UserBase):
    pass


class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Workout schemas
class WorkoutBase(BaseModel):
    date: Optional[datetime] = None
    workout_type: Optional[str] = None
    user_rating: Optional[int] = Field(None, ge=1, le=5)
    user_comment: Optional[str] = None


class WorkoutUpdate(WorkoutBase):
    pass


class WorkoutResponse(BaseModel):
    id: int
    user_id: int
    date: datetime
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    distance: Optional[float] = None
    duration: Optional[int] = None  # seconds
    avg_pace: Optional[float] = None  # seconds per km
    avg_hr: Optional[int] = None
    max_hr: Optional[int] = None
    elevation_gain: Optional[float] = None
    workout_type: Optional[str] = None
    source: Optional[str] = None
    user_rating: Optional[int] = None
    user_comment: Optional[str] = None
    weather: Optional[Dict[str, Any]] = None
    raw_data: Optional[Dict[str, Any]] = None  # Contains GPX splits and detailed metrics
    created_at: datetime

    class Config:
        from_attributes = True


# Strength Session schemas
class StrengthSessionBase(BaseModel):
    date: datetime
    duration: Optional[int] = None  # minutes
    exercises: Optional[List[Dict[str, Any]]] = None
    comment: Optional[str] = None


class StrengthSessionCreate(StrengthSessionBase):
    user_id: int


class StrengthSessionResponse(StrengthSessionBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Suggestion schemas
class SuggestionBase(BaseModel):
    workout_type: str
    distance: Optional[float] = None
    pace_target: Optional[float] = None
    structure: Optional[Dict[str, Any]] = None
    reasoning: Optional[str] = None


class SuggestionGenerateRequest(BaseModel):
    use_sonnet: bool = True
    workout_type: Optional[str] = None  # "facile", "tempo", "fractionne", "longue", or None for auto
    generate_week: bool = False  # If True, generates 3 workouts for a complete week


class SuggestionCreate(SuggestionBase):
    user_id: int
    model_used: Optional[str] = None
    tokens_used: Optional[int] = None


class SuggestionResponse(SuggestionBase):
    id: int
    user_id: int
    created_at: datetime
    model_used: Optional[str] = None
    tokens_used: Optional[int] = None
    completed: int
    completed_workout_id: Optional[int] = None

    class Config:
        from_attributes = True


# Training Plan schemas
class TrainingPlanBase(BaseModel):
    name: str
    start_date: datetime
    end_date: datetime
    weeks: Optional[List[Dict[str, Any]]] = None
    target_event: Optional[str] = None
    status: Optional[str] = "active"


class TrainingPlanCreate(TrainingPlanBase):
    user_id: int


class TrainingPlanUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    weeks: Optional[List[Dict[str, Any]]] = None


class TrainingPlanResponse(TrainingPlanBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Personal Records schemas
class PersonalRecordCreate(BaseModel):
    distance: str  # "500m", "1km", "2km", "5km", "10km", "15km", "semi", "marathon"
    time_seconds: int
    date_achieved: datetime
    notes: Optional[str] = None


class PersonalRecordResponse(BaseModel):
    id: int
    distance: str
    time_seconds: int
    time_display: str  # Formatted as MM:SS
    date_achieved: datetime
    is_current: bool
    notes: Optional[str]
    created_at: datetime
    superseded_at: Optional[datetime]

    class Config:
        from_attributes = True
