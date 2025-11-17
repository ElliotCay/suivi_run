"""
Migration script to add user_badges table.
"""

import sqlite3
from pathlib import Path

# Path to the database
DB_PATH = Path(__file__).parent / "running_tracker.db"

def migrate():
    """Add user_badges table to the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # Create user_badges table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_badges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                badge_type TEXT NOT NULL,
                badge_key TEXT NOT NULL,
                badge_name TEXT NOT NULL,
                badge_icon TEXT,
                badge_description TEXT,
                metric_value REAL,
                unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                is_viewed BOOLEAN DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Create index for faster queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_badges_user_id
            ON user_badges(user_id)
        """)

        cursor.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_user_badges_unique
            ON user_badges(user_id, badge_key)
        """)

        conn.commit()
        print("✅ Successfully created user_badges table")

    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
