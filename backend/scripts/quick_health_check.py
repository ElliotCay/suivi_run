#!/usr/bin/env python3
"""
Quick Health Check Script
Vérifie rapidement que l'application fonctionne correctement
Usage: python scripts/quick_health_check.py
"""

import sys
import os
from pathlib import Path

# Ajouter le répertoire backend au path
sys.path.insert(0, str(Path(__file__).parent.parent))

def check_environment():
    """Vérifie les variables d'environnement critiques"""
    print("🔍 Vérification des variables d'environnement...")

    from config import (
        ANTHROPIC_API_KEY,
        ICLOUD_USERNAME,
        ICLOUD_PASSWORD,
    )

    import os

    checks = []

    # Anthropic API
    if ANTHROPIC_API_KEY and ANTHROPIC_API_KEY.startswith("sk-ant-"):
        print("  ✅ ANTHROPIC_API_KEY configurée")
        checks.append(True)
    else:
        print("  ❌ ANTHROPIC_API_KEY manquante ou invalide")
        checks.append(False)

    # iCloud Calendar
    if ICLOUD_USERNAME and "@" in ICLOUD_USERNAME:
        print("  ✅ ICLOUD_USERNAME configurée")
        checks.append(True)
    else:
        print("  ⚠️  ICLOUD_USERNAME manquante (calendrier désactivé)")
        checks.append(True)  # Non critique

    if ICLOUD_PASSWORD and len(ICLOUD_PASSWORD) > 10:
        print("  ✅ ICLOUD_PASSWORD configurée")
        checks.append(True)
    else:
        print("  ⚠️  ICLOUD_PASSWORD manquante (calendrier désactivé)")
        checks.append(True)  # Non critique

    # Strava (optionnel)
    strava_client_id = os.getenv("STRAVA_CLIENT_ID")
    if strava_client_id:
        print("  ✅ STRAVA_CLIENT_ID configurée (optionnel)")
    else:
        print("  ℹ️  STRAVA_CLIENT_ID manquante (Strava désactivé)")

    return all(checks)


def check_database():
    """Vérifie la base de données"""
    print("\n🗄️  Vérification de la base de données...")

    try:
        from database import SessionLocal
        from models import Workout, Suggestion, PersonalRecord, User

        db = SessionLocal()

        # Compter les entrées
        workout_count = db.query(Workout).count()
        suggestion_count = db.query(Suggestion).count()
        pr_count = db.query(PersonalRecord).count()
        user_count = db.query(User).count()

        print(f"  ✅ Base de données accessible")
        print(f"     - {user_count} utilisateur(s)")
        print(f"     - {workout_count} course(s)")
        print(f"     - {suggestion_count} suggestion(s)")
        print(f"     - {pr_count} record(s) personnel(s)")

        db.close()
        return True

    except Exception as e:
        print(f"  ❌ Erreur base de données: {e}")
        return False


def check_icloud_connection():
    """Vérifie la connexion à iCloud Calendar"""
    print("\n☁️  Vérification de la connexion iCloud Calendar...")

    try:
        from services.icloud_calendar_sync import iCloudCalendarSync, CalendarSyncError

        sync = iCloudCalendarSync()

        if sync.connect():
            print("  ✅ Connexion iCloud Calendar réussie")
            return True
        else:
            print("  ❌ Connexion iCloud Calendar échouée")
            return False

    except CalendarSyncError as e:
        print(f"  ⚠️  iCloud Calendar désactivé: {e}")
        return True  # Non critique si désactivé
    except Exception as e:
        print(f"  ❌ Erreur iCloud: {e}")
        return False


def check_anthropic_api():
    """Vérifie la connexion à l'API Anthropic"""
    print("\n🤖 Vérification de l'API Anthropic...")

    try:
        import anthropic
        from config import ANTHROPIC_API_KEY

        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        # Test simple avec le modèle utilisé dans l'app
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=10,
            messages=[{"role": "user", "content": "ping"}]
        )

        print("  ✅ API Anthropic accessible")
        return True

    except Exception as e:
        print(f"  ❌ Erreur API Anthropic: {e}")
        return False


def check_dependencies():
    """Vérifie que toutes les dépendances sont installées"""
    print("\n📦 Vérification des dépendances critiques...")

    # (module, description, critical)
    dependencies = [
        ("anthropic", "Anthropic API", True),
        ("fastapi", "FastAPI", True),
        ("sqlalchemy", "SQLAlchemy", True),
        ("caldav", "CalDAV (iCloud Calendar)", False),
        ("icalendar", "iCalendar", False),
        ("gpxpy", "GPX parsing", False),
    ]

    checks = []
    for module_name, description, critical in dependencies:
        try:
            __import__(module_name)
            print(f"  ✅ {description}")
            checks.append(True)
        except ImportError:
            if critical:
                print(f"  ❌ {description} manquant (pip install {module_name})")
                checks.append(False)
            else:
                print(f"  ⚠️  {description} manquant (optionnel: pip install {module_name})")
                checks.append(True)  # Non critique

    return all(checks)


def check_files():
    """Vérifie que les fichiers critiques existent"""
    print("\n📁 Vérification des fichiers critiques...")

    files = [
        ("../backend/running_tracker.db", "Base de données", True),
        ("../backend/.env", "Fichier d'environnement", True),
        ("../backend/main.py", "Point d'entrée API", True),
        ("../frontend/package.json", "Configuration frontend", False),
    ]

    checks = []
    base_path = Path(__file__).parent.parent

    for file_path, description, critical in files:
        full_path = base_path / file_path
        if full_path.exists():
            print(f"  ✅ {description}")
            checks.append(True)
        else:
            if critical:
                print(f"  ❌ {description} manquant: {full_path}")
                checks.append(False)
            else:
                print(f"  ⚠️  {description} manquant: {full_path}")
                checks.append(True)

    return all(checks)


def main():
    """Exécute tous les checks"""
    print("=" * 60)
    print("🏥 HEALTH CHECK - Suivi Run App")
    print("=" * 60)

    results = []

    # Exécuter tous les checks
    results.append(("Environnement", check_environment()))
    results.append(("Fichiers", check_files()))
    results.append(("Dépendances", check_dependencies()))
    results.append(("Base de données", check_database()))
    results.append(("iCloud Calendar", check_icloud_connection()))
    results.append(("API Anthropic", check_anthropic_api()))

    # Résumé
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ")
    print("=" * 60)

    all_ok = True
    for name, status in results:
        icon = "✅" if status else "❌"
        print(f"{icon} {name}")
        if not status:
            all_ok = False

    print("=" * 60)

    if all_ok:
        print("🎉 Tous les checks sont OK ! L'application est prête.")
        return 0
    else:
        print("⚠️  Certains checks ont échoué. Vérifiez les erreurs ci-dessus.")
        return 1


if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\n⚠️  Health check interrompu par l'utilisateur")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Erreur inattendue: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
