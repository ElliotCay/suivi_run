# Plans d'Entraînement Multi-Semaines - Documentation

## Vue d'ensemble

Le système de plans d'entraînement permet de créer des programmes structurés de 8-12 semaines avec périodisation automatique générée par Claude AI.

## Architecture

### Modèles de données

#### TrainingPlan
Plan d'entraînement principal contenant:
- `goal_type`: Objectif (5km, 10km, semi, marathon)
- `weeks_count`: Durée du plan (8-12 semaines)
- `current_level`: Niveau actuel (beginner, intermediate, advanced)
- `target_date`: Date de l'objectif
- `status`: Statut (active, completed, paused, abandoned)

#### TrainingWeek
Semaine d'entraînement contenant:
- `week_number`: Numéro de la semaine (1-12)
- `phase`: Phase de périodisation (base, build, peak, taper)
- `description`: Objectif de la semaine
- `status`: Statut (pending, in_progress, completed)

#### TrainingSession
Séance individuelle contenant:
- `day_of_week`: Jour de la séance (Lundi, Jeudi, Dimanche)
- `workout_type`: Type (facile, tempo, fractionne, longue)
- `distance`: Distance en km
- `pace_target`: Allure cible (ex: "6:00/km" ou "5:30-5:40/km")
- `structure`: Structure détaillée (Échauffement, Corps, Retour au calme)
- `reasoning`: Justification de la séance
- `status`: Statut (pending, completed, skipped)

## Endpoints API

### POST /api/training-plans
Créer un nouveau plan d'entraînement.

**Request:**
```json
{
  "goal_type": "semi",
  "target_date": "2026-03-15T00:00:00",
  "current_level": "intermediate",
  "weeks_count": 8,
  "use_sonnet": true
}
```

**Response:** Plan complet avec toutes les semaines et séances générées

### GET /api/training-plans
Récupérer tous les plans d'entraînement.

**Query params:**
- `status` (optionnel): Filtrer par statut (active, completed, etc.)

**Response:** Liste des plans avec pourcentage de progression

### GET /api/training-plans/{plan_id}
Récupérer les détails complets d'un plan.

**Response:** Plan avec toutes les semaines et séances

### PATCH /api/training-plans/{plan_id}
Mettre à jour un plan (nom, statut, date cible).

**Request:**
```json
{
  "name": "Nouveau nom",
  "status": "paused",
  "target_date": "2026-04-01T00:00:00"
}
```

### DELETE /api/training-plans/{plan_id}
Supprimer un plan (supprime aussi toutes les semaines et séances).

### PATCH /api/training-plans/{plan_id}/weeks/{week_number}
Mettre à jour une semaine spécifique.

**Request:**
```json
{
  "status": "completed",
  "description": "Semaine de récupération ajustée"
}
```

### PATCH /api/training-plans/{plan_id}/sessions/{session_id}
Mettre à jour une séance (marquer comme complétée, etc.).

**Request:**
```json
{
  "status": "completed",
  "completed_workout_id": 123
}
```

### POST /api/training-plans/{plan_id}/adapt
Adapter le plan en fonction des séances manquées et du feedback utilisateur.

**Request:**
```json
{
  "user_feedback": "Je me sens très fatigué ces derniers temps"
}
```

**Response:** Recommandations d'adaptation générées par Claude

## Périodisation

Les plans suivent une périodisation classique:

### Phase BASE (30% du plan)
- Focus: Endurance fondamentale
- Volume: Construction progressive
- Intensité: 80% facile, 20% qualité légère
- Objectif: Construire la base aérobie

### Phase BUILD (40% du plan)
- Focus: Introduction de l'intensité
- Volume: Maintien ou légère augmentation
- Intensité: 70% facile, 30% qualité (tempo, seuil, VMA)
- Objectif: Développer la vitesse de course

### Phase PEAK (20% du plan)
- Focus: Intensité maximale
- Volume: Maintien
- Intensité: 60% facile, 40% qualité spécifique
- Objectif: Affûtage pour l'objectif

### Phase TAPER (10% du plan)
- Focus: Récupération et fraîcheur
- Volume: -30-50% par rapport au pic
- Intensité: Maintien des allures mais réduction du volume
- Objectif: Arriver frais le jour J

## Règles d'entraînement

Le système respecte automatiquement:
- Maximum +10% de progression de volume par semaine
- 3 séances par semaine (facile, qualité, longue)
- Toujours 1 jour de repos entre les runs
- Semaine de récupération toutes les 3-4 semaines (-20% volume)
- Mix équilibré des types de séances

## Types de séances

### Facile
- Allure conversationnelle
- Récupération active
- Construction du volume

### Tempo
- Allure seuil (environ 80-85% FCM)
- Amélioration de l'endurance à haute intensité
- Durée: 20-40 minutes

### Fractionné
- Intervalles courts/moyens à haute intensité
- Amélioration VMA et économie de course
- Exemples: 10x400m, 5x1000m

### Longue
- Sortie longue en endurance
- Adaptation mentale et physique à la durée
- Distance progressive selon l'objectif

## Service IA

### generate_training_plan()
Génère un plan complet via Claude avec:
- Analyse du profil utilisateur
- Prise en compte de l'historique récent
- Périodisation adaptée à l'objectif
- Progression logique du volume et de l'intensité

### adapt_training_plan()
Adapte un plan existant en fonction de:
- Séances manquées/sautées
- Feedback utilisateur (fatigue, forme, blessure)
- Maintien de la cohérence globale
- Ajustements progressifs

## Tests

Pour tester l'API:

```bash
# 1. Démarrer le serveur
cd backend
source venv/bin/activate
python main.py

# 2. Dans un autre terminal, lancer les tests
cd backend
source venv/bin/activate
python test_training_plan.py
```

## Utilisation recommandée

1. **Créer un plan**: POST /api/training-plans avec objectif et durée
2. **Consulter régulièrement**: GET /api/training-plans/{id} pour voir la semaine en cours
3. **Marquer les séances**: PATCH sessions quand complétées/sautées
4. **Adapter si nécessaire**: POST /api/training-plans/{id}/adapt en cas de problème
5. **Suivre la progression**: Calculée automatiquement via les semaines complétées

## Prochaines étapes (Frontend)

Pour compléter l'implémentation, créer:

1. **Page /training-plans**
   - Liste des plans (actifs/passés)
   - Progress bar pour chaque plan
   - Bouton "Créer nouveau plan"

2. **Page /training-plans/create**
   - Formulaire: objectif, date cible, niveau, durée
   - Bouton "Générer le plan" (appelle l'API)

3. **Page /training-plans/[id]**
   - Vue calendrier 8-12 semaines
   - Semaine courante mise en avant
   - Séances cliquables pour détails
   - Bouton "Adapter le plan"

4. **Composants**
   - `TrainingPlanCard`: Affiche un plan dans la liste
   - `WeekCalendar`: Calendrier hebdo avec séances
   - `SessionDetailModal`: Détail d'une séance + bouton "Marquer comme fait"
   - `AdaptPlanDialog`: Formulaire d'adaptation avec feedback

## Structure des données retournées

Voir `/backend/schemas.py` pour les schémas Pydantic complets:
- `TrainingPlanResponse`: Plan avec toutes les relations
- `TrainingWeekResponse`: Semaine avec ses séances
- `TrainingSessionResponse`: Détail d'une séance
- `TrainingPlanListResponse`: Vue liste avec progression

## Notes importantes

- Les plans sont liés à l'utilisateur (user_id)
- La suppression d'un plan supprime en cascade les semaines et séances
- Le statut des séances influence le calcul de progression
- Les dates sont calculées automatiquement à partir de la date de création
- Le système utilise Claude Sonnet 4.5 par défaut pour la meilleure qualité
