#!/usr/bin/env python3
"""
Script pour merger les workouts dupliqués Strava + Apple Watch.
"""

import sys
from pathlib import Path

# Ajouter le parent directory au path pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import SessionLocal
from services.workout_merge_service import find_and_merge_duplicates


def main():
    """Exécute le merge des doublons."""
    db = SessionLocal()

    try:
        print("=" * 60)
        print("🔄 MERGE DES WORKOUTS DUPLIQUÉS")
        print("=" * 60)
        print()

        # Dry run d'abord pour voir ce qui serait fait
        print("📊 Phase 1 : Analyse (dry run)")
        print("-" * 60)
        stats_dry = find_and_merge_duplicates(db, user_id=1, dry_run=True)
        print()

        if stats_dry['merged'] == 0:
            print("✅ Aucun doublon trouvé !")
            return

        # Demander confirmation
        response = input(f"\n⚠️  Voulez-vous merger {stats_dry['merged']} doublons ? (yes/no): ")

        if response.lower() in ['yes', 'y', 'oui', 'o']:
            print()
            print("📊 Phase 2 : Merge effectif")
            print("-" * 60)
            stats = find_and_merge_duplicates(db, user_id=1, dry_run=False)
            print()
            print("=" * 60)
            print(f"✅ TERMINÉ : {stats['merged']} workouts mergés")
            print("=" * 60)
        else:
            print("\n❌ Opération annulée")

    finally:
        db.close()


if __name__ == "__main__":
    main()
