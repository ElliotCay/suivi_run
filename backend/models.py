"""
SQLAlchemy database models for the running tracking application.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text, Boolean
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    """User model for storing athlete information and preferences."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)

    # Profile fields
    age = Column(Integer, nullable=True)
    weight = Column(Float, nullable=True)
    height = Column(Float, nullable=True)
    level = Column(String, default='intermediate', nullable=True)
    fcmax = Column(Integer, nullable=True)
    vma = Column(Float, nullable=True)
    ai_mode = Column(String, default='integrated', nullable=True)
    profile_picture = Column(Text, nullable=True)  # Base64 encoded image

    # Legacy fields
    injury_history = Column(JSON, nullable=True)
    current_level = Column(JSON, nullable=True)
    objectives = Column(JSON, nullable=True)
    weekly_volume = Column(Float, nullable=True)
    equipment = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workouts = relationship("Workout", back_populates="user")
    strength_sessions = relationship("StrengthSession", back_populates="user")
    suggestions = relationship("Suggestion", back_populates="user")
    training_plans = relationship("TrainingPlan", back_populates="user")
    user_preferences = relationship("UserPreferences", back_populates="user", uselist=False)
    shoes = relationship("Shoe", back_populates="user")


class Workout(Base):
    """Workout model for storing running session data."""

    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    distance = Column(Float, nullable=True)
    duration = Column(Integer, nullable=True)  # Duration in seconds
    avg_pace = Column(Float, nullable=True)  # Pace in seconds per km
    avg_hr = Column(Integer, nullable=True)  # Average heart rate
    max_hr = Column(Integer, nullable=True)  # Maximum heart rate
    elevation_gain = Column(Float, nullable=True)  # Elevation in meters
    workout_type = Column(String, nullable=True)  # e.g., easy, tempo, interval
    source = Column(String, nullable=True)  # e.g., garmin, strava, manual
    raw_data = Column(JSON, nullable=True)  # Store raw imported data
    user_comment = Column(Text, nullable=True)
    weather = Column(JSON, nullable=True)  # Weather conditions
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="workouts")


class StrengthSession(Base):
    """Strength training session model."""

    __tablename__ = "strength_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    duration = Column(Integer, nullable=True)  # Duration in minutes
    exercises = Column(JSON, nullable=True)  # List of exercises with sets/reps
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="strength_sessions")


class Shoe(Base):
    """Shoe tracking model for rotation and wear tracking."""

    __tablename__ = "shoes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    brand = Column(String, nullable=False)
    model = Column(String, nullable=False)
    type = Column(String, nullable=True)  # training, competition, trail, recovery
    purchase_date = Column(DateTime, nullable=True)
    initial_km = Column(Float, default=0.0)  # If bought used
    current_km = Column(Float, default=0.0)
    max_km = Column(Float, default=800.0)  # Default lifespan
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # Default shoe for workouts
    description = Column(Text, nullable=True)  # AI-readable description for suggestions
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="shoes")


class Suggestion(Base):
    """AI-generated workout suggestion model."""

    __tablename__ = "suggestions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    workout_type = Column(String, nullable=False)  # e.g., easy, tempo, interval
    distance = Column(Float, nullable=True)
    pace_target = Column(Float, nullable=True)  # Target pace in seconds per km
    structure = Column(JSON, nullable=True)  # Detailed workout structure
    reasoning = Column(Text, nullable=True)  # AI explanation for the suggestion
    model_used = Column(String, nullable=True)  # AI model identifier
    tokens_used = Column(Integer, nullable=True)  # Token count for the request
    completed = Column(Integer, default=0)  # Boolean: 0=not completed, 1=completed
    completed_workout_id = Column(
        Integer, ForeignKey("workouts.id"), nullable=True
    )  # Link to actual workout
    scheduled_date = Column(DateTime, nullable=True)  # Planned date and time for the workout
    calendar_event_id = Column(String, nullable=True)  # ID of the calendar event if synced

    # Relationships
    user = relationship("User", back_populates="suggestions")


class TrainingPlan(Base):
    """Training plan model for multi-week structured training programs."""

    __tablename__ = "training_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    goal_type = Column(String, nullable=False)  # 5km, 10km, semi, marathon
    target_date = Column(DateTime, nullable=True)
    current_level = Column(String, nullable=True)  # beginner, intermediate, advanced
    weeks_count = Column(Integer, nullable=False, default=8)  # 8-12 weeks
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    status = Column(String, default="active")  # active, completed, paused, abandoned
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="training_plans")
    weeks = relationship("TrainingWeek", back_populates="plan", cascade="all, delete-orphan")


class TrainingWeek(Base):
    """Training week model - each week in a training plan."""

    __tablename__ = "training_weeks"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("training_plans.id"), nullable=False)
    week_number = Column(Integer, nullable=False)  # 1-12
    phase = Column(String, nullable=False)  # base, build, peak, taper
    description = Column(Text, nullable=True)  # Week objective
    status = Column(String, default="pending")  # pending, in_progress, completed
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    plan = relationship("TrainingPlan", back_populates="weeks")
    sessions = relationship("TrainingSession", back_populates="week", cascade="all, delete-orphan")


class TrainingSession(Base):
    """Individual training session within a week."""

    __tablename__ = "training_sessions"

    id = Column(Integer, primary_key=True, index=True)
    week_id = Column(Integer, ForeignKey("training_weeks.id"), nullable=False)
    day_of_week = Column(String, nullable=False)  # Lundi, Mardi, etc.
    session_order = Column(Integer, nullable=False)  # 1, 2, 3 for ordering
    session_type = Column(String, nullable=False)  # VMA, Tempo, Endurance, Sortie Longue
    description = Column(Text, nullable=True)  # Description courte
    distance = Column(Float, nullable=True)
    pace_target = Column(String, nullable=True)  # "6:00/km" or "5:30-5:40/km"
    structure = Column(Text, nullable=True)  # Echauffement, corps, retour au calme
    notes = Column(Text, nullable=True)  # Notes additionnelles
    status = Column(String, default="scheduled")  # scheduled, completed, missed
    scheduled_date = Column(DateTime, nullable=True)  # Date planifiée
    completed_workout_id = Column(Integer, ForeignKey("workouts.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    week = relationship("TrainingWeek", back_populates="sessions")
    completed_workout = relationship("Workout", foreign_keys=[completed_workout_id])


class PersonalRecord(Base):
    """Personal record model for tracking best times at different distances."""

    __tablename__ = "personal_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    distance = Column(String, nullable=False)  # e.g., "500m", "1km", "5km", "10km", "semi", "marathon"
    time_seconds = Column(Integer, nullable=False)  # Time in seconds
    date_achieved = Column(DateTime, nullable=False)  # When the record was set
    is_current = Column(Integer, default=1)  # 1 if current record, 0 if superseded
    notes = Column(Text, nullable=True)  # Optional notes about the record
    created_at = Column(DateTime, default=datetime.utcnow)
    superseded_at = Column(DateTime, nullable=True)  # When this record was beaten

    # Relationships
    user = relationship("User")


class UserPreferences(Base):
    """User preferences model for calendar sync and workout scheduling."""

    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    preferred_days = Column(JSON, nullable=True)  # e.g., ["tuesday", "thursday", "saturday"]
    preferred_time = Column(String, nullable=True)  # e.g., "18:00"
    calendar_sync_enabled = Column(Boolean, default=False)
    reminder_minutes = Column(JSON, nullable=True)  # e.g., [15, 60, 1440] for 15min, 1h, 1 day
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="user_preferences")


class StravaConnection(Base):
    """Strava OAuth connection and token storage."""

    __tablename__ = "strava_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    strava_athlete_id = Column(Integer, nullable=False, unique=True)
    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=False)
    expires_at = Column(Integer, nullable=False)  # Unix timestamp
    scope = Column(String, nullable=True)  # Granted OAuth scopes
    athlete_data = Column(JSON, nullable=True)  # Strava athlete profile
    last_sync = Column(DateTime, nullable=True)  # Last activity sync
    auto_sync_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")


class TrainingZone(Base):
    """Training zones calculated from VDOT for personalized pacing."""

    __tablename__ = "training_zones"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    vdot = Column(Float, nullable=False)  # Calculated VDOT value
    source_distance = Column(String, nullable=True)  # e.g., "5km", "10km" - which PR was used
    source_time_seconds = Column(Integer, nullable=True)  # Time of the PR used

    # Easy zone (endurance fondamentale)
    easy_min_pace_sec = Column(Integer, nullable=False)
    easy_max_pace_sec = Column(Integer, nullable=False)

    # Marathon zone
    marathon_pace_sec = Column(Integer, nullable=False)

    # Threshold zone (seuil lactique, tempo)
    threshold_min_pace_sec = Column(Integer, nullable=False)
    threshold_max_pace_sec = Column(Integer, nullable=False)

    # Interval zone (VO2max, 5K pace)
    interval_min_pace_sec = Column(Integer, nullable=False)
    interval_max_pace_sec = Column(Integer, nullable=False)

    # Repetition zone (speed work)
    repetition_min_pace_sec = Column(Integer, nullable=False)
    repetition_max_pace_sec = Column(Integer, nullable=False)

    is_current = Column(Boolean, default=True)  # Only one current zone per user
    created_at = Column(DateTime, default=datetime.utcnow)
    superseded_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User")


class TrainingBlock(Base):
    """4-week training block with periodization."""

    __tablename__ = "training_blocks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)  # e.g., "Block 1: Base Building"
    phase = Column(String, nullable=False)  # base, development, peak, taper
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)

    # Block configuration
    days_per_week = Column(Integer, nullable=False)  # 3, 4, 5, or 6
    target_weekly_volume = Column(Float, nullable=False)  # Target km per week

    # Periodization ratios (percentage of volume at each intensity)
    easy_percentage = Column(Integer, nullable=False)  # e.g., 70 for base phase
    threshold_percentage = Column(Integer, nullable=False)  # e.g., 20 for base phase
    interval_percentage = Column(Integer, nullable=False)  # e.g., 10 for base phase

    status = Column(String, default="active")  # active, completed, abandoned
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
    planned_workouts = relationship("PlannedWorkout", back_populates="block", cascade="all, delete-orphan")
    strengthening_reminders = relationship("StrengtheningReminder", back_populates="block", cascade="all, delete-orphan")


class PlannedWorkout(Base):
    """Individual planned workout within a training block."""

    __tablename__ = "planned_workouts"

    id = Column(Integer, primary_key=True, index=True)
    block_id = Column(Integer, ForeignKey("training_blocks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Scheduling
    scheduled_date = Column(DateTime, nullable=False)
    week_number = Column(Integer, nullable=False)  # 1-4 within the block
    day_of_week = Column(String, nullable=False)  # "Lundi", "Mardi", etc.

    # Workout details
    workout_type = Column(String, nullable=False)  # easy, threshold, interval, long, recovery, strengthening
    distance_km = Column(Float, nullable=True)  # For running workouts
    duration_minutes = Column(Integer, nullable=True)  # For time-based workouts

    # Detailed structure with paces
    title = Column(String, nullable=False)  # e.g., "Sortie longue 90 min"
    description = Column(Text, nullable=False)  # Full workout description with paces
    structure = Column(JSON, nullable=True)  # Detailed intervals/structure

    # Target paces (in seconds per km)
    target_pace_min = Column(Integer, nullable=True)
    target_pace_max = Column(Integer, nullable=True)

    # Completion tracking
    status = Column(String, default="scheduled")  # scheduled, completed, skipped, rescheduled
    completed_workout_id = Column(Integer, ForeignKey("workouts.id"), nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Calendar integration
    calendar_event_id = Column(String, nullable=True)  # iCloud Calendar event UID

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    block = relationship("TrainingBlock", back_populates="planned_workouts")
    user = relationship("User")
    completed_workout = relationship("Workout", foreign_keys=[completed_workout_id])
    feedback = relationship("WorkoutFeedback", back_populates="planned_workout", uselist=False)


class WorkoutFeedback(Base):
    """Feedback captured after completing a workout."""

    __tablename__ = "workout_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    planned_workout_id = Column(Integer, ForeignKey("planned_workouts.id"), nullable=True)
    completed_workout_id = Column(Integer, ForeignKey("workouts.id"), nullable=False)

    # Feedback data
    rpe = Column(Integer, nullable=True)  # Rate of Perceived Exertion (1-10) from Apple Watch
    difficulty = Column(String, nullable=True)  # "too_easy", "just_right", "too_hard"
    pain_locations = Column(JSON, nullable=True)  # ["ankle", "it_band", "none"]
    pain_severity = Column(Integer, nullable=True)  # 1-10 if pain reported
    comment = Column(Text, nullable=True)  # Free-form comment

    # Performance vs plan
    planned_pace_min = Column(Integer, nullable=True)  # What was planned (sec/km)
    actual_pace = Column(Integer, nullable=True)  # What was achieved (sec/km)
    pace_variance = Column(Float, nullable=True)  # Percentage difference

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    planned_workout = relationship("PlannedWorkout", back_populates="feedback")
    completed_workout = relationship("Workout")


class StrengtheningReminder(Base):
    """Scheduled reminders for strengthening and proprioception sessions."""

    __tablename__ = "strengthening_reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    block_id = Column(Integer, ForeignKey("training_blocks.id"), nullable=True)

    # Scheduling
    scheduled_date = Column(DateTime, nullable=False)
    day_of_week = Column(String, nullable=False)

    # Session type
    session_type = Column(String, nullable=False)  # "tfl_hanche" or "mollet_cheville"
    title = Column(String, nullable=False)  # e.g., "Renforcement TFL/Hanche"
    duration_minutes = Column(Integer, default=15)

    # Completion
    completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    # Calendar integration
    calendar_event_id = Column(String, nullable=True)  # iCloud Calendar event UID

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    block = relationship("TrainingBlock", back_populates="strengthening_reminders")


class AIContext(Base):
    """AI context storage for maintaining conversation continuity and coherence."""
    __tablename__ = "ai_context"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    # Last recommendations and current training phase
    last_recommendation = Column(Text, nullable=True)
    current_phase = Column(String, nullable=True)  # "base", "build", "peak", "taper", "recovery"
    current_goal = Column(String, nullable=True)

    # Metrics snapshot
    readiness_score = Column(Integer, nullable=True)
    fatigue_level = Column(String, nullable=True)
    training_load_ratio = Column(Float, nullable=True)
    weekly_volume_km = Column(Float, nullable=True)

    # Recent context
    last_hard_session_date = Column(DateTime, nullable=True)
    last_long_run_date = Column(DateTime, nullable=True)
    recent_injury_concern = Column(String, nullable=True)

    # AI interaction metadata
    last_ai_call = Column(DateTime, nullable=True)
    total_ai_calls = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")


class UserBadge(Base):
    """User badges model for gamification and achievements."""

    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    badge_type = Column(String, nullable=False)  # "volume", "record", "regularity", "progression"
    badge_key = Column(String, nullable=False)  # "first_50km", "record_5k", "10_sessions_month", etc.
    badge_name = Column(String, nullable=False)  # "Premier 50km", "Nouveau record 5km", etc.
    badge_icon = Column(String, nullable=True)  # Emoji or SVG path
    badge_description = Column(Text, nullable=True)  # Additional details about achievement
    metric_value = Column(Float, nullable=True)  # The value that earned the badge (e.g., 152.5 for 150km badge)
    unlocked_at = Column(DateTime, default=datetime.utcnow)
    is_viewed = Column(Boolean, default=False)  # Whether user has seen the toast notification

    # Relationships
    user = relationship("User")


class WeeklyRecap(Base):
    """Weekly recap model for storing AI-generated weekly summaries."""

    __tablename__ = "weekly_recaps"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Week identification
    week_start_date = Column(DateTime, nullable=False)  # Monday of the week
    week_end_date = Column(DateTime, nullable=False)    # Sunday of the week

    # Generated content
    recap_text = Column(Text, nullable=False)  # AI-generated narrative

    # Metrics snapshot for the week
    sessions_completed = Column(Integer, nullable=True)
    sessions_planned = Column(Integer, nullable=True)
    total_volume_km = Column(Float, nullable=True)
    avg_pace_seconds = Column(Integer, nullable=True)  # Average pace in seconds per km
    avg_heart_rate = Column(Integer, nullable=True)
    readiness_avg = Column(Integer, nullable=True)

    # Metadata
    generated_at = Column(DateTime, default=datetime.utcnow)
    is_viewed = Column(Boolean, default=False)

    # Relationships
    user = relationship("User")
