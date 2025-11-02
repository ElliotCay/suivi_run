# Release Notes - v1.3.0

**Date** : 2025-11-01
**Titre** : Synchronisation iCloud Calendar + Testing Framework

---

## 🎉 Nouveautés

### ☁️ Synchronisation iCloud Calendar (Feature Majeure)

L'application peut maintenant synchroniser automatiquement les séances planifiées avec **Apple Calendar** via CalDAV !

**Ce qui fonctionne** :
- ✅ Connexion directe à iCloud Calendar (pas de fichier .ics à télécharger)
- ✅ Création automatique d'un calendrier "Entraînements Course"
- ✅ Synchronisation en un clic depuis la page Suggestions
- ✅ Chaque événement contient :
  - Titre : Type de séance + distance (ex: "🏃 Facile - 6.0km")
  - Date/heure planifiée
  - Durée estimée (~6.5 min/km)
  - Allure cible
  - Structure détaillée (échauffement, corps, retour au calme)
  - Rappel 30 minutes avant
- ✅ Évite les doublons (suggestions déjà synchronisées sont skippées)
- ✅ UID unique pour chaque séance

**Configuration** :
- Voir `ICLOUD_SETUP.md` pour générer un mot de passe d'application
- Variables d'environnement dans `.env` :
  - `ICLOUD_USERNAME` : email iCloud
  - `ICLOUD_PASSWORD` : mot de passe d'application (pas le mot de passe iCloud)

**Fichiers créés** :
- `backend/services/icloud_calendar_sync.py` : Service de synchronisation CalDAV
- `backend/ICLOUD_SETUP.md` : Guide de configuration détaillé

**Logs verbeux** :
- Tous les détails de synchronisation sont loggés pour faciliter le débogage
- Exemple : création d'événement, connexion, erreurs, etc.

---

### 🧪 Framework de Tests

Ajout d'outils pour tester l'application avant chaque release :

#### 1. **Testing Roadmap** (`TESTING_ROADMAP.md`)
Checklist complète de 11 sections pour tester manuellement toutes les fonctionnalités :
1. Health Check Basique
2. Dashboard
3. Import Apple Health
4. Liste des Courses
5. Records Personnels
6. Suggestions AI
7. Synchronisation Calendrier
8. Intégration Strava (optionnel)
9. Sécurité
10. Performance
11. Tests de Régression

**Durée estimée** : 30-45 minutes pour tout tester

#### 2. **Health Check Automatique** (`backend/scripts/quick_health_check.py`)
Script Python qui vérifie automatiquement :
- Variables d'environnement (.env configuré correctement)
- Base de données accessible et statistiques
- Connexion iCloud Calendar
- API Anthropic fonctionnelle
- Dépendances installées
- Fichiers critiques présents

**Usage** :
```bash
cd backend
source venv/bin/activate
python scripts/quick_health_check.py
```

**Output** :
```
============================================================
🏥 HEALTH CHECK - Suivi Run App
============================================================
🔍 Vérification des variables d'environnement...
  ✅ ANTHROPIC_API_KEY configurée
  ✅ ICLOUD_USERNAME configurée
  ...

============================================================
📊 RÉSUMÉ
============================================================
✅ Environnement
✅ Fichiers
✅ Dépendances
✅ Base de données
✅ iCloud Calendar
✅ API Anthropic
============================================================
🎉 Tous les checks sont OK ! L'application est prête.
```

#### 3. **Testing README** (`TESTING_README.md`)
Guide d'utilisation des outils de test avec :
- Quick start (health check rapide)
- Commandes utiles (logs, database, iCloud test)
- Dépannage
- Workflow de release

---

## 🐛 Corrections de Bugs

### iCloud Calendar Sync
- **Bug** : Code utilisait `calendar_uid` mais la base de données utilise `calendar_event_id`
  - **Fix** : Renommé tous les attributs pour correspondre au modèle
- **Bug** : Serveur tournait avec Python système au lieu du venv
  - **Fix** : Redémarré avec `source venv/bin/activate`
- **Bug** : Modules caldav/icalendar non installés initialement
  - **Fix** : Ajoutés dans `requirements.txt`

### Health Check Script
- **Bug** : Import de `STRAVA_CLIENT_ID` qui n'existe pas dans config.py
  - **Fix** : Utilisé `os.getenv()` directement
- **Bug** : Modèle Claude obsolète dans les tests
  - **Fix** : Utilisé `claude-sonnet-4-5-20250929` (modèle actuel de l'app)
- **Bug** : `gpxpy` manquant marqué comme critique
  - **Fix** : Marqué comme dépendance optionnelle

---

## 📝 Documentation

Nouveaux fichiers de documentation :
- `ICLOUD_SETUP.md` : Configuration iCloud Calendar étape par étape
- `TESTING_ROADMAP.md` : Checklist complète de tests manuels
- `TESTING_README.md` : Guide d'utilisation des outils de test
- `RELEASE_NOTES_v1.3.0.md` : Ce fichier

---

## 🔧 Améliorations Techniques

### Logging
- Ajout de logs ultra-détaillés dans `icloud_calendar_sync.py` avec emojis :
  - 🔄 Début/fin de synchronisation
  - 📊 Nombre de suggestions trouvées
  - 🔧 Détails de création d'événement
  - ☁️ Envoi vers iCloud
  - ✅ Succès / ❌ Erreurs

### Error Handling
- Gestion d'erreurs améliorée dans la synchronisation calendrier
- Messages d'erreur plus explicites pour l'utilisateur
- Distinction entre erreurs critiques et warnings

---

## 🚀 Utilisation

### Synchroniser avec Apple Calendar

1. Configure iCloud (une seule fois) :
   - Génère un mot de passe d'app sur https://appleid.apple.com
   - Ajoute-le dans `backend/.env`
   - Voir `ICLOUD_SETUP.md` pour les détails

2. Planifie une séance :
   - Va sur http://localhost:3000/suggestions
   - Génère des suggestions AI
   - Clique sur "Planifier" et choisis une date/heure

3. Synchronise :
   - Clique sur "Synchroniser calendrier"
   - L'événement apparaît dans Apple Calendar (calendrier "Entraînements Course")

### Tester l'application

**Quick check** (30 sec) :
```bash
cd backend && source venv/bin/activate
python scripts/quick_health_check.py
```

**Full test** (30-45 min) :
- Suis `TESTING_ROADMAP.md`

---

## 📊 Statistiques

**Lignes de code ajoutées** : ~800 lignes
- `icloud_calendar_sync.py` : ~300 lignes
- `quick_health_check.py` : ~250 lignes
- Documentation : ~250 lignes

**Fichiers modifiés** : 5
- `backend/services/icloud_calendar_sync.py` (NEW)
- `backend/routers/suggestions.py` (ajout endpoint sync)
- `backend/scripts/quick_health_check.py` (NEW)
- `frontend/app/suggestions/page.tsx` (bouton sync)
- `backend/requirements.txt` (dépendances caldav/icalendar)

**Fichiers de documentation créés** : 4
- `ICLOUD_SETUP.md`
- `TESTING_ROADMAP.md`
- `TESTING_README.md`
- `RELEASE_NOTES_v1.3.0.md`

---

## 🎯 TODO / Améliorations Futures

### Synchronisation Calendrier
- [ ] Mise à jour automatique d'événements déjà synchronisés
- [ ] Suppression d'événement si suggestion annulée
- [ ] Support de plusieurs calendriers
- [ ] Synchronisation bidirectionnelle (détecter changements dans Apple Calendar)

### Tests
- [ ] Tests automatisés avec pytest (backend)
- [ ] Tests E2E avec Playwright (frontend)
- [ ] Intégration CI/CD avec GitHub Actions
- [ ] Script de génération de données de test

### Documentation
- [ ] Vidéo de démo de la synchronisation calendrier
- [ ] FAQ pour les problèmes courants
- [ ] Guide de contribution pour futurs développeurs

---

## 🙏 Crédits

**Développé par** : Claude (Anthropic) & Elliot
**Date** : 2025-11-01
**Temps de développement** : ~2h (incluant debugging et documentation)

---

## 🔗 Liens Utiles

- Configuration iCloud : `ICLOUD_SETUP.md`
- Tests : `TESTING_README.md` et `TESTING_ROADMAP.md`
- Repo GitHub : (TODO: ajouter URL)
- Issues : (TODO: ajouter URL)

---

**Version précédente** : v1.2.0 (Suggestions AI + Records par segment)
**Prochaine version** : v1.4.0 (TBD - peut-être tests automatisés ou sync bidirectionnel)
