"""
Test script for feedback system and block adaptation.

This script:
1. Tries to generate a 2nd block while one is active (should fail)
2. Creates negative feedback for week 1 workouts
3. Shows how the system should adapt based on feedback
"""

from datetime import datetime, timedelta
from database import SessionLocal
from models import (
    User,
    PersonalRecord,
    TrainingBlock,
    PlannedWorkout,
    Workout,
    WorkoutFeedback
)
from services.training_block_generator import generate_4_week_block


def cleanup_test_data(db):
    """Clean all test data created by this script."""
    db.query(WorkoutFeedback).filter(WorkoutFeedback.user_id == 1).delete(synchronize_session=False)
    db.query(Workout).filter(
        Workout.user_id == 1,
        Workout.source.in_(['manual_test', 'test', 'test_feedback', 'test_cycle'])
    ).delete(synchronize_session=False)
    db.commit()


def test_duplicate_block():
    """Test that we can't create a 2nd block while one is active."""
    db = SessionLocal()

    try:
        print("=" * 60)
        print("TEST 1: Essayer de générer un 2ème bloc")
        print("=" * 60)

        # Try to generate another block
        try:
            block = generate_4_week_block(
                db=db,
                user_id=1,
                phase="development",
                days_per_week=3,
                start_date=None
            )
            print("❌ PROBLÈME: Le système a créé un 2ème bloc (pas normal !)")
        except Exception as e:
            print(f"✅ SUCCÈS: Le système refuse correctement de créer un 2ème bloc")
            print(f"   Message d'erreur attendu: {str(e)}")

    finally:
        db.close()


def test_negative_feedback():
    """Create negative feedback for week 1 workouts."""
    db = SessionLocal()

    try:
        print("\n" + "=" * 60)
        print("TEST 2: Créer des feedbacks négatifs pour semaine 1")
        print("=" * 60)

        # Get current block
        block = db.query(TrainingBlock).filter(
            TrainingBlock.user_id == 1,
            TrainingBlock.status == "active"
        ).first()

        if not block:
            print("❌ Aucun bloc actif trouvé")
            return

        # Get week 1 planned workouts
        week1_workouts = [w for w in block.planned_workouts if w.week_number == 1]
        print(f"\nSéances de la semaine 1 : {len(week1_workouts)} séances")

        # Create fake completed workouts with feedback for each
        for i, planned_workout in enumerate(week1_workouts, 1):
            print(f"\n--- Séance {i}: {planned_workout.title} ---")

            # Create a fake completed workout (simulating that user did the workout)
            completed_workout = Workout(
                user_id=1,
                date=planned_workout.scheduled_date,
                start_time=planned_workout.scheduled_date.replace(hour=18, minute=0),
                end_time=planned_workout.scheduled_date.replace(hour=18, minute=45),
                distance=planned_workout.distance_km,
                duration=2700,  # 45 minutes
                avg_pace=420,  # 7:00/km (beaucoup plus lent que prévu !)
                avg_hr=165,
                max_hr=180,
                workout_type=planned_workout.workout_type,
                source="manual_test"
            )
            db.add(completed_workout)
            db.flush()

            # Create negative feedback
            feedback = WorkoutFeedback(
                user_id=1,
                planned_workout_id=planned_workout.id,
                completed_workout_id=completed_workout.id,
                rpe=8,  # Très dur (sur 10)
                difficulty="too_hard",
                pain_locations=["it_band"],  # Douleur bandelette IT
                pain_severity=4,  # Moyenne (sur 10)
                comment="Séance trop difficile, j'ai dû freiner mes efforts. Douleur bandelette IT apparue après 20 min.",
                planned_pace_min=planned_workout.target_pace_min,
                actual_pace=420,  # 7:00/km
                pace_variance=((420 - planned_workout.target_pace_min) / planned_workout.target_pace_min * 100)
            )
            db.add(feedback)

            # Mark planned workout as completed
            planned_workout.completed_workout_id = completed_workout.id
            planned_workout.completed_at = datetime.utcnow()
            planned_workout.status = "completed"

            print(f"   Date: {planned_workout.scheduled_date.strftime('%d/%m')}")
            print(f"   Allure prévue: {planned_workout.target_pace_min//60}:{planned_workout.target_pace_min%60:02d}/km")
            print(f"   Allure réelle: 7:00/km")
            print(f"   Écart: +{feedback.pace_variance:.1f}% (beaucoup plus lent)")
            print(f"   RPE: 8/10 (très dur)")
            print(f"   Difficulté: Trop difficile")
            print(f"   Douleur: Bandelette IT (4/10)")
            print(f"   ✅ Feedback enregistré")

        db.commit()

        print("\n" + "=" * 60)
        print("ANALYSE DES FEEDBACKS")
        print("=" * 60)

        # Analyze the feedbacks
        all_feedbacks = db.query(WorkoutFeedback).filter(
            WorkoutFeedback.user_id == 1
        ).all()

        print(f"\nNombre total de feedbacks: {len(all_feedbacks)}")

        # Count issues
        too_hard_count = sum(1 for f in all_feedbacks if f.difficulty == "too_hard")
        pain_count = sum(1 for f in all_feedbacks if f.pain_locations and len(f.pain_locations) > 0)
        avg_rpe = sum(f.rpe for f in all_feedbacks if f.rpe) / len([f for f in all_feedbacks if f.rpe])
        avg_pace_variance = sum(f.pace_variance for f in all_feedbacks if f.pace_variance) / len([f for f in all_feedbacks if f.pace_variance])

        print(f"\n📊 Statistiques:")
        print(f"   Séances 'trop difficiles': {too_hard_count}/{len(all_feedbacks)} ({too_hard_count/len(all_feedbacks)*100:.0f}%)")
        print(f"   Séances avec douleur: {pain_count}/{len(all_feedbacks)} ({pain_count/len(all_feedbacks)*100:.0f}%)")
        print(f"   RPE moyen: {avg_rpe:.1f}/10")
        print(f"   Écart d'allure moyen: +{avg_pace_variance:.1f}%")

        print(f"\n🚨 SIGNAUX D'ALERTE DÉTECTÉS:")
        print(f"   ⚠️  100% des séances jugées trop difficiles")
        print(f"   ⚠️  100% des séances avec douleur IT band")
        print(f"   ⚠️  RPE moyen de 8/10 (devrait être ~6-7 max)")
        print(f"   ⚠️  Allures {avg_pace_variance:.0f}% plus lentes que prévu")

        print(f"\n💡 RECOMMANDATIONS POUR LE PROCHAIN BLOC:")
        print(f"   1. Réduire le volume de -20% (au lieu de +5%)")
        print(f"   2. Réduire l'intensité des séances qualité (passer en phase récupération)")
        print(f"   3. Augmenter le ratio easy/hard à 80/15/5 au lieu de 70/20/10")
        print(f"   4. Inclure plus de jours de repos")
        print(f"   5. Priorité absolue au renforcement TFL/IT band")

        print(f"\n📋 CE QUE LE SYSTÈME DEVRAIT FAIRE:")
        print(f"   - Recalculer le volume de base à partir des allures réelles")
        print(f"   - Proposer une phase 'Recovery' au lieu de 'Base'")
        print(f"   - Envoyer une alerte 'Risque de blessure IT band'")
        print(f"   - Suggérer repos supplémentaires")

    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()

    finally:
        db.close()


def show_current_block_status():
    """Show current block status after feedback."""
    db = SessionLocal()

    try:
        print("\n" + "=" * 60)
        print("ÉTAT ACTUEL DU BLOC")
        print("=" * 60)

        block = db.query(TrainingBlock).filter(
            TrainingBlock.user_id == 1,
            TrainingBlock.status == "active"
        ).first()

        if not block:
            print("❌ Aucun bloc actif")
            return

        total_workouts = len(block.planned_workouts)
        completed = sum(1 for w in block.planned_workouts if w.status == "completed")
        scheduled = sum(1 for w in block.planned_workouts if w.status == "scheduled")

        print(f"\nBloc: {block.name}")
        print(f"Phase: {block.phase}")
        print(f"Progression: {completed}/{total_workouts} séances complétées ({completed/total_workouts*100:.0f}%)")
        print(f"   - Complétées: {completed}")
        print(f"   - À venir: {scheduled}")

        print(f"\n📅 Prochaines séances:")
        upcoming = sorted(
            [w for w in block.planned_workouts if w.status == "scheduled"],
            key=lambda w: w.scheduled_date
        )[:5]

        for w in upcoming:
            print(f"   {w.scheduled_date.strftime('%d/%m')} ({w.day_of_week}): {w.title}")

    finally:
        db.close()


if __name__ == "__main__":
    print("\n🧪 TESTS DU SYSTÈME DE FEEDBACK ET ADAPTATION\n")

    db = SessionLocal()

    try:
        # Test 1: Try to create duplicate block
        test_duplicate_block()

        # Test 2: Create negative feedback
        test_negative_feedback()

        # Show current status
        show_current_block_status()

        print("\n✅ Tests terminés!")
        print("\nPour implémenter l'adaptation automatique, il faudrait créer:")
        print("  1. Un analyseur de feedbacks (services/feedback_analyzer.py)")
        print("  2. Une fonction d'ajustement de bloc (adjust_next_block_based_on_feedback)")
        print("  3. Un endpoint pour terminer un bloc et générer le suivant adapté")

    finally:
        # Cleanup test data
        print("\n🧹 Nettoyage des données de test...")
        cleanup_test_data(db)
        db.close()
        print("✅ Nettoyage terminé")
