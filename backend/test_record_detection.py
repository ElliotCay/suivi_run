"""
Test script for automatic record detection.
Scans workouts and identifies personal records.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal
from services.record_detector import detect_records_from_workouts, sync_records_to_database
from models import Workout, PersonalRecord


def test_record_detection():
    """Test the automatic record detection system."""
    db = SessionLocal()

    try:
        print("=" * 60)
        print("TESTING AUTOMATIC RECORD DETECTION")
        print("=" * 60)

        # Count workouts
        workout_count = db.query(Workout).filter(
            Workout.user_id == 1,
            Workout.distance.isnot(None),
            Workout.duration.isnot(None)
        ).count()
        print(f"\n✓ Found {workout_count} workouts with distance and duration data")

        # Detect records
        print("\n🔍 Scanning workouts for records...")
        detected_records = detect_records_from_workouts(db, user_id=1)

        if not detected_records:
            print("\n⚠️  No records detected")
            return

        print(f"\n✅ Detected {len(detected_records)} records:")
        print("-" * 60)

        for distance_key, record_data in detected_records.items():
            time_seconds = record_data["time_seconds"]
            minutes = time_seconds // 60
            seconds = time_seconds % 60
            time_display = f"{minutes}:{seconds:02d}"

            print(f"\n{record_data['label']:25s} {time_display:>10s}")
            print(f"  Date: {record_data['date']}")
            print(f"  Actual distance: {record_data['distance_actual']:.2f} km")
            print(f"  Workout ID: #{record_data['workout_id']}")

        # Sync to database
        print("\n" + "=" * 60)
        print("SYNCING RECORDS TO DATABASE")
        print("=" * 60)

        updated_count = sync_records_to_database(db, detected_records, user_id=1)
        print(f"\n✅ Successfully created/updated {updated_count} records in database")

        # Show current records in DB
        print("\n" + "=" * 60)
        print("CURRENT RECORDS IN DATABASE")
        print("=" * 60)

        db_records = db.query(PersonalRecord).filter(
            PersonalRecord.user_id == 1,
            PersonalRecord.is_current == 1
        ).order_by(PersonalRecord.distance).all()

        for record in db_records:
            minutes = record.time_seconds // 60
            seconds = record.time_seconds % 60
            time_display = f"{minutes}:{seconds:02d}"
            print(f"\n{record.distance:15s} {time_display:>10s}")
            print(f"  Date: {record.date_achieved.strftime('%Y-%m-%d')}")
            if record.notes:
                print(f"  Notes: {record.notes}")

        print("\n" + "=" * 60)
        print("✅ TEST COMPLETED SUCCESSFULLY")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_record_detection()
