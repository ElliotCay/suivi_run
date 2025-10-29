"""
SQLAlchemy database models for the running tracking application.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text
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
    preferences = Column(JSON, nullable=True)
    equipment = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    workouts = relationship("Workout", back_populates="user")
    strength_sessions = relationship("StrengthSession", back_populates="user")
    suggestions = relationship("Suggestion", back_populates="user")
    training_plans = relationship("TrainingPlan", back_populates="user")


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
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    weeks = Column(JSON, nullable=True)  # Weekly structure with workouts
    target_event = Column(String, nullable=True)  # e.g., 10K, Half Marathon, Marathon
    status = Column(String, default="active")  # active, completed, paused
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="training_plans")


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
