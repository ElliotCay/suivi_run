"""Test user preferences reading for workout scheduling."""

from database import SessionLocal
from services.training_block_generator import _get_user_schedule_from_preferences

db = SessionLocal()

try:
    # Test for 3 days per week
    schedule = _get_user_schedule_from_preferences(db, user_id=1, days_per_week=3)

    print("Schedule for user 1 with 3 days/week:")
    for day_offset, (workout_type, volume_pct) in sorted(schedule.items()):
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        print(f"  Day {day_offset} ({days[day_offset]}): {workout_type} - {volume_pct*100:.0f}% volume")

    print("\nExpected: Tuesday (1), Thursday (3), Saturday (5)")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
