"""
Migration script to add profile fields to User model.
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "running_tracker.db"

def migrate():
    """Add profile fields to users table."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Add new columns if they don't exist
    columns_to_add = [
        ("age", "INTEGER"),
        ("weight", "REAL"),
        ("height", "REAL"),
        ("level", "TEXT DEFAULT 'intermediate'"),
        ("fcmax", "INTEGER"),
        ("vma", "REAL"),
    ]

    for column_name, column_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}")
            print(f"✓ Added column: {column_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"• Column {column_name} already exists, skipping")
            else:
                print(f"✗ Error adding {column_name}: {e}")

    conn.commit()
    conn.close()
    print("\n✓ Migration completed!")

if __name__ == "__main__":
    migrate()
