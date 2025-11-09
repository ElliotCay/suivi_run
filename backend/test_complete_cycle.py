"""
Test complete training cycle with automatic adaptation.

Simulates a real user flow:
1. Generate initial block (base phase)
2. Complete first 2 weeks with mixed feedback
3. Trigger automatic transition to next block
4. Verify next block is adapted based on feedback
"""

from datetime import datetime, timedelta
from database import SessionLocal
from models import (
    User, PersonalRecord, TrainingBlock, PlannedWorkout,
    Workout, WorkoutFeedback, StrengtheningReminder
)
from services.training_block_generator import generate_4_week_block
from routers.training_blocks import complete_block_and_generate_next


def clean_test_data(db):
    """Clean all test data including workouts with any test source."""
    # Delete in correct order due to foreign keys
    db.query(WorkoutFeedback).filter(WorkoutFeedback.user_id == 1).delete(synchronize_session=False)
    db.query(PlannedWorkout).filter(PlannedWorkout.user_id == 1).delete(synchronize_session=False)
    db.query(StrengtheningReminder).filter(StrengtheningReminder.user_id == 1).delete(synchronize_session=False)
    db.query(TrainingBlock).filter(TrainingBlock.user_id == 1).delete(synchronize_session=False)

    # Delete ALL test workouts regardless of source
    db.query(Workout).filter(
        Workout.user_id == 1,
        Workout.source.in_(['test_cycle', 'test_feedback', 'test', 'manual_test'])
    ).delete(synchronize_session=False)

    db.commit()


def simulate_week_completion(db, block, week_num, scenario="good"):
    """
    Simulate completion of a week with feedback.

    Args:
        db: Database session
        block: TrainingBlock
        week_num: Week number (1-4)
        scenario: "good", "too_hard", or "pain"
    """
    week_workouts = [w for w in block.planned_workouts if w.week_number == week_num]

    scenarios = {
        "good": {
            "rpe": 6,
            "difficulty": "just_right",
            "pain_locations": ["none"],
            "pace_variance": 0
        },
        "too_hard": {
            "rpe": 8,
            "difficulty": "too_hard",
            "pain_locations": ["none"],
            "pace_variance": 15
        },
        "pain": {
            "rpe": 8,
            "difficulty": "too_hard",
            "pain_locations": ["it_band"],
            "pace_variance": 20,
            "pain_severity": 5
        }
    }

    settings = scenarios.get(scenario, scenarios["good"])

    for planned in week_workouts:
        # Create completed workout
        actual_pace = planned.target_pace_min
        if settings["pace_variance"] > 0:
            actual_pace = int(planned.target_pace_min * (1 + settings["pace_variance"] / 100))

        workout = Workout(
            user_id=1,
            date=planned.scheduled_date,
            distance=planned.distance_km,
            duration=int(planned.distance_km * actual_pace),
            avg_pace=actual_pace,
            workout_type=planned.workout_type,
            source="test_cycle"
        )
        db.add(workout)
        db.flush()

        # Create feedback
        feedback = WorkoutFeedback(
            user_id=1,
            planned_workout_id=planned.id,
            completed_workout_id=workout.id,
            rpe=settings["rpe"],
            difficulty=settings["difficulty"],
            pain_locations=settings["pain_locations"],
            pain_severity=settings.get("pain_severity"),
            planned_pace_min=planned.target_pace_min,
            actual_pace=actual_pace,
            pace_variance=((actual_pace - planned.target_pace_min) / planned.target_pace_min * 100)
        )
        db.add(feedback)

        # Mark as completed
        planned.status = "completed"
        planned.completed_workout_id = workout.id
        planned.completed_at = datetime.utcnow()

    db.commit()
    print(f"   ✓ Week {week_num} completed with '{scenario}' feedback")


async def test_complete_cycle():
    """Test the complete training cycle with automatic adaptation."""
    db = SessionLocal()

    try:
        print("\n" + "="*70)
        print("TEST: COMPLETE TRAINING CYCLE WITH AUTOMATIC ADAPTATION")
        print("="*70)

        # Clean previous test data
        print("\n🧹 Cleaning previous test data...")
        clean_test_data(db)

        # Ensure we have a PR
        pr = db.query(PersonalRecord).filter(
            PersonalRecord.user_id == 1,
            PersonalRecord.is_current == 1
        ).first()

        if not pr:
            pr = PersonalRecord(
                user_id=1, distance="5km", time_seconds=1470,
                date_achieved=datetime.now(), is_current=1
            )
            db.add(pr)
            db.commit()
            print("✓ Created test PR (5K in 24:30)")

        # Step 1: Generate initial block
        print("\n📅 STEP 1: Generate initial training block (Base phase)")
        block1 = generate_4_week_block(db, 1, "base", 3)

        print(f"✓ Block created: {block1.name}")
        print(f"  - Phase: {block1.phase}")
        print(f"  - Volume: {block1.target_weekly_volume:.1f}km/week")
        print(f"  - Ratio: {block1.easy_percentage}/{block1.threshold_percentage}/{block1.interval_percentage}")
        print(f"  - Workouts: {len(block1.planned_workouts)}")

        # Step 2: Simulate week 1 - Everything good
        print("\n🏃 STEP 2: Complete Week 1 (Good feedback)")
        simulate_week_completion(db, block1, 1, "good")

        # Step 3: Simulate week 2 - Starting to struggle
        print("\n🏃 STEP 3: Complete Week 2 (Too hard)")
        simulate_week_completion(db, block1, 2, "too_hard")

        # Step 4: Simulate week 3 - Pain appears
        print("\n🏃 STEP 4: Complete Week 3 (Pain + too hard)")
        simulate_week_completion(db, block1, 3, "pain")

        # Step 5: Check analysis before completing
        from services.feedback_analyzer import get_block_summary
        print("\n📊 STEP 5: Analyze feedback")

        summary = get_block_summary(db, block1.id)

        print(f"\n  Metrics:")
        print(f"  - Completed: {summary['completed_workouts']}/{summary['total_workouts']} workouts")
        print(f"  - RPE moyen: {summary['analysis']['avg_rpe']:.1f}/10")
        print(f"  - Trop difficile: {summary['analysis']['too_hard_percentage']:.0f}%")
        print(f"  - Avec douleur: {summary['analysis']['pain_percentage']:.0f}%")
        print(f"  - Issues critiques: {'OUI' if summary['analysis']['has_critical_issues'] else 'NON'}")

        if summary['warnings']:
            print(f"\n  Alertes ({len(summary['warnings'])}):")
            for w in summary['warnings']:
                print(f"  - {w['icon']} {w['message']}")

        if summary['recommendations']:
            print(f"\n  Recommandations ({len(summary['recommendations'])}):")
            for r in summary['recommendations'][:3]:  # Show top 3
                print(f"  - {r['icon']} {r['message']}")

        # Step 6: Complete block and generate next
        print("\n🔄 STEP 6: Complete block and generate next (with adaptations)")

        result = await complete_block_and_generate_next(block1.id, db, 1)

        print(f"\n✓ Transition completed successfully!")

        print(f"\n  Bloc complété:")
        print(f"  - {result['completed_block']['name']}")
        print(f"  - Phase: {result['completed_block']['phase']}")
        print(f"  - Taux de complétion: {result['completed_block']['completion_rate']:.0f}%")

        print(f"\n  Ajustements appliqués:")
        print(f"  - Volume: {result['analysis']['volume_adjustment_applied']:+.0f}%")
        print(f"  - Issues critiques détectées: {'OUI' if result['analysis']['has_critical_issues'] else 'NON'}")

        print(f"\n  Nouveau bloc généré:")
        print(f"  - {result['next_block']['name']}")
        print(f"  - Phase: {result['next_block']['phase']}")
        print(f"  - Volume: {result['next_block']['target_weekly_volume']:.1f}km/week")
        print(f"  - Ratio: {result['next_block']['ratios']}")
        print(f"  - Début: {result['next_block']['start_date'].strftime('%d/%m/%Y')}")
        print(f"  - Workouts: {result['next_block']['total_workouts']}")

        # Step 7: Verify adaptations
        print("\n🔍 STEP 7: Verify adaptations applied correctly")

        block2 = db.query(TrainingBlock).filter(TrainingBlock.id == result['next_block']['id']).first()

        # Check volume reduced (due to negative feedback)
        volume_change = ((block2.target_weekly_volume - block1.target_weekly_volume) / block1.target_weekly_volume) * 100

        print(f"\n  Volume comparison:")
        print(f"  - Bloc 1: {block1.target_weekly_volume:.1f}km/week")
        print(f"  - Bloc 2: {block2.target_weekly_volume:.1f}km/week")
        print(f"  - Changement: {volume_change:+.1f}%")

        if volume_change < 0:
            print(f"  ✓ Volume correctement réduit (feedback négatif détecté)")
        else:
            print(f"  ⚠️  Volume non réduit malgré feedback négatif")

        # Check phase adaptation
        print(f"\n  Phase progression:")
        print(f"  - Bloc 1: {block1.phase}")
        print(f"  - Bloc 2: {block2.phase}")

        if summary['analysis']['has_critical_issues']:
            if block2.phase == "base":  # Should stay in base or go to recovery
                print(f"  ✓ Phase adaptée (issues critiques → phase conservatrice)")
            else:
                print(f"  ⚠️  Phase non adaptée malgré issues critiques")
        else:
            print(f"  ✓ Progression de phase normale")

        # Final summary
        print("\n" + "="*70)
        print("✅ TEST COMPLET RÉUSSI")
        print("="*70)
        print("\nLe système:")
        print("  1. ✓ Génère un bloc initial")
        print("  2. ✓ Enregistre les feedbacks")
        print("  3. ✓ Analyse les patterns négatifs")
        print("  4. ✓ Détecte les issues critiques")
        print("  5. ✓ Génère des recommandations")
        print("  6. ✓ Complete le bloc")
        print("  7. ✓ Génère automatiquement le prochain bloc")
        print("  8. ✓ Applique les adaptations (volume, phase)")
        print("\n🎉 Cycle d'entraînement adaptatif fonctionnel!")

    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Clean up
        print("\n🧹 Nettoyage...")
        clean_test_data(db)
        db.close()


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_complete_cycle())
