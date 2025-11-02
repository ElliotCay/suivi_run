# Guide de Tests - Suivi Run

Ce guide explique comment tester l'application avant chaque release.

## 🚀 Quick Start

### Health Check Rapide (30 secondes)

Le script `quick_health_check.py` vérifie automatiquement que tout fonctionne :

```bash
cd backend
source venv/bin/activate
python scripts/quick_health_check.py
```

Ce script vérifie :
- ✅ Variables d'environnement (.env)
- ✅ Base de données accessible
- ✅ Connexion iCloud Calendar
- ✅ API Anthropic fonctionnelle
- ✅ Toutes les dépendances installées

**Résultat attendu** : 🎉 Tous les checks sont OK !

---

## 📋 Testing Roadmap Complète

Pour un test manuel complet avant une release importante :

1. **Ouvre la roadmap** : `TESTING_ROADMAP.md`
2. **Suis la checklist** : Teste chaque fonctionnalité une par une
3. **Durée** : 30-45 minutes pour tout tester

La roadmap couvre :
- Dashboard et statistiques
- Import Apple Health (manuel + auto)
- Liste des courses et détails
- Records personnels et segments
- Suggestions AI avec Claude
- Synchronisation calendrier iCloud
- Sécurité et performance

---

## 🛠️ Commandes Utiles

### Démarrer l'application

**Backend** :
```bash
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
```

**Frontend** :
```bash
cd frontend
npm run dev
```

### Vérifier les logs

```bash
# Logs en temps réel
tail -f /tmp/backend.log

# Chercher des erreurs
tail -100 /tmp/backend.log | grep -E "(ERROR|WARNING)"

# Logs de synchronisation calendrier
tail -100 /tmp/backend.log | grep -i calendar
```

### Inspecter la base de données

```bash
cd backend
sqlite3 running_tracker.db

# Quelques requêtes utiles :
SELECT COUNT(*) FROM workouts;
SELECT COUNT(*) FROM suggestions WHERE completed = 0;
SELECT COUNT(*) FROM personal_records;
SELECT * FROM suggestions WHERE scheduled_date IS NOT NULL LIMIT 5;
```

### Test rapide de connexion iCloud

```bash
cd backend
source venv/bin/activate
python -c "
from services.icloud_calendar_sync import iCloudCalendarSync
sync = iCloudCalendarSync()
if sync.connect():
    print('✅ iCloud OK')
else:
    print('❌ iCloud FAILED')
"
```

---

## 🐛 Dépannage

### Le health check échoue

**Problème** : ANTHROPIC_API_KEY manquante
```bash
# Vérifier .env
cat backend/.env | grep ANTHROPIC_API_KEY

# Si manquante, ajouter :
echo "ANTHROPIC_API_KEY=sk-ant-api03-..." >> backend/.env
```

**Problème** : Base de données corrompue
```bash
# Backup puis réinitialiser
mv backend/running_tracker.db backend/running_tracker.db.backup
cd backend
python -c "from database import init_db; init_db()"
```

**Problème** : iCloud Calendar erreur "Unauthorized"
- Génère un nouveau mot de passe d'application sur https://appleid.apple.com
- Voir `ICLOUD_SETUP.md` pour les instructions détaillées

### Les tests manuels échouent

**Import Apple Health ne fonctionne pas** :
- Vérifie que `export.xml` est valide (pas vide, format XML correct)
- Logs : `grep "import" /tmp/backend.log`

**Suggestions AI ne se génèrent pas** :
- Vérifie l'API Anthropic : `python scripts/quick_health_check.py`
- Vérifie qu'il y a au moins quelques courses en base

**Calendrier ne synchronise pas** :
- Run : `python scripts/quick_health_check.py` (section iCloud)
- Vérifie qu'il y a des suggestions planifiées en base
- Logs : `tail -50 /tmp/backend.log | grep calendar`

---

## 🔄 Workflow de Release

### Avant chaque commit important

1. **Run health check** :
   ```bash
   python scripts/quick_health_check.py
   ```

2. **Teste ta feature manuellement** dans le navigateur

3. **Vérifie les logs** pour des erreurs :
   ```bash
   tail -100 /tmp/backend.log | grep ERROR
   ```

### Avant chaque release (tag Git)

1. **Full health check** :
   ```bash
   python scripts/quick_health_check.py
   ```

2. **Suis la roadmap complète** : `TESTING_ROADMAP.md`

3. **Met à jour CHANGELOG.md** avec les nouvelles features

4. **Commit et tag** :
   ```bash
   git add .
   git commit -m "Release v1.x.x - Description des changements"
   git tag v1.x.x
   git push origin main --tags
   ```

---

## 📊 Statistiques Actuelles

Tu peux voir l'état de ta base à tout moment :

```bash
cd backend
source venv/bin/activate
python -c "
from database import SessionLocal
from models import Workout, Suggestion, PersonalRecord, User

db = SessionLocal()
print(f'👤 Utilisateurs : {db.query(User).count()}')
print(f'🏃 Courses : {db.query(Workout).count()}')
print(f'🤖 Suggestions : {db.query(Suggestion).count()}')
print(f'🏆 Records : {db.query(PersonalRecord).count()}')
db.close()
"
```

---

## 🎯 Tests Automatisés (TODO)

À terme, on pourrait créer des tests automatisés avec :
- **Backend** : pytest pour tester les endpoints API
- **Frontend** : Playwright pour tester l'interface
- **CI/CD** : GitHub Actions pour tester automatiquement à chaque push

Exemple de structure :
```
backend/tests/
  - test_workouts.py
  - test_suggestions.py
  - test_calendar_sync.py
  - test_records.py

frontend/tests/
  - dashboard.spec.ts
  - suggestions.spec.ts
  - workouts.spec.ts
```

---

**Date de création** : 2025-11-01
**Dernière mise à jour** : 2025-11-01
**Version de l'app** : v1.3.0
