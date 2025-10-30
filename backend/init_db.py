"""
Database initialization script.

Creates all tables and seeds initial data.
"""

from database import Base, engine, SessionLocal
from models import User, Workout, StrengthSession, Suggestion, TrainingPlan, TrainingWeek, TrainingSession, PersonalRecord, UserPreferences
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_database():
    """Initialize database tables and seed initial data."""
    logger.info("Creating database tables...")

    # Create all tables
    Base.metadata.create_all(bind=engine)

    logger.info("Database tables created successfully")

    # Check if default user exists
    db = SessionLocal()
    try:
        existing_user = db.query(User).filter(User.email == "elliot@running.app").first()

        if not existing_user:
            logger.info("Creating default user...")
            default_user = User(
                name="Elliot",
                email="elliot@running.app",
                injury_history=[
                    {
                        "type": "Syndrome de l'essuie-glace (IT band)",
                        "date": "2025-09",
                        "status": "Sorti de blessure - Meilleur ressenti jamais eu"
                    }
                ],
                current_level={
                    "long_run": "10km confortables",
                    "easy_pace": "6:00/km",
                    "tempo_pace": "5:20-5:40/km",
                    "interval": "20x (15\" sprint / 15\" récup)"
                },
                objectives=[
                    {
                        "date": "2026-03",
                        "event": "Semi-marathon",
                        "priority": "primary"
                    },
                    {
                        "date": "2026-06",
                        "event": "Course 15-20km ou 2ème semi",
                        "priority": "secondary"
                    }
                ],
                weekly_volume=23.0,  # km/semaine
                preferences={
                    "runs_per_week": 3,
                    "strength_per_week": 2,
                    "rest_between_runs": True,
                    "variety": "high"
                },
                equipment={
                    "shoes": "Nike Vomero Plus",
                    "watch": "Apple Watch Ultra 2",
                    "earbuds": "AirPods Pro 3"
                }
            )
            db.add(default_user)
            db.commit()
            logger.info("Default user created successfully")
        else:
            logger.info("Default user already exists")

    except Exception as e:
        logger.error(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

    logger.info("Database initialization complete")


if __name__ == "__main__":
    init_database()
