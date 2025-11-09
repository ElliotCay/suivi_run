"""
Script to fix personal_records dates by finding the actual workout dates.
"""

import json
import sqlite3
from datetime import datetime

def fix_pr_dates():
    conn = sqlite3.connect('running_tracker.db')
    cursor = conn.cursor()

    # Get all current personal records
    cursor.execute("""
        SELECT id, distance, time_seconds
        FROM personal_records
        WHERE user_id = 1 AND is_current = 1
    """)

    records = cursor.fetchall()
    updated_count = 0

    for pr_id, distance, time_seconds in records:
        # Map distance names to best_efforts keys
        distance_map = {
            '500m': '500m',
            '1km': '1km',
            '2km': '2km',
            '5km': '5km',
            '10km': '10km',
        }

        if distance not in distance_map:
            print(f"⚠️  Skipping {distance} (not in map)")
            continue

        best_effort_key = distance_map[distance]

        # Find workouts with this best effort
        cursor.execute("""
            SELECT date, raw_data
            FROM workouts
            WHERE user_id = 1
            AND raw_data LIKE ?
            ORDER BY date DESC
        """, (f'%"best_efforts"%"{best_effort_key}"%',))

        workouts = cursor.fetchall()

        best_match_date = None
        best_match_time = None

        for workout_date_str, raw_data_str in workouts:
            try:
                raw_data = json.loads(raw_data_str)
                best_efforts = raw_data.get('best_efforts', {})

                if best_effort_key in best_efforts:
                    effort_time = best_efforts[best_effort_key].get('time_seconds')

                    if effort_time:
                        effort_time_int = int(effort_time)

                        # If this matches our PR time (within 10 second tolerance for rounding)
                        if abs(effort_time_int - time_seconds) <= 10:
                            best_match_date = workout_date_str
                            best_match_time = effort_time_int
                            break
            except (json.JSONDecodeError, KeyError, ValueError) as e:
                continue

        if best_match_date:
            # Update the PR date
            cursor.execute("""
                UPDATE personal_records
                SET date_achieved = ?
                WHERE id = ?
            """, (best_match_date, pr_id))

            updated_count += 1
            print(f"✅ Updated {distance}: {time_seconds}s -> date {best_match_date}")
        else:
            print(f"❌ No match found for {distance}: {time_seconds}s")

    conn.commit()
    conn.close()

    print(f"\n🎉 Updated {updated_count}/{len(records)} personal records")

if __name__ == "__main__":
    fix_pr_dates()
