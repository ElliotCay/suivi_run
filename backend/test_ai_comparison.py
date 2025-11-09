"""
Test script to compare Haiku vs Sonnet workout descriptions.
"""

import sys
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from database import SessionLocal
from services.training_block_generator import generate_4_week_block

def test_ai_comparison():
    db = SessionLocal()

    try:
        # Calculate next Monday
        today = datetime.now()
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        next_monday = today + timedelta(days=days_until_monday)
        next_monday = next_monday.replace(hour=0, minute=0, second=0, microsecond=0)

        print("=" * 80)
        print("GENERATING BLOCK WITH HAIKU")
        print("=" * 80)

        # Generate with Haiku
        haiku_block = generate_4_week_block(
            db=db,
            user_id=1,
            phase="base",
            days_per_week=3,
            start_date=next_monday,
            use_ai_descriptions=True,
            use_sonnet=False  # Haiku
        )

        print(f"\n✅ Haiku block generated: ID {haiku_block.id}")
        print(f"   Workouts: {len(haiku_block.planned_workouts)}")

        # Print first 2 workout descriptions from Haiku
        print("\n" + "=" * 80)
        print("HAIKU - Sample Workout Descriptions (first 2)")
        print("=" * 80)

        for i, workout in enumerate(haiku_block.planned_workouts[:2], 1):
            print(f"\n--- Workout {i}: {workout.title} ---")
            print(workout.description)
            print()

        # Now generate with Sonnet (mark old block as abandoned)
        haiku_block.status = "abandoned"
        db.commit()

        print("\n" + "=" * 80)
        print("GENERATING BLOCK WITH SONNET")
        print("=" * 80)

        sonnet_block = generate_4_week_block(
            db=db,
            user_id=1,
            phase="base",
            days_per_week=3,
            start_date=next_monday,
            use_ai_descriptions=True,
            use_sonnet=True  # Sonnet
        )

        print(f"\n✅ Sonnet block generated: ID {sonnet_block.id}")
        print(f"   Workouts: {len(sonnet_block.planned_workouts)}")

        # Print first 2 workout descriptions from Sonnet
        print("\n" + "=" * 80)
        print("SONNET - Sample Workout Descriptions (first 2)")
        print("=" * 80)

        for i, workout in enumerate(sonnet_block.planned_workouts[:2], 1):
            print(f"\n--- Workout {i}: {workout.title} ---")
            print(workout.description)
            print()

        # Comparison summary
        print("\n" + "=" * 80)
        print("COMPARISON SUMMARY")
        print("=" * 80)

        haiku_avg_length = sum(len(w.description) for w in haiku_block.planned_workouts) / len(haiku_block.planned_workouts)
        sonnet_avg_length = sum(len(w.description) for w in sonnet_block.planned_workouts) / len(sonnet_block.planned_workouts)

        print(f"\nHaiku:")
        print(f"  - Average description length: {haiku_avg_length:.0f} characters")
        print(f"  - Model: claude-3-5-haiku-20241022")
        print(f"  - Cost estimate: ~$0.01-0.02 per block")

        print(f"\nSonnet:")
        print(f"  - Average description length: {sonnet_avg_length:.0f} characters")
        print(f"  - Model: claude-sonnet-4-20250514")
        print(f"  - Cost estimate: ~$0.10 per block")

        print(f"\nDifference: {sonnet_avg_length - haiku_avg_length:+.0f} characters on average")

        print("\n✅ Comparison complete! Check the descriptions above.")
        print("   Both blocks are now in the database. Sonnet block is active.")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_ai_comparison()
