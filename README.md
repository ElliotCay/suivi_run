# 🏃‍♂️ Suivi Run

Application de suivi d'entraînement running avec intelligence artificielle pour la prévention des blessures et l'optimisation de l'entraînement.

## 🎯 Fonctionnalités

- **Import automatique depuis Apple Health** via iCloud Drive
- **Dashboard avec métriques** : volume, allure, fréquence cardiaque
- **Suggestions d'entraînement IA** via Claude (Anthropic)
- **Gestion des records personnels** avec historique
- **Analyse de la charge d'entraînement** (ratio 7j/28j)
- **Alertes de progression** (règle des 10%)

## 🛠️ Stack Technique

### Backend
- **FastAPI** (Python 3.13)
- **SQLAlchemy** (ORM)
- **SQLite** (Base de données)
- **Anthropic Claude API** (Suggestions IA)
- **python-dateutil** pour parsing dates Apple Health

### Frontend
- **Next.js 16.0.0** avec Turbopack
- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** (composants)
- **Recharts** (graphiques)
- **Axios** (HTTP client)

## 🚀 Installation

### Prérequis
- Python 3.13+
- Node.js 18+
- npm ou yarn

### Backend

```bash
cd backend

# Créer l'environnement virtuel
python -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp .env.example .env
# Éditer .env et ajouter votre clé API Anthropic

# Lancer le serveur
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Le backend sera accessible sur `http://localhost:8000`

### Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev
```

Le frontend sera accessible sur `http://localhost:3000`

## 📖 Documentation

- **[TEST_IMPORT_AUTO.md](TEST_IMPORT_AUTO.md)** : Guide d'import automatique Apple Health
- **[roadmap.md](roadmap.md)** : Fonctionnalités à venir
- **[NEXT_STEPS.md](NEXT_STEPS.md)** : Prochaines étapes de développement

## 🔑 Configuration

### Clé API Anthropic

1. Créer un compte sur [console.anthropic.com](https://console.anthropic.com/)
2. Générer une clé API
3. Ajouter la clé dans `backend/.env` :
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

### Import Apple Health

Voir le guide détaillé dans `TEST_IMPORT_AUTO.md`.

**Résumé** :
1. Créer le dossier iCloud Drive : `~/Library/Mobile Documents/com~apple~CloudDocs/AppleHealthExport`
2. Exporter les données depuis l'app Santé sur iPhone
3. Transférer via AirDrop vers le dossier
4. L'import automatique se déclenche toutes les 60 secondes

## 📊 Structure du Projet

```
suivi_run/
├── backend/
│   ├── main.py                 # Point d'entrée FastAPI
│   ├── models.py               # Modèles SQLAlchemy
│   ├── schemas.py              # Schémas Pydantic
│   ├── database.py             # Configuration BDD
│   ├── routers/                # Routes API
│   │   ├── workouts.py
│   │   ├── profile.py
│   │   ├── suggestions.py
│   │   ├── dashboard.py
│   │   ├── records.py
│   │   ├── import_router.py
│   │   └── auto_import.py
│   └── services/               # Services métier
│       ├── claude_service.py
│       ├── import_service.py
│       └── auto_import_service.py
├── frontend/
│   ├── app/                    # Pages Next.js
│   │   ├── page.tsx           # Dashboard
│   │   ├── workouts/
│   │   ├── records/
│   │   ├── suggestions/
│   │   ├── profile/
│   │   └── import/
│   └── components/             # Composants réutilisables
│       ├── ui/                # shadcn/ui
│       └── Navigation.tsx
└── README.md
```

## 🧪 Tests

### Backend
```bash
cd backend
source venv/bin/activate

# Test health check
curl http://localhost:8000/api/health

# Test workouts
curl http://localhost:8000/api/workouts

# Test dashboard
curl http://localhost:8000/api/dashboard/summary
```

### Frontend
Ouvrir `http://localhost:3000` et vérifier :
- ✅ Dashboard charge les données
- ✅ Navigation fonctionne
- ✅ Import Apple Health fonctionne
- ✅ Records personnels sont éditables

## 🎯 Roadmap

Voir [roadmap.md](roadmap.md) pour les fonctionnalités à venir :
- Synchronisation calendrier (iCal)
- Personnalisation des suggestions IA
- Tests automatisés

## 📝 License

Projet personnel - Tous droits réservés

## 🤝 Contribution

Projet personnel en développement.

---

**Développé avec ❤️ pour optimiser l'entraînement running**
