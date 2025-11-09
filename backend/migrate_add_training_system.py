"""
Migration script to add training system tables:
- training_zones
- training_blocks
- planned_workouts
- workout_feedback
- strengthening_reminders
"""

from database import engine, Base
from models import (
    TrainingZone,
    TrainingBlock,
    PlannedWorkout,
    WorkoutFeedback,
    StrengtheningReminder
)

def migrate():
    """Create new tables for training system."""
    print("Creating training system tables...")

    # Create all tables (only creates tables that don't exist)
    Base.metadata.create_all(bind=engine)

    print("✅ Migration completed successfully!")
    print("\nNew tables created:")
    print("  - training_zones")
    print("  - training_blocks")
    print("  - planned_workouts")
    print("  - workout_feedback")
    print("  - strengthening_reminders")

if __name__ == "__main__":
    migrate()
