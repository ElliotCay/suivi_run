"""
Test script for VDOT calibration system
"""

from database import SessionLocal
from services.vdot_calibration import (
    get_calibrated_vdot,
    calculate_effective_vdot_from_workouts,
    update_user_training_zones
)
from services.vdot_calculator import get_weighted_vdot_from_prs, calculate_training_paces
from models import PersonalRecord, Workout

def test_vdot_calibration():
    db = SessionLocal()
    user_id = 1

    print("=" * 80)
    print("🧪 TEST DU SYSTÈME DE CALIBRATION VDOT")
    print("=" * 80)
    print()

    # 1. Test weighted VDOT from PRs
    print("📊 1. VDOT PONDÉRÉ DEPUIS LES PRs")
    print("-" * 80)
    prs = db.query(PersonalRecord).filter(PersonalRecord.user_id == user_id).all()

    if prs:
        weighted_vdot, pr_metadata = get_weighted_vdot_from_prs(prs)
        print(f"VDOT pondéré: {weighted_vdot}")
        print(f"Nombre de PRs: {pr_metadata['num_prs']}")
        print(f"Range VDOT: {pr_metadata['vdot_range'][0]} - {pr_metadata['vdot_range'][1]}")
        print(f"Écart-type: {pr_metadata['vdot_std']}")
        print(f"Distances principales: {', '.join(pr_metadata['primary_distances'])}")
        print(f"Score de confiance: {pr_metadata['confidence_score']}")
    else:
        print("❌ Aucun PR trouvé")
        return

    print()

    # 2. Test effective VDOT from workouts
    print("🏃 2. VDOT EFFECTIF DEPUIS LES ENTRAÎNEMENTS")
    print("-" * 80)

    effective_result = calculate_effective_vdot_from_workouts(user_id, db)

    if effective_result:
        effective_vdot, workout_metadata = effective_result
        print(f"VDOT effectif: {effective_vdot}")
        print(f"Basé sur {workout_metadata['sample_size']} séances threshold/tempo")
        print(f"Allure moyenne: {workout_metadata['avg_pace_display']}/km")
        print(f"Score de cohérence: {workout_metadata['consistency_score']}")
        print(f"Range VDOT: {workout_metadata['vdot_range'][0]} - {workout_metadata['vdot_range'][1]}")
        print(f"Période analysée: {workout_metadata['lookback_days']} jours")
    else:
        print("⚠️  Pas assez de données d'entraînement (<3 séances threshold récentes)")
        print("   Le VDOT calibré sera basé uniquement sur les PRs")

    print()

    # 3. Test calibrated VDOT (blend)
    print("🎯 3. VDOT CALIBRÉ (BLEND INTELLIGENT)")
    print("-" * 80)

    calibrated_vdot, metadata = get_calibrated_vdot(user_id, db)

    print(f"Type de calibration: {metadata['vdot_type']}")
    print(f"VDOT théorique (PRs): {metadata['theoretical_vdot']}")

    if metadata['effective_vdot']:
        print(f"VDOT effectif (entraînements): {metadata['effective_vdot']}")
        print(f"Ratio de blend: {metadata['blend_ratio']['effective']*100:.0f}% effectif / {metadata['blend_ratio']['theoretical']*100:.0f}% théorique")
        print(f"Ajustement: {metadata['adjustment_pct']:+.1f}%")

    print(f"VDOT CALIBRÉ FINAL: {metadata['calibrated_vdot']}")
    print(f"Niveau de confiance: {metadata['confidence']}")

    print()

    # 4. Compare training zones
    print("🏁 4. COMPARAISON DES ZONES D'ENTRAÎNEMENT")
    print("-" * 80)

    theoretical_paces = calculate_training_paces(metadata['theoretical_vdot'])
    calibrated_paces = calculate_training_paces(metadata['calibrated_vdot'])

    print(f"{'Zone':<12} {'Théorique (PRs)':<20} {'Calibré (réel)':<20} {'Différence':<10}")
    print("-" * 70)

    # Easy
    theo_easy = f"{theoretical_paces['easy']['min_pace_per_km']}-{theoretical_paces['easy']['max_pace_per_km']}"
    cal_easy = f"{calibrated_paces['easy']['min_pace_per_km']}-{calibrated_paces['easy']['max_pace_per_km']}"
    diff_easy = calibrated_paces['easy']['min_pace_sec'] - theoretical_paces['easy']['min_pace_sec']
    print(f"{'Easy':<12} {theo_easy:<20} {cal_easy:<20} {diff_easy:+.0f}s/km")

    # Threshold
    theo_threshold = f"{theoretical_paces['threshold']['min_pace_per_km']}-{theoretical_paces['threshold']['max_pace_per_km']}"
    cal_threshold = f"{calibrated_paces['threshold']['min_pace_per_km']}-{calibrated_paces['threshold']['max_pace_per_km']}"
    diff_threshold = calibrated_paces['threshold']['min_pace_sec'] - theoretical_paces['threshold']['min_pace_sec']
    print(f"{'Threshold':<12} {theo_threshold:<20} {cal_threshold:<20} {diff_threshold:+.0f}s/km")

    # Interval
    theo_interval = f"{theoretical_paces['interval']['min_pace_per_km']}-{theoretical_paces['interval']['max_pace_per_km']}"
    cal_interval = f"{calibrated_paces['interval']['min_pace_per_km']}-{calibrated_paces['interval']['max_pace_per_km']}"
    diff_interval = calibrated_paces['interval']['min_pace_sec'] - theoretical_paces['interval']['min_pace_sec']
    print(f"{'Interval':<12} {theo_interval:<20} {cal_interval:<20} {diff_interval:+.0f}s/km")

    print()

    # 5. Update user zones
    print("💾 5. MISE À JOUR DES ZONES DE L'UTILISATEUR")
    print("-" * 80)

    zone = update_user_training_zones(user_id, db, force_recalculate=True)

    print(f"✅ Zones mises à jour avec VDOT calibré: {zone.vdot}")
    print(f"   Easy: {zone.easy_min_pace_sec//60}:{zone.easy_min_pace_sec%60:02d} - {zone.easy_max_pace_sec//60}:{zone.easy_max_pace_sec%60:02d}/km")
    print(f"   Threshold: {zone.threshold_min_pace_sec//60}:{zone.threshold_min_pace_sec%60:02d} - {zone.threshold_max_pace_sec//60}:{zone.threshold_max_pace_sec%60:02d}/km")
    print(f"   Interval: {zone.interval_min_pace_sec//60}:{zone.interval_min_pace_sec%60:02d} - {zone.interval_max_pace_sec//60}:{zone.interval_max_pace_sec%60:02d}/km")

    print()
    print("=" * 80)
    print("✅ TEST TERMINÉ")
    print("=" * 80)

    db.close()

if __name__ == "__main__":
    test_vdot_calibration()
