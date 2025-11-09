"""
Script to sync personal records from Strava best_efforts with exact values.
"""

import sqlite3
import json
from datetime import datetime

def sync_strava_prs():
    conn = sqlite3.connect('running_tracker.db')
    cursor = conn.cursor()

    # Get all workouts with best_efforts
    cursor.execute("""
        SELECT id, date, raw_data
        FROM workouts
        WHERE user_id = 1 AND raw_data LIKE '%best_efforts%'
        ORDER BY date DESC
    """)

    workouts = cursor.fetchall()

    # Track best times for each distance
    best_times = {}  # distance -> {time, date, workout_id}

    for workout_id, workout_date, raw_data_str in workouts:
        try:
            raw_data = json.loads(raw_data_str)
            best_efforts = raw_data.get('best_efforts', {})

            for distance_key, effort_data in best_efforts.items():
                time_seconds = effort_data.get('time_seconds')

                if time_seconds and time_seconds > 0:
                    # Keep best time for this distance
                    if distance_key not in best_times or time_seconds < best_times[distance_key]['time']:
                        best_times[distance_key] = {
                            'time': time_seconds,
                            'date': workout_date,
                            'workout_id': workout_id
                        }
        except (json.JSONDecodeError, KeyError) as e:
            continue

    # Now update/create personal records
    created_count = 0
    updated_count = 0

    for distance_key, best_data in best_times.items():
        time_seconds = best_data['time']
        workout_date = best_data['date']

        # Check if PR exists
        cursor.execute("""
            SELECT id, time_seconds
            FROM personal_records
            WHERE user_id = 1 AND distance = ? AND is_current = 1
        """, (distance_key,))

        existing_pr = cursor.fetchone()

        if existing_pr:
            existing_id, existing_time = existing_pr

            # Update if new time is better OR if times are close but we want exact value
            if abs(time_seconds - existing_time) > 0.1:  # More than 0.1s difference
                if time_seconds < existing_time:
                    # Mark old as superseded
                    cursor.execute("""
                        UPDATE personal_records
                        SET is_current = 0, superseded_at = ?
                        WHERE id = ?
                    """, (datetime.utcnow(), existing_id))

                    # Create new PR with exact time
                    cursor.execute("""
                        INSERT INTO personal_records
                        (user_id, distance, time_seconds, date_achieved, is_current, notes)
                        VALUES (?, ?, ?, ?, 1, ?)
                    """, (1, distance_key, time_seconds, workout_date, "Auto-detected from workout (Strava best effort)"))

                    updated_count += 1
                    print(f"✅ {distance_key:8s} - Amélioré: {time_seconds:.1f}s (le {workout_date[:10]})")
                else:
                    print(f"⚪ {distance_key:8s} - Déjà meilleur: {existing_time:.1f}s")
            else:
                # Update the exact time and date even if similar
                cursor.execute("""
                    UPDATE personal_records
                    SET time_seconds = ?, date_achieved = ?
                    WHERE id = ?
                """, (time_seconds, workout_date, existing_id))
                print(f"🔄 {distance_key:8s} - Mis à jour: {time_seconds:.1f}s (le {workout_date[:10]})")
                updated_count += 1
        else:
            # Create new PR
            cursor.execute("""
                INSERT INTO personal_records
                (user_id, distance, time_seconds, date_achieved, is_current, notes)
                VALUES (?, ?, ?, ?, 1, ?)
            """, (1, distance_key, time_seconds, workout_date, "Auto-detected from workout (Strava best effort)"))

            created_count += 1
            print(f"🆕 {distance_key:8s} - Créé: {time_seconds:.1f}s (le {workout_date[:10]})")

    conn.commit()
    conn.close()

    print(f"\n🎉 Résumé: {created_count} créés, {updated_count} mis à jour")

if __name__ == "__main__":
    sync_strava_prs()
