# Testing Roadmap - Suivi Run App

Cette roadmap permet de tester l'ensemble des fonctionnalités de l'application avant chaque release pour s'assurer que rien n'a pété.

## 📋 Checklist de Tests Pré-Release

### 1. 🏥 Health Check Basique

**Objectif** : Vérifier que l'application démarre correctement

- [ ] Backend démarre sans erreur : `cd backend && source venv/bin/activate && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- [ ] Frontend démarre sans erreur : `cd frontend && npm run dev`
- [ ] Page d'accueil charge : http://localhost:3000
- [ ] API docs accessible : http://localhost:8000/docs
- [ ] Aucune erreur dans les logs au démarrage

---

### 2. 📊 Dashboard

**Objectif** : Vérifier l'affichage des statistiques et métriques

#### Tests de Base
- [ ] Dashboard s'affiche sans erreur : http://localhost:3000
- [ ] Les statistiques principales s'affichent (distance totale, nombre de courses, etc.)
- [ ] Les graphiques se chargent correctement

#### Tests avec Données
- [ ] Stats mensuelles affichent les données des 12 derniers mois
- [ ] Graphique de progression montre l'évolution
- [ ] Charge de travail (7j/28j ratio) s'affiche
- [ ] Volume progression alerts s'affichent si pertinent

#### Tests d'Edge Cases
- [ ] Dashboard fonctionne sans données (nouvel utilisateur)
- [ ] Dashboard fonctionne avec 1 seule course
- [ ] Dashboard fonctionne avec beaucoup de courses (100+)

---

### 3. 📥 Import Apple Health

**Objectif** : Vérifier l'import de données depuis Apple Health

#### Tests d'Import Manuel
- [ ] Bouton "Importer depuis Apple Health" visible sur le dashboard
- [ ] Sélection du fichier `export.xml` fonctionne
- [ ] Import se lance et affiche la progression
- [ ] Message de succès avec le nombre de courses importées
- [ ] Les courses apparaissent dans la liste après import

#### Tests d'Auto-Import (iCloud Drive)
- [ ] Vérifier que le fichier est copié dans `~/Library/Mobile Documents/com~apple~CloudDocs/apple_health_auto/export.xml`
- [ ] Le backend détecte automatiquement le fichier
- [ ] Import automatique se fait toutes les 24h
- [ ] Logs montrent l'auto-import : `grep "auto-import" /tmp/backend.log`

#### Tests de Validation
- [ ] Fichier invalide retourne une erreur explicite
- [ ] Fichier vide retourne une erreur explicite
- [ ] Import avec doublons ne crée pas de duplicatas

---

### 4. 🏃 Liste des Courses (Workouts)

**Objectif** : Vérifier l'affichage et la gestion des courses

#### Tests d'Affichage
- [ ] Page workouts accessible : http://localhost:3000/workouts
- [ ] Liste des courses s'affiche avec toutes les colonnes (date, distance, durée, allure, etc.)
- [ ] Tri par colonne fonctionne (date, distance, durée)
- [ ] Pagination fonctionne si beaucoup de courses
- [ ] Filtres fonctionnent (par type, par période)

#### Tests de Détails
- [ ] Clic sur une course ouvre la page de détails
- [ ] Tous les détails s'affichent (GPX, stats, graphiques)
- [ ] Carte GPX s'affiche si disponible
- [ ] Graphique d'allure s'affiche
- [ ] Graphique de fréquence cardiaque s'affiche si disponible

#### Tests de Modifications
- [ ] Bouton "Éditer" fonctionne
- [ ] Modification de la distance fonctionne
- [ ] Modification du type de course fonctionne
- [ ] Suppression d'une course fonctionne (avec confirmation)

---

### 5. 🏆 Records Personnels (PRs)

**Objectif** : Vérifier le calcul et l'affichage des records

#### Tests de Calcul
- [ ] Page PRs accessible : http://localhost:3000/records
- [ ] Records par distance s'affichent (1km, 5km, 10km, 21km, 42km)
- [ ] Records par segment (best efforts) s'affichent
- [ ] Historique des records s'affiche
- [ ] Graphique d'évolution des records s'affiche

#### Tests de Validation
- [ ] Nouveau record est détecté automatiquement après import
- [ ] Record battu met à jour l'ancien record dans l'historique
- [ ] Records impossibles ne sont pas comptés (allure < 2 min/km ou > 10 min/km)

#### Tests de Segments
- [ ] Segments GPX extraits automatiquement des courses
- [ ] Best efforts calculés pour 400m, 1km, 1mile, 5km, 10km
- [ ] Clic sur un segment montre les détails (date, allure, position dans la course)

---

### 6. 🤖 Suggestions AI (Claude)

**Objectif** : Vérifier la génération de suggestions d'entraînement

#### Tests de Génération
- [ ] Page suggestions accessible : http://localhost:3000/suggestions
- [ ] Bouton "Générer suggestions" fonctionne
- [ ] 3 suggestions sont générées (facile, tempo, intervalle)
- [ ] Chaque suggestion contient : type, distance, allure cible, structure, raison
- [ ] Les suggestions sont cohérentes avec l'historique récent

#### Tests de Planification
- [ ] Bouton "Planifier" sur une suggestion fonctionne
- [ ] Calendrier s'ouvre pour choisir une date/heure
- [ ] Sauvegarde de la date planifiée fonctionne
- [ ] Badge "Planifiée" s'affiche sur la suggestion
- [ ] Date planifiée s'affiche correctement

#### Tests de Complétion
- [ ] Bouton "Marquer comme réalisée" fonctionne
- [ ] Modal de sélection de course s'ouvre
- [ ] Lien entre suggestion et course réelle fonctionne
- [ ] Badge "Réalisée" s'affiche
- [ ] Suggestion disparaît de la liste active

---

### 7. 📅 Synchronisation Calendrier (iCloud)

**Objectif** : Vérifier la synchronisation avec Apple Calendar

#### Tests de Configuration
- [ ] Fichier `.env` contient `ICLOUD_USERNAME` et `ICLOUD_PASSWORD`
- [ ] Mot de passe d'application iCloud valide (généré sur appleid.apple.com)
- [ ] Test de connexion réussit : `venv/bin/python -c "from services.icloud_calendar_sync import iCloudCalendarSync; sync = iCloudCalendarSync(); print('✅ OK' if sync.connect() else '❌ FAIL')"`

#### Tests de Synchronisation
- [ ] Bouton "Synchroniser calendrier" visible sur page suggestions
- [ ] Clic sur le bouton lance la synchronisation
- [ ] Message de succès avec nombre de séances ajoutées
- [ ] Événement apparaît dans Apple Calendar (calendrier "Entraînements Course")
- [ ] Événement contient : titre, date/heure, durée, allure cible, structure
- [ ] Rappel 30 minutes avant la séance fonctionne

#### Tests de Gestion
- [ ] Re-synchronisation ne crée pas de doublons (suggestions déjà synchronisées sont skippées)
- [ ] Suppression de suggestion supprime l'événement du calendrier (TODO: à implémenter)
- [ ] Modification de date planifiée met à jour l'événement (TODO: à implémenter)

#### Tests d'Erreurs
- [ ] Mauvais identifiants retournent une erreur claire
- [ ] Perte de connexion internet retourne une erreur claire
- [ ] Logs détaillés en cas d'erreur : `tail -50 /tmp/backend.log | grep calendar`

---

### 8. 🔗 Intégration Strava (Optionnel)

**Objectif** : Vérifier la connexion et l'import depuis Strava

#### Tests de Connexion
- [ ] Bouton "Connecter Strava" visible
- [ ] OAuth flow fonctionne (redirection vers Strava)
- [ ] Callback retourne bien sur l'app après autorisation
- [ ] Token Strava sauvegardé

#### Tests d'Import
- [ ] Import des activités Strava fonctionne
- [ ] Activités apparaissent dans la liste des courses
- [ ] Pas de doublons si déjà importé depuis Apple Health

---

### 9. 🔐 Sécurité

**Objectif** : Vérifier la sécurité de l'application

#### Tests de Base
- [ ] `.env` n'est pas commité sur Git (vérifié dans `.gitignore`)
- [ ] API keys (Anthropic, Strava) ne sont pas exposées dans le frontend
- [ ] Pas de secrets dans les logs
- [ ] CORS configuré correctement (seulement localhost en dev)

#### Tests d'Injection
- [ ] SQL Injection impossible (SQLAlchemy ORM protège)
- [ ] XSS impossible (React échappe automatiquement)
- [ ] Upload de fichiers validé (seulement `.xml` pour Apple Health)

---

### 10. ⚡ Performance

**Objectif** : Vérifier que l'app reste rapide

#### Tests de Chargement
- [ ] Dashboard charge en < 2 secondes
- [ ] Liste des courses charge en < 1 seconde (avec 100+ courses)
- [ ] Import Apple Health traite 100 courses en < 10 secondes
- [ ] Génération de suggestions AI en < 5 secondes

#### Tests de Mémoire
- [ ] Backend n'utilise pas trop de RAM (< 500 MB)
- [ ] Pas de memory leaks après plusieurs imports
- [ ] Base de données reste petite (< 100 MB pour 1000 courses)

---

### 11. 🐛 Tests de Régression

**Objectif** : Vérifier que les anciennes fonctionnalités marchent toujours

#### Tests Critiques
- [ ] Import Apple Health ne casse pas après ajout de nouvelles features
- [ ] Calcul des records reste correct après modifications
- [ ] Dashboard affiche toujours les bonnes stats
- [ ] API endpoints retournent les bons codes HTTP (200, 404, 500)

---

## 🚀 Workflow de Test

### Avant Chaque Release

1. **Clean slate** : Supprimer la base de données et repartir de zéro
   ```bash
   rm backend/running_tracker.db
   cd backend && source venv/bin/activate && python -c "from database import init_db; init_db()"
   ```

2. **Lancer l'app** :
   ```bash
   # Terminal 1 : Backend
   cd backend && source venv/bin/activate && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1

   # Terminal 2 : Frontend
   cd frontend && npm run dev
   ```

3. **Suivre la roadmap** : Cocher chaque item de la checklist ci-dessus

4. **Vérifier les logs** :
   ```bash
   tail -100 /tmp/backend.log | grep -E "(ERROR|WARNING)"
   ```

5. **Tests automatisés** (TODO: à créer) :
   ```bash
   cd backend && pytest tests/
   ```

---

## 🔧 Outils Utiles

### Vérifier la base de données
```bash
sqlite3 backend/running_tracker.db "SELECT COUNT(*) FROM workouts;"
sqlite3 backend/running_tracker.db "SELECT COUNT(*) FROM suggestions WHERE completed = 0;"
sqlite3 backend/running_tracker.db "SELECT COUNT(*) FROM personal_records;"
```

### Nettoyer les logs
```bash
echo "" > /tmp/backend.log
```

### Test de connexion iCloud
```bash
cd backend && source venv/bin/activate
python -c "
from services.icloud_calendar_sync import iCloudCalendarSync
sync = iCloudCalendarSync()
if sync.connect():
    print('✅ Connexion iCloud OK')
else:
    print('❌ Connexion iCloud FAILED')
"
```

### Générer des données de test
```bash
# TODO: Créer un script populate_test_data.py
cd backend && python scripts/populate_test_data.py
```

---

## 📝 Notes

- **Fréquence** : Exécuter cette roadmap avant chaque commit important ou release
- **Durée estimée** : 30-45 minutes pour une exécution complète
- **Automatisation** : Certains tests pourraient être automatisés avec Pytest + Playwright
- **CI/CD** : À terme, intégrer dans GitHub Actions pour tests automatiques à chaque push

---

## ✅ Release Checklist

Avant de considérer une version comme "stable" :

- [ ] Tous les tests de la roadmap passent
- [ ] Aucune erreur dans les logs
- [ ] README.md à jour avec les nouvelles features
- [ ] CHANGELOG.md mis à jour
- [ ] Git commit avec message descriptif
- [ ] Tag de version créé : `git tag v1.x.x`
- [ ] Push sur GitHub : `git push origin main --tags`

---

**Date de dernière mise à jour** : 2025-11-01
**Version de l'app** : v1.3.0 (avec iCloud Calendar sync)
