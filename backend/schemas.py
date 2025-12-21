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

    # Profile fields
    age: Optional[int] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    level: Optional[str] = None
    fcmax: Optional[int] = None
    vma: Optional[float] = None
    ai_mode: Optional[str] = None
    profile_picture: Optional[str] = None

    # Legacy fields
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
    notes: Optional[str] = None


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
    notes: Optional[str] = None
    weather: Optional[Dict[str, Any]] = None
    raw_data: Optional[Dict[str, Any]] = None  # Contains GPX splits and detailed metrics
    is_test: bool = False
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
    workout_type: Optional[str] = None  # "easy", "threshold", "interval", "long", "recovery", or None for auto
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
    scheduled_date: Optional[datetime] = None
    calendar_event_id: Optional[str] = None

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
    time_seconds: float  # Accept float for precise Strava times
    time_display: str  # Formatted as MM:SS
    date_achieved: datetime
    is_current: bool
    notes: Optional[str]
    created_at: Optional[datetime] = None
    superseded_at: Optional[datetime] = None

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


# Training Zone schemas
class TrainingZoneResponse(BaseModel):
    id: int
    user_id: int
    vdot: float
    source_distance: Optional[str]
    source_time_seconds: Optional[int]
    easy_min_pace_sec: int
    easy_max_pace_sec: int
    marathon_pace_sec: int
    threshold_min_pace_sec: int
    threshold_max_pace_sec: int
    interval_min_pace_sec: int
    interval_max_pace_sec: int
    repetition_min_pace_sec: int
    repetition_max_pace_sec: int
    is_current: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Training Block schemas
class GenerateBlockRequest(BaseModel):
    phase: str = "base"  # base, development, peak
    days_per_week: int = 3
    start_date: Optional[datetime] = None
    use_ai_descriptions: bool = True  # Use AI to generate personalized workout descriptions
    use_sonnet: bool = True  # Use Sonnet for superior personalized coaching (~€0.10 per block)
    add_recovery_sunday: bool = False  # Add a recovery run every Sunday


class PlannedWorkoutResponse(BaseModel):
    id: int
    block_id: int
    scheduled_date: datetime
    week_number: int
    day_of_week: str
    workout_type: str
    distance_km: Optional[float]
    title: str
    description: Optional[str] = None
    target_pace_min: Optional[int]
    target_pace_max: Optional[int]
    status: str
    completed_workout_id: Optional[int]
    completed_at: Optional[datetime]
    calendar_event_id: Optional[str] = None

    class Config:
        from_attributes = True


class StrengtheningReminderResponse(BaseModel):
    id: int
    scheduled_date: datetime
    day_of_week: str
    session_type: str
    title: str
    duration_minutes: int
    completed: bool
    completed_at: Optional[datetime]
    calendar_event_id: Optional[str] = None

    class Config:
        from_attributes = True


class TrainingBlockResponse(BaseModel):
    id: int
    user_id: int
    name: str
    phase: str
    start_date: datetime
    end_date: datetime
    days_per_week: int
    target_weekly_volume: float
    easy_percentage: int
    threshold_percentage: int
    interval_percentage: int
    status: str
    created_at: datetime
    planned_workouts: List[PlannedWorkoutResponse] = []
    strengthening_reminders: List[StrengtheningReminderResponse] = []

    class Config:
        from_attributes = True


class TrainingBlockListResponse(BaseModel):
    id: int
    user_id: int
    name: str
    phase: str
    start_date: datetime
    end_date: datetime
    days_per_week: int
    status: str
    progress_percentage: float = 0.0

    class Config:
        from_attributes = True


# Workout Feedback schemas
class WorkoutFeedbackCreate(BaseModel):
    completed_workout_id: int
    planned_workout_id: Optional[int] = None
    rpe: Optional[int] = Field(None, ge=1, le=10)
    difficulty: Optional[str] = None  # too_easy, just_right, too_hard
    pain_locations: Optional[List[str]] = None  # ["ankle", "it_band", "none"]
    pain_severity: Optional[int] = Field(None, ge=1, le=10)
    comment: Optional[str] = None


class WorkoutFeedbackResponse(BaseModel):
    id: int
    user_id: int
    completed_workout_id: int
    planned_workout_id: Optional[int]
    rpe: Optional[int]
    difficulty: Optional[str]
    pain_locations: Optional[List[str]]
    pain_severity: Optional[int]
    comment: Optional[str]
    planned_pace_min: Optional[int]
    actual_pace: Optional[int]
    pace_variance: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


# Chat Adjustment schemas
class CreateConversationRequest(BaseModel):
    block_id: int
    scope_mode: str = "block_start"  # "block_start" or "rolling_4weeks"


class SendMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class ChatMessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    is_cached: bool
    cache_creation_tokens: int
    cache_read_tokens: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChatConversationResponse(BaseModel):
    id: int
    user_id: int
    block_id: int
    scope_mode: str
    scope_start_date: datetime
    scope_end_date: datetime
    state: str
    proposed_changes: Optional[Dict[str, Any]]
    total_tokens: int
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[ChatMessageResponse]] = None

    class Config:
        from_attributes = True


class WorkoutAdjustment(BaseModel):
    workout_id: Optional[int] = None  # None for create actions
    action: str  # "modify", "delete", "reschedule", "create"
    current: Optional[Dict[str, Any]] = None  # None for create actions
    proposed: Optional[Dict[str, Any]] = None  # None for delete actions
    reasoning: str


class ProposalResponse(BaseModel):
    analysis: str
    adjustments: List[WorkoutAdjustment]
    tokens_used: int


class ValidateResponse(BaseModel):
    applied_count: int
    modified_workout_ids: List[int]
    conversation_id: int


class MessageSendResponse(BaseModel):
    message_id: int
    content: str
    tokens_used: int
    is_cached: bool
    message_count: int
    approaching_limit: bool
    max_messages: int


# Race Objective schemas
class RaceObjectiveBase(BaseModel):
    name: str
    race_date: datetime
    distance: str  # "5km", "10km", "semi", "marathon"
    target_time_seconds: Optional[int] = None
    location: Optional[str] = None


class RaceObjectiveCreate(RaceObjectiveBase):
    pass  # user_id is injected by the backend endpoint


class RaceObjectiveUpdate(BaseModel):
    name: Optional[str] = None
    race_date: Optional[datetime] = None
    distance: Optional[str] = None
    target_time_seconds: Optional[int] = None
    location: Optional[str] = None
    status: Optional[str] = None


class RaceObjectiveResponse(RaceObjectiveBase):
    id: int
    user_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Injury History schemas
class InjuryHistoryBase(BaseModel):
    injury_type: str
    location: str  # "ankle", "knee", "it_band", "tfl", "calf", "achilles", "plantar", "shin"
    side: Optional[str] = None  # "left", "right", "both"
    severity: str  # "minor", "moderate", "severe"
    occurred_at: datetime
    resolved_at: Optional[datetime] = None
    recurrence_count: int = 0  # Changed from is_recurring to recurrence_count
    description: Optional[str] = None
    status: str = "resolved"  # "active", "monitoring", "resolved"
    strengthening_focus: Optional[List[str]] = None  # ["tfl_hanche", "mollet_cheville"]


class InjuryHistoryCreate(InjuryHistoryBase):
    pass  # user_id is injected by backend


class InjuryHistoryUpdate(BaseModel):
    injury_type: Optional[str] = None
    location: Optional[str] = None
    side: Optional[str] = None
    severity: Optional[str] = None
    resolved_at: Optional[datetime] = None
    recurrence_count: Optional[int] = None  # Changed from is_recurring
    description: Optional[str] = None
    status: Optional[str] = None
    strengthening_focus: Optional[List[str]] = None


class InjuryHistoryResponse(InjuryHistoryBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Planning schemas (for unified planning endpoint)
class GeneratePlanningRequest(BaseModel):
    mode: str  # "simple" or "race"
    race_objective_id: Optional[int] = None
    start_date: datetime
    days_per_week: int = Field(..., ge=3, le=6)
    phase: Optional[str] = "base"  # For simple mode: "base", "development", "peak"


class PeriodizationSummary(BaseModel):
    total_weeks: int
    base_weeks: int = 0
    development_weeks: int = 0
    peak_weeks: int = 0
    taper_weeks: int = 1


class GeneratePlanningResponse(BaseModel):
    race_objective: Optional[RaceObjectiveResponse] = None
    blocks: List[TrainingBlockResponse]
    periodization_summary: PeriodizationSummary
