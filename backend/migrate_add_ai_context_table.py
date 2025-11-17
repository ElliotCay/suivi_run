"""
Migration script to add ai_context table for maintaining AI conversation continuity.
"""

from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker
from models import Base, AIContext
from config import DATABASE_URL
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    """Create ai_context table if it doesn't exist."""
    engine = create_engine(DATABASE_URL)

    # Check if table exists
    from sqlalchemy import inspect
    inspector = inspect(engine)

    if 'ai_context' in inspector.get_table_names():
        logger.info("ai_context table already exists, skipping creation")
        return

    # Create the table
    AIContext.__table__.create(bind=engine, checkfirst=True)
    logger.info("Created ai_context table successfully")

    # Create initial context for user_id=1
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Check if context already exists for user 1
        existing = session.query(AIContext).filter(AIContext.user_id == 1).first()
        if not existing:
            initial_context = AIContext(
                user_id=1,
                current_phase="base",
                total_ai_calls=0
            )
            session.add(initial_context)
            session.commit()
            logger.info("Created initial AI context for user 1")
        else:
            logger.info("AI context for user 1 already exists")
    except Exception as e:
        logger.error(f"Error creating initial context: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    migrate()
