"""
Script pour créer une séance de test complète pour démontrer la Phase 1 (Post-Workout AI Analysis)

Scénario:
- Bloc de 4 semaines actif
- Séance tempo planifiée: 12km @ 5:30-5:50/km
- Séance réalisée: 12.5km @ 4:48/km (beaucoup plus rapide que prévu)
- Déclenchement de l'analyse IA
- Affichage des ajustements proposés sur /coach
"""

import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import SessionLocal
from models import User, TrainingBlock, PlannedWorkout, Workout
from services.post_workout_analyzer import analyze_workout_performance

def create_test_scenario():
    db: Session = SessionLocal()

    try:
        print("🎬 Création du scénario de test Phase 1...")
        print()

        # Get user (should exist)
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            print("❌ Utilisateur non trouvé")
            return

        print(f"✓ Utilisateur: {user.name or 'User #1'}")

        # Create Training Block (4 weeks, development phase with tempo focus)
        today = datetime.now().date()
        block_start = today - timedelta(days=7)  # Started 1 week ago
        block_end = block_start + timedelta(weeks=4)

        block = TrainingBlock(
            user_id=user.id,
            name="Bloc Tempo - Test Phase 1",
            phase="development",  # development phase = more threshold/tempo work
            start_date=block_start,
            end_date=block_end,
            days_per_week=4,
            target_weekly_volume=50.0,
            easy_percentage=60,  # 60% easy
            threshold_percentage=30,  # 30% threshold (tempo)
            interval_percentage=10  # 10% intervals
        )
        db.add(block)
        db.commit()
        db.refresh(block)
        print(f"✓ Bloc créé: ID={block.id}, '{block.name}', {block_start} → {block_end}")

        # Create Planned Workout (yesterday - tempo run)
        workout_date = today - timedelta(days=1)
        workout_datetime = datetime.combine(workout_date, datetime.min.time())

        # Target: 5:30-5:50/km = 330-350 sec/km
        planned = PlannedWorkout(
            user_id=user.id,
            block_id=block.id,
            scheduled_date=workout_datetime,
            week_number=2,  # Week 2 of the block
            day_of_week="Mercredi",
            workout_type="threshold",  # Tempo = threshold
            distance_km=12.0,
            title="Tempo 12km",
            description="Tempo run 12km @ 5:30-5:50/km (allure seuil)",
            target_pace_min=330,  # 5:30/km in seconds
            target_pace_max=350,  # 5:50/km in seconds
            status="completed"
        )
        db.add(planned)
        db.commit()
        db.refresh(planned)
        print(f"✓ Séance planifiée: ID={planned.id}, {planned.scheduled_date.date()}, {planned.workout_type}, {planned.distance_km}km @ 5:30-5:50/km")

        # Create Completed Workout (much faster than planned!)
        # Target was 5:30-5:50/km (330-350 sec/km)
        # Actual: 4:48/km (288 sec/km) - 12% faster!

        actual_pace_sec = 288  # 4:48/km
        duration_sec = int(12.5 * actual_pace_sec)  # 12.5km @ 4:48/km = 60 minutes

        workout = Workout(
            user_id=user.id,
            date=workout_datetime,
            distance=12.5,  # Distance in km (not meters)
            duration=duration_sec,
            avg_pace=actual_pace_sec,
            avg_hr=165,  # High HR suggests hard effort
            max_hr=178,
            elevation_gain=50.0,
            workout_type="threshold",
            notes="Felt really strong today, pushed the pace more than planned",
            source="manual",
            is_test=True  # Flag as test workout for easy deletion
        )
        db.add(workout)
        db.commit()
        db.refresh(workout)

        actual_pace_min = f"{actual_pace_sec // 60}:{actual_pace_sec % 60:02d}"
        print(f"✓ Séance réalisée: ID={workout.id}")
        print(f"  - Distance: {workout.distance:.1f}km (vs {planned.distance_km}km planifiés)")
        print(f"  - Allure: {actual_pace_min}/km (vs 5:30-5:50/km planifiés)")
        print(f"  - FC moy: {workout.avg_hr} bpm")
        print(f"  - Durée: {duration_sec // 60}:{duration_sec % 60:02d}")
        print()

        # Trigger AI Analysis
        print("🤖 Déclenchement de l'analyse IA...")
        print()

        analysis = analyze_workout_performance(workout.id, db)

        if analysis:
            print("✅ ANALYSE TERMINÉE")
            print()
            print(f"📊 Résultat d'analyse:")
            print(f"  - Performance vs plan: {analysis.performance_vs_plan}")
            print(f"  - Variance allure: {analysis.pace_variance_pct:+.1f}%" if analysis.pace_variance_pct else "  - Variance allure: N/A")
            print(f"  - Fatigue détectée: {'Oui' if analysis.fatigue_detected else 'Non'}")
            print(f"  - Score risque blessure: {analysis.injury_risk_score:.1f}/10")
            print()
            print(f"💬 Résumé:")
            print(f"  {analysis.summary}")
            print()

            # Check if adjustment proposal was created
            from models import AdjustmentProposal
            proposal = db.query(AdjustmentProposal).filter(
                AdjustmentProposal.analysis_id == analysis.id
            ).first()

            if proposal:
                print(f"⚙️ Proposition d'ajustement créée (ID={proposal.id})")
                print(f"  - Statut: {proposal.status}")
                print(f"  - Nombre d'ajustements: {len(proposal.adjustments)}")
                if proposal.adjustments:
                    print(f"  - Ajustements:")
                    for adj in proposal.adjustments:
                        print(f"    • {adj.get('action', 'N/A')}: {adj.get('current_value', 'N/A')} → {adj.get('proposed_value', 'N/A')} ({adj.get('change_pct', 0):+.0f}%)")
            else:
                print("ℹ️ Aucune proposition d'ajustement (changements < 10%)")

            print()
            print("=" * 60)
            print("🎯 TEST PRÊT - Consulte la page /coach pour voir le résultat!")
            print("=" * 60)
            print()
            print("IDs créés pour nettoyage futur:")
            print(f"  - TrainingBlock: {block.id}")
            print(f"  - PlannedWorkout: {planned.id}")
            print(f"  - Workout: {workout.id}")
            print(f"  - WorkoutAnalysis: {analysis.id}")
            if proposal:
                print(f"  - AdjustmentProposal: {proposal.id}")

        else:
            print("❌ Erreur lors de l'analyse")

    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_scenario()
