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


# Training Session schemas
class TrainingSessionBase(BaseModel):
    day_of_week: str
    session_order: int
    session_type: str
    description: Optional[str] = None
    distance: Optional[float] = None
    pace_target: Optional[str] = None
    structure: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "scheduled"
    scheduled_date: Optional[datetime] = None


class TrainingSessionCreate(TrainingSessionBase):
    week_id: int


class TrainingSessionUpdate(BaseModel):
    status: Optional[str] = None
    completed_workout_id: Optional[int] = None


class TrainingSessionResponse(TrainingSessionBase):
    id: int
    week_id: int
    completed_workout_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Training Week schemas
class TrainingWeekBase(BaseModel):
    week_number: int
    phase: str
    description: Optional[str] = None
    status: Optional[str] = "pending"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class TrainingWeekCreate(TrainingWeekBase):
    plan_id: int
    sessions: Optional[List[TrainingSessionBase]] = None


class TrainingWeekUpdate(BaseModel):
    status: Optional[str] = None
    description: Optional[str] = None


class TrainingWeekResponse(TrainingWeekBase):
    id: int
    plan_id: int
    sessions: List[TrainingSessionResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


# Training Plan schemas
class TrainingPlanBase(BaseModel):
    name: str
    goal_type: str  # 5km, 10km, semi, marathon
    target_date: Optional[datetime] = None
    current_level: Optional[str] = None  # beginner, intermediate, advanced
    weeks_count: int = 8
    start_date: datetime
    end_date: datetime
    status: Optional[str] = "active"


class TrainingPlanCreate(BaseModel):
    name: str
    goal_type: str
    target_date: Optional[datetime] = None
    current_level: Optional[str] = None
    weeks_count: int = 8
    use_sonnet: bool = True


class TrainingPlanUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    target_date: Optional[datetime] = None


class TrainingPlanResponse(TrainingPlanBase):
    id: int
    user_id: int
    weeks: List[TrainingWeekResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TrainingPlanListResponse(BaseModel):
    id: int
    user_id: int
    name: str
    goal_type: str
    target_date: Optional[datetime] = None
    weeks_count: int
    start_date: datetime
    end_date: datetime
    status: str
    progress_percentage: float = 0.0
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


# User Preferences schemas
class UserPreferencesBase(BaseModel):
    preferred_days: Optional[List[str]] = None  # ["monday", "wednesday", "friday"]
    preferred_time: Optional[str] = None  # "18:00"
    calendar_sync_enabled: Optional[bool] = False
    reminder_minutes: Optional[List[int]] = None  # [15, 60, 1440]


class UserPreferencesCreate(UserPreferencesBase):
    user_id: int


class UserPreferencesUpdate(UserPreferencesBase):
    pass


class UserPreferencesResponse(UserPreferencesBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
