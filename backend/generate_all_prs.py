"""
Script to generate personal records from all workouts.
Finds best time for each standard distance by looking at actual workout distances.
"""

import sqlite3
from datetime import datetime

def generate_all_prs():
    conn = sqlite3.connect('running_tracker.db')
    cursor = conn.cursor()

    # Define distance targets with tolerance
    distance_targets = [
        {"name": "400m", "target_km": 0.4, "min": 0.35, "max": 0.45},
        {"name": "500m", "target_km": 0.5, "min": 0.45, "max": 0.55},
        {"name": "800m", "target_km": 0.8, "min": 0.75, "max": 0.85},
        {"name": "1km", "target_km": 1.0, "min": 0.95, "max": 1.05},
        {"name": "1_mile", "target_km": 1.609, "min": 1.55, "max": 1.65},
        {"name": "2km", "target_km": 2.0, "min": 1.9, "max": 2.1},
        {"name": "3km", "target_km": 3.0, "min": 2.85, "max": 3.15},
        {"name": "5km", "target_km": 5.0, "min": 4.8, "max": 5.2},
        {"name": "10km", "target_km": 10.0, "min": 9.8, "max": 10.2},
        {"name": "15km", "target_km": 15.0, "min": 14.5, "max": 15.5},
        {"name": "semi", "target_km": 21.1, "min": 20.5, "max": 21.7},
        {"name": "marathon", "target_km": 42.2, "min": 41.5, "max": 43.0},
    ]

    created_count = 0
    updated_count = 0

    for dist_config in distance_targets:
        name = dist_config["name"]
        min_km = dist_config["min"]
        max_km = dist_config["max"]

        # Find best workout in this distance range
        cursor.execute("""
            SELECT id, date, distance, duration
            FROM workouts
            WHERE user_id = 1
            AND distance >= ?
            AND distance <= ?
            AND duration > 0
            ORDER BY (duration / distance) ASC
            LIMIT 1
        """, (min_km, max_km))

        best_workout = cursor.fetchone()

        if not best_workout:
            print(f"⚪ {name:12s} - Aucune séance trouvée")
            continue

        workout_id, workout_date, distance_km, duration_sec = best_workout
        time_seconds = int(duration_sec)

        # Check if PR already exists
        cursor.execute("""
            SELECT id, time_seconds, date_achieved
            FROM personal_records
            WHERE user_id = 1 AND distance = ? AND is_current = 1
        """, (name,))

        existing_pr = cursor.fetchone()

        if existing_pr:
            existing_id, existing_time, existing_date = existing_pr

            # If new time is better, update
            if time_seconds < existing_time:
                # Mark old as superseded
                cursor.execute("""
                    UPDATE personal_records
                    SET is_current = 0, superseded_at = ?
                    WHERE id = ?
                """, (datetime.utcnow(), existing_id))

                # Create new PR
                cursor.execute("""
                    INSERT INTO personal_records
                    (user_id, distance, time_seconds, date_achieved, is_current, notes)
                    VALUES (?, ?, ?, ?, 1, ?)
                """, (1, name, time_seconds, workout_date, f"Auto-detected from {distance_km:.2f}km workout"))

                updated_count += 1
                minutes = time_seconds // 60
                seconds = time_seconds % 60
                print(f"✅ {name:12s} - AMÉLIORÉ: {minutes}:{seconds:02d} (le {workout_date[:10]})")
            else:
                print(f"⚪ {name:12s} - Déjà optimal: {existing_time}s")
        else:
            # Create new PR
            cursor.execute("""
                INSERT INTO personal_records
                (user_id, distance, time_seconds, date_achieved, is_current, notes)
                VALUES (?, ?, ?, ?, 1, ?)
            """, (1, name, time_seconds, workout_date, f"Auto-detected from {distance_km:.2f}km workout"))

            created_count += 1
            minutes = time_seconds // 60
            seconds = time_seconds % 60
            print(f"🆕 {name:12s} - CRÉÉ: {minutes}:{seconds:02d} (le {workout_date[:10]})")

    conn.commit()
    conn.close()

    print(f"\n🎉 Résumé: {created_count} créés, {updated_count} améliorés")

if __name__ == "__main__":
    generate_all_prs()
