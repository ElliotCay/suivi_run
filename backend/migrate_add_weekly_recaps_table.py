"""
Migration script to add weekly_recaps table.
"""

import sqlite3
from datetime import datetime

DB_PATH = "running_tracker.db"

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("Creating weekly_recaps table...")

    # Create weekly_recaps table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS weekly_recaps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            week_start_date DATETIME NOT NULL,
            week_end_date DATETIME NOT NULL,
            recap_text TEXT NOT NULL,
            sessions_completed INTEGER,
            sessions_planned INTEGER,
            total_volume_km REAL,
            avg_pace_seconds INTEGER,
            avg_heart_rate INTEGER,
            readiness_avg INTEGER,
            generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_viewed BOOLEAN DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # Create index on user_id and week_start_date for faster queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_weekly_recaps_user_week
        ON weekly_recaps(user_id, week_start_date DESC)
    """)

    # Create unique constraint to prevent duplicate recaps for the same week
    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_recaps_unique_week
        ON weekly_recaps(user_id, week_start_date)
    """)

    conn.commit()
    print("✅ weekly_recaps table created successfully")

    # Verify table creation
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='weekly_recaps'")
    if cursor.fetchone():
        print("✅ Migration completed successfully")
    else:
        print("❌ Migration failed - table not found")

    conn.close()

if __name__ == "__main__":
    migrate()
