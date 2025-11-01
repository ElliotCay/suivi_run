"""
Service pour merger les workouts dupliqués (Strava + Apple Watch).

Stratégie :
- Base : Strava (car contient best_efforts pour les records)
- Enrichissement : Apple Watch (pour données manquantes/meilleures)
"""

from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from models import Workout
import json


def are_duplicates(w1: Workout, w2: Workout) -> bool:
    """
    Détermine si deux workouts sont des doublons.

    Critères :
    - Dates à ±2h (décalage timezone)
    - Distance similaire (±5%)
    """
    if not w1.date or not w2.date:
        return False

    # Vérifier la différence de temps (±2h)
    time_diff = abs((w1.date - w2.date).total_seconds())
    if time_diff > 7200:  # 2 heures
        return False

    # Vérifier la distance (±5%)
    if not w1.distance or not w2.distance:
        return False

    dist_diff_pct = abs(w1.distance - w2.distance) / max(w1.distance, w2.distance)
    if dist_diff_pct > 0.05:  # 5%
        return False

    return True


def merge_workouts(strava: Workout, apple: Workout) -> Dict:
    """
    Merge deux workouts : base Strava + enrichissement Apple Watch.

    Returns: Dict avec les données mergées à appliquer au workout Strava
    """
    merged_data = {}

    # 1. Fréquence cardiaque : prendre la meilleure des deux
    if apple.avg_hr and (not strava.avg_hr or apple.avg_hr > strava.avg_hr):
        merged_data['avg_hr'] = apple.avg_hr

    if apple.max_hr and (not strava.max_hr or apple.max_hr > strava.max_hr):
        merged_data['max_hr'] = apple.max_hr

    # 2. Dénivelé : Apple Watch souvent plus fiable
    if apple.elevation_gain and apple.elevation_gain > 0:
        # Si Strava n'a pas de dénivelé OU si Apple Watch semble plus réaliste
        if not strava.elevation_gain or strava.elevation_gain < 1:
            merged_data['elevation_gain'] = apple.elevation_gain
        # Si les deux ont des valeurs, prendre Apple Watch si >3x celui de Strava
        # (car Strava sous-estime parfois)
        elif apple.elevation_gain > strava.elevation_gain * 3:
            merged_data['elevation_gain'] = apple.elevation_gain

    # 3. Enrichir raw_data
    strava_raw = strava.raw_data or {}
    apple_raw = apple.raw_data or {}

    merged_raw = dict(strava_raw)  # Copie de la base Strava
    merged_raw['merged_from'] = ['strava', 'apple_watch']
    merged_raw['apple_watch_elevation'] = apple.elevation_gain
    merged_raw['apple_watch_id'] = apple.id

    merged_data['raw_data'] = merged_raw

    return merged_data


def find_and_merge_duplicates(db: Session, user_id: int = 1, dry_run: bool = False) -> Dict[str, int]:
    """
    Trouve et merge tous les doublons Strava + Apple Watch.

    Args:
        db: Session SQLAlchemy
        user_id: ID utilisateur
        dry_run: Si True, ne fait que compter sans modifier

    Returns:
        Stats: {merged: int, deleted: int, skipped: int}
    """
    stats = {'merged': 0, 'deleted': 0, 'skipped': 0}

    # Récupérer tous les workouts
    workouts = db.query(Workout).filter(
        Workout.user_id == user_id
    ).order_by(Workout.date).all()

    # Grouper par source
    strava_workouts = [w for w in workouts if w.source == 'strava']
    apple_workouts = [w for w in workouts if w.source == 'apple_watch']

    print(f"🔍 Recherche de doublons...")
    print(f"   Strava: {len(strava_workouts)} workouts")
    print(f"   Apple Watch: {len(apple_workouts)} workouts")

    # Trouver les paires de doublons
    for strava_w in strava_workouts:
        for apple_w in apple_workouts:
            if are_duplicates(strava_w, apple_w):
                print(f"\n✨ Doublon trouvé :")
                print(f"   Strava:  {strava_w.date} - {strava_w.distance}km")
                print(f"   Apple:   {apple_w.date} - {apple_w.distance}km")

                if not dry_run:
                    # Merger les données
                    merged_data = merge_workouts(strava_w, apple_w)

                    # Appliquer au workout Strava
                    for key, value in merged_data.items():
                        setattr(strava_w, key, value)

                    # Supprimer le workout Apple Watch
                    db.delete(apple_w)

                    print(f"   ✅ Mergé (elevation: {merged_data.get('elevation_gain', strava_w.elevation_gain)}m)")
                    stats['merged'] += 1
                    stats['deleted'] += 1
                else:
                    print(f"   [DRY RUN] Serait mergé")
                    stats['merged'] += 1

    if not dry_run:
        db.commit()
        print(f"\n✅ Merge terminé : {stats['merged']} doublons mergés, {stats['deleted']} supprimés")
    else:
        print(f"\n[DRY RUN] {stats['merged']} doublons seraient mergés")

    return stats


def check_for_duplicate_on_import(
    db: Session,
    new_workout: Workout,
    user_id: int = 1
) -> Optional[Workout]:
    """
    Vérifie si un workout à importer est un doublon d'un existant.

    Utilisé lors de l'import Apple Health pour détecter les doublons Strava.

    Returns:
        - Le workout Strava existant si doublon détecté
        - None si pas de doublon
    """
    # Chercher dans une fenêtre de ±3h autour de la date du nouveau workout
    time_window_start = new_workout.date - timedelta(hours=3)
    time_window_end = new_workout.date + timedelta(hours=3)

    candidates = db.query(Workout).filter(
        Workout.user_id == user_id,
        Workout.date >= time_window_start,
        Workout.date <= time_window_end,
        Workout.source == 'strava'  # Chercher seulement dans Strava
    ).all()

    for candidate in candidates:
        if are_duplicates(new_workout, candidate):
            return candidate

    return None
