# Synchronisation Calendrier

## Vue d'ensemble

La fonctionnalité de synchronisation calendrier permet d'exporter les suggestions d'entraînement vers des applications de calendrier externes (Apple Calendar, Google Calendar, etc.) au format iCal (.ics).

## Fonctionnalités

### Backend

1. **Modèle UserPreferences** (`backend/models.py`)
   - Stocke les préférences utilisateur pour la planification des entraînements
   - Champs:
     - `preferred_days`: Jours préférés pour s'entraîner (ex: ["tuesday", "thursday", "saturday"])
     - `preferred_time`: Heure préférée (ex: "18:00")
     - `calendar_sync_enabled`: Active/désactive la synchronisation
     - `reminder_minutes`: Rappels avant l'événement (ex: [15, 60, 1440])

2. **Service Calendar** (`backend/services/calendar.py`)
   - `generate_ics_file()`: Génère un fichier iCal avec plusieurs suggestions
   - `generate_ics_for_suggestion()`: Génère un fichier iCal pour une seule suggestion
   - `get_next_preferred_day()`: Calcule le prochain jour préféré
   - `estimate_duration()`: Estime la durée de la séance selon le type et la distance

3. **Endpoints API** (`backend/routers/calendar.py`)
   - `GET /api/preferences`: Récupère les préférences utilisateur
   - `PATCH /api/preferences`: Met à jour les préférences
   - `GET /api/calendar/export.ics`: Télécharge toutes les suggestions récentes
   - `GET /api/calendar/suggestion/{id}.ics`: Télécharge une suggestion spécifique
   - `GET /api/calendar/webcal`: Obtient l'URL d'abonnement webcal

### Frontend

1. **Page Paramètres** (`frontend/app/settings/page.tsx`)
   - Interface de configuration des préférences
   - Sélection des jours préférés
   - Configuration de l'heure préférée
   - Choix des rappels
   - Bouton de téléchargement du fichier .ics
   - Instructions d'installation pour différentes applications

2. **Hook usePreferences** (`frontend/hooks/usePreferences.ts`)
   - Gestion de l'état des préférences
   - `fetchPreferences()`: Charge les préférences
   - `updatePreferences()`: Met à jour les préférences

3. **Composant CalendarExportButton** (`frontend/components/CalendarExportButton.tsx`)
   - `CalendarExportButton`: Bouton pour exporter une suggestion
   - `CalendarDownloadAllButton`: Bouton pour télécharger toutes les suggestions

## Utilisation

### Configuration des préférences

1. Accéder à la page Paramètres via la navigation
2. Activer la synchronisation calendrier
3. Sélectionner les jours préférés pour s'entraîner
4. Choisir l'heure préférée
5. Configurer les rappels souhaités
6. Cliquer sur "Enregistrer les paramètres"

### Export des entraînements

#### Option 1: Export de toutes les suggestions

1. Dans la page Paramètres, cliquer sur "Télécharger .ics"
2. Le fichier contient toutes les suggestions récentes (non complétées)
3. Les séances sont planifiées selon les jours et heures préférés

#### Option 2: Export d'une suggestion spécifique

1. Sur une carte de suggestion, cliquer sur "Ajouter au calendrier"
2. La suggestion est planifiée pour le lendemain à l'heure préférée

### Import dans un calendrier

#### Apple Calendar

1. Télécharger le fichier .ics
2. Double-cliquer sur le fichier
3. Sélectionner le calendrier de destination
4. Confirmer l'import

#### Google Calendar

1. Télécharger le fichier .ics
2. Aller sur calendar.google.com
3. Cliquer sur l'icône d'engrenage > Paramètres
4. Dans "Importer et exporter", cliquer sur "Importer"
5. Sélectionner le fichier .ics

#### Abonnement calendrier (WebCal)

Pour une mise à jour automatique:

1. Cliquer sur "Infos abonnement calendrier" dans la page Paramètres
2. Copier l'URL webcal ou http
3. Ajouter l'abonnement dans votre application de calendrier

**Note**: L'URL d'abonnement nécessite que le backend soit accessible publiquement pour fonctionner correctement.

## Format iCal

Chaque événement calendrier contient:

- **Titre**: Type de séance + distance (ex: "VMA - 8km")
- **Date/Heure**: Calculée selon les préférences
- **Durée**: Estimée automatiquement selon le type et la distance
- **Description**: Structure détaillée (échauffement, séries, retour au calme)
- **Localisation**: "Course à pied"
- **Rappels**: Configurables (15 min, 1h, 1 jour, etc.)

## Structure des fichiers

```
backend/
├── models.py                    # Modèle UserPreferences
├── schemas.py                   # Schémas Pydantic pour les préférences
├── routers/
│   └── calendar.py             # Routes API calendrier
└── services/
    └── calendar.py             # Logique de génération iCal

frontend/
├── app/
│   └── settings/
│       └── page.tsx            # Page de paramètres
├── components/
│   ├── CalendarExportButton.tsx # Composants d'export
│   └── ui/
│       └── switch.tsx          # Composant Switch
└── hooks/
    └── usePreferences.ts       # Hook de gestion des préférences
```

## Dépendances

### Backend
- `icalendar==5.0.11`: Génération de fichiers iCal

### Frontend
- `@radix-ui/react-switch`: Composant Switch pour l'interface

## Tests

Pour tester la fonctionnalité:

1. Démarrer le backend: `cd backend && python main.py`
2. Démarrer le frontend: `cd frontend && npm run dev`
3. Accéder à http://localhost:3000/settings
4. Générer des suggestions via `/suggestions`
5. Configurer les préférences et télécharger le fichier .ics
6. Importer dans un calendrier pour vérifier

## Améliorations futures

- Support de la timezone utilisateur (actuellement UTC)
- Abonnement calendrier avec authentification
- Mise à jour automatique du calendrier
- Support de plusieurs utilisateurs
- Personnalisation avancée des événements (couleurs, catégories)
- Notifications push pour les rappels
