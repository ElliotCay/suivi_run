"""
Test script for training block generation.

This script:
1. Creates a test user with a 5K PR
2. Generates a 4-week training block
3. Displays all planned workouts and strengthening reminders
"""

from datetime import datetime, timedelta
from database import SessionLocal
from models import User, PersonalRecord
from services.training_block_generator import generate_4_week_block


def test_block_generation():
    """Test the complete training block generation system."""
    db = SessionLocal()

    try:
        # Check if user exists
        user = db.query(User).filter(User.id == 1).first()

        if not user:
            print("⚠️  User not found. Please create a user first.")
            return

        # Check for existing PRs
        prs = db.query(PersonalRecord).filter(
            PersonalRecord.user_id == 1,
            PersonalRecord.is_current == 1
        ).all()

        if not prs:
            print("⚠️  No personal records found. Creating a test PR...")
            # Create a test PR: 5K in 24:30
            pr = PersonalRecord(
                user_id=1,
                distance="5km",
                time_seconds=1470,  # 24:30
                date_achieved=datetime.now(),
                is_current=1,
                notes="Test PR for system demo"
            )
            db.add(pr)
            db.commit()
            print(f"✅ Created test PR: 5K in 24:30")

        # Generate training block
        print("\n🚀 Generating 4-week training block...")
        print("   Phase: Base")
        print("   Days/week: 3 (Tuesday, Thursday, Saturday)")
        print()

        block = generate_4_week_block(
            db=db,
            user_id=1,
            phase="base",
            days_per_week=3,
            start_date=None  # Will start next Monday
        )

        print(f"✅ Training block created successfully!")
        print(f"   Block ID: {block.id}")
        print(f"   Name: {block.name}")
        print(f"   Duration: {block.start_date.strftime('%d/%m/%Y')} - {block.end_date.strftime('%d/%m/%Y')}")
        print(f"   Target volume: {block.target_weekly_volume:.1f} km/week")
        print(f"   Intensity distribution: {block.easy_percentage}% easy, {block.threshold_percentage}% threshold, {block.interval_percentage}% interval")
        print()

        # Display training zones
        from models import TrainingZone
        zones = db.query(TrainingZone).filter(
            TrainingZone.user_id == 1,
            TrainingZone.is_current == True
        ).first()

        if zones:
            print("📊 Your Training Zones (based on VDOT):")
            print(f"   VDOT: {zones.vdot:.1f} (from {zones.source_distance} PR)")
            print(f"   Easy: {zones.easy_min_pace_sec//60}:{zones.easy_min_pace_sec%60:02d} - {zones.easy_max_pace_sec//60}:{zones.easy_max_pace_sec%60:02d}/km")
            print(f"   Marathon: {zones.marathon_pace_sec//60}:{zones.marathon_pace_sec%60:02d}/km")
            print(f"   Threshold: {zones.threshold_min_pace_sec//60}:{zones.threshold_min_pace_sec%60:02d} - {zones.threshold_max_pace_sec//60}:{zones.threshold_max_pace_sec%60:02d}/km")
            print(f"   Interval: {zones.interval_min_pace_sec//60}:{zones.interval_min_pace_sec%60:02d} - {zones.interval_max_pace_sec//60}:{zones.interval_max_pace_sec%60:02d}/km")
            print()

        # Display planned workouts
        print("📅 Planned Running Workouts (12 sessions):\n")

        workouts = sorted(block.planned_workouts, key=lambda w: w.scheduled_date)

        current_week = 0
        for workout in workouts:
            if workout.week_number != current_week:
                current_week = workout.week_number
                if current_week == 4:
                    print(f"   --- Semaine {current_week} (RÉCUPÉRATION) ---")
                else:
                    print(f"   --- Semaine {current_week} ---")

            date_str = workout.scheduled_date.strftime("%d/%m")
            distance_str = f"{workout.distance_km:.1f}km" if workout.distance_km else ""

            pace_str = ""
            if workout.target_pace_min and workout.target_pace_max:
                min_m, min_s = divmod(workout.target_pace_min, 60)
                max_m, max_s = divmod(workout.target_pace_max, 60)
                pace_str = f"@ {min_m}:{min_s:02d}-{max_m}:{max_s:02d}/km"

            print(f"   {date_str} ({workout.day_of_week}): {workout.title} {distance_str} {pace_str}")

        # Display strengthening reminders
        from models import StrengtheningReminder
        reminders = db.query(StrengtheningReminder).filter(
            StrengtheningReminder.block_id == block.id
        ).order_by(StrengtheningReminder.scheduled_date).all()

        print(f"\n💪 Strengthening Reminders ({len(reminders)} sessions):\n")

        current_week = 0
        for reminder in reminders:
            # Calculate week number
            week_num = ((reminder.scheduled_date - block.start_date).days // 7) + 1

            if week_num != current_week:
                current_week = week_num
                print(f"   --- Semaine {current_week} ---")

            date_str = reminder.scheduled_date.strftime("%d/%m")
            print(f"   {date_str} ({reminder.day_of_week}): {reminder.title} ({reminder.duration_minutes} min)")

        print("\n✅ Test completed successfully!")
        print("\nYou can now:")
        print("  1. Start the backend: uvicorn main:app --reload")
        print("  2. Test the API: GET /api/training/current-block")
        print("  3. View all workouts in the frontend dashboard")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()


if __name__ == "__main__":
    test_block_generation()
