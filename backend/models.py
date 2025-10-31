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
    user_rating = Column(Integer, nullable=True)  # User rating 1-5
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


class StravaToken(Base):
    """Strava OAuth token storage for API access."""

    __tablename__ = "strava_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=False)
    expires_at = Column(Integer, nullable=False)  # Unix timestamp
    athlete_id = Column(Integer, nullable=True)  # Strava athlete ID
    last_sync = Column(DateTime, nullable=True)  # Last time we synced activities
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
