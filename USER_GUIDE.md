# 🏃 Guide Utilisateur - Suivi Running

Application complète de suivi d'entraînement running avec analyse IA et synchronisation calendrier.

## 📋 Table des Matières

- [Démarrage Rapide](#démarrage-rapide)
- [Fonctionnalités](#fonctionnalités)
- [Import Apple Health](#import-apple-health)
- [Dashboard & Métriques](#dashboard--métriques)
- [Suggestions IA](#suggestions-ia)
- [Plans d'Entraînement](#plans-dentraînement)
- [Synchronisation Calendrier](#synchronisation-calendrier)
- [Records Personnels](#records-personnels)
- [FAQ](#faq)

---

## 🚀 Démarrage Rapide

### Installation

1. **Backend (FastAPI)**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Frontend (Next.js)**
   ```bash
   cd frontend
   npm install
   ```

3. **Configuration**
   - Créer un fichier `.env` dans `/backend` :
     ```
     CLAUDE_API_KEY=votre_clé_api_anthropic
     DATABASE_URL=sqlite:///./running_tracker.db
     ```

### Lancement

**Option 1 : Script automatique**
```bash
chmod +x start.sh
./start.sh
```

**Option 2 : Manuel**

Terminal 1 (Backend) :
```bash
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

Terminal 2 (Frontend) :
```bash
cd frontend
npm run dev
```

Ouvrir : http://localhost:3000

---

## ✨ Fonctionnalités

### 1️⃣ Import Apple Health

**Méthode 1 : Upload manuel**
1. Aller dans `/import`
2. Cliquer sur "Upload ZIP"
3. Sélectionner votre fichier `export.zip` depuis Apple Health
4. L'import se fait automatiquement avec détection des doublons

**Méthode 2 : Auto-import depuis iCloud Drive**
1. Exporter vos données Apple Health
2. Placer `export.zip` dans :
   ```
   ~/Library/Mobile Documents/com~apple~CloudDocs/AppleHealthExport/
   ```
3. L'application vérifie toutes les 60 secondes et importe automatiquement
4. Détection intelligente des modifications (pas de re-import inutile)

**Données importées :**
- ✅ Distance, durée, allure moyenne
- ✅ Fréquence cardiaque (moyenne, max)
- ✅ Dénivelé
- ✅ Données GPX (splits, allures, best efforts)
- ✅ Type de séance (facile, tempo, fractionné, longue)

---

### 2️⃣ Dashboard & Métriques

**Page principale** : `/`

**Métriques affichées :**

1. **Volume Hebdomadaire** (8 dernières semaines)
   - Graphique en barres avec progression
   - Détection alertes progression (règle des 10%)
   - Volume moyen sur 4 semaines

2. **Heatmap Calendrier Annuel**
   - Style GitHub contributions
   - Intensité couleur = volume du jour
   - Hover pour détails de la séance
   - Sélecteur d'année

3. **Distribution Types de Séances**
   - Graphique camembert
   - Filtrable par période (30j / 90j / 1an)
   - Pourcentages par type (facile, tempo, fractionné, longue)

4. **Allure vs Fréquence Cardiaque**
   - Scatter plot avec ligne de tendance
   - Détecte amélioration efficience cardiovasculaire
   - Filtrage séances d'endurance uniquement

5. **Progression Records**
   - Courbe temps par distance (5km, 10km, semi, marathon)
   - Évolution dans le temps

6. **Charge d'Entraînement**
   - Ratio 7 jours / 28 jours
   - Zone optimale : 0.8 - 1.3
   - Alertes si charge trop élevée (risque blessure)

**Mode Sombre** : Toggle dans la navigation (persisté)

---

### 3️⃣ Suggestions IA

**Page** : `/suggestions`

**Fonctionnalités :**

1. **Génération de suggestions**
   - Analyse automatique de votre historique (4 dernières semaines)
   - Recommandations personnalisées basées sur :
     - Votre niveau actuel (allure facile, tempo)
     - Volume hebdomadaire cible
     - Objectif principal
     - Historique de blessures
   - Génération via Claude AI (Anthropic)

2. **Types de suggestions**
   - Séance unique (facile, tempo, fractionné, longue)
   - Semaine complète (3 séances cohérentes)

3. **Structure détaillée**
   - Échauffement + Corps de séance + Retour au calme
   - Distance, allure cible, fréquence cardiaque
   - Raisons pédagogiques (pourquoi cette séance)

4. **Marquage séances réalisées**
   - Bouton "Marquer comme fait"
   - Historique des suggestions passées

5. **Export Calendrier**
   - Bouton "Ajouter au calendrier" sur chaque suggestion
   - Génère fichier .ics avec détails complets

---

### 4️⃣ Plans d'Entraînement

**Page** : `/training-plans`

**Création d'un plan :**

1. Cliquer "Créer un Plan"
2. Remplir le formulaire :
   - **Objectif** : 5km, 10km, Semi-marathon, Marathon
   - **Date cible** : Date de votre course
   - **Durée** : 8-12 semaines
   - **Temps cible** (optionnel) : ex. "Sub 2h pour semi"

3. Génération automatique par IA :
   - Périodisation intelligente :
     - **BASE** (30%) : Construction endurance
     - **BUILD** (40%) : Montée en intensité
     - **PEAK** (20%) : Pic de forme
     - **TAPER** (10%) : Affûtage avant course
   - Progression logique du volume et intensité
   - 3 séances par semaine cohérentes

**Suivi du plan :**

1. **Vue calendrier 8-12 semaines**
   - Séances organisées par semaine
   - Code couleur :
     - 🔵 À venir
     - ✅ Fait
     - ❌ Manqué
   - Progression visuelle (% complété)

2. **Adaptation dynamique**
   - Si séance manquée → ajustement semaine suivante
   - Si performance meilleure → progression accélérée
   - Si fatigue détectée (FC élevée) → semaine récup

3. **Export vers calendrier**
   - Toutes les séances du plan exportables
   - Dates/heures configurables

---

### 5️⃣ Synchronisation Calendrier

**Page** : `/settings`

**Configuration :**

1. **Activer la synchronisation**
   - Toggle "Activer sync calendrier"

2. **Jours d'entraînement préférés**
   - Sélectionner vos jours (ex: Mardi, Jeudi, Samedi)

3. **Heure préférée**
   - Définir l'heure de vos séances (ex: 18h00)

4. **Rappels**
   - 15 minutes avant
   - 1 heure avant
   - Veille au soir
   - 2 jours avant

**Méthodes d'export :**

**Option 1 : Téléchargement manuel**
- Bouton "Télécharger .ics"
- Import dans Apple Calendar / Google Calendar

**Option 2 : Abonnement webcal://** (recommandé)
- Copier l'URL fournie
- Ajouter dans votre calendrier
- Mises à jour automatiques

**Compatibilité :**
- ✅ Apple Calendar (macOS, iOS)
- ✅ Google Calendar
- ✅ Outlook
- ✅ Tout client compatible iCal (RFC 5545)

**Contenu des événements :**
- Titre : Type séance + structure (ex: "Séance VMA - 8×400m")
- Description : Détails complets (échauffement, séries, récup)
- Durée estimée : Calculée depuis structure
- Localisation : "Course à pied"
- Rappels configurables

---

### 6️⃣ Records Personnels

**Page** : `/records`

**Fonctionnalités :**

1. **Records actuels**
   - 500m, 1km, 2km, 5km, 10km, Semi, Marathon
   - Date du record
   - Allure moyenne
   - Détails séance

2. **Historique complet**
   - Toutes les tentatives par distance
   - Évolution dans le temps
   - Graphique progression

3. **Mise à jour automatique**
   - Détection automatique lors de l'import
   - Notification si nouveau record

---

## ❓ FAQ

### Comment exporter mes données Apple Health ?

1. Ouvrir l'app **Santé** sur iPhone
2. Onglet **Parcourir** → Icône profil (coin haut-droite)
3. **Exporter toutes les données de santé**
4. Attendre quelques minutes
5. Sauvegarder le fichier `export.zip`

### Pourquoi mes séances ne sont pas importées ?

- Vérifier que ce sont des séances de **course à pied** (HKWorkoutActivityTypeRunning)
- L'export Apple Health doit contenir le fichier `export.xml`
- Vérifier les logs du backend pour erreurs

### Comment obtenir une clé API Claude ?

1. Créer un compte sur https://console.anthropic.com
2. Aller dans **API Keys**
3. Créer une nouvelle clé
4. La copier dans `.env` : `CLAUDE_API_KEY=sk-...`

### L'auto-import ne fonctionne pas ?

Vérifications :
1. Le fichier est bien dans `~/Library/Mobile Documents/com~apple~CloudDocs/AppleHealthExport/export.zip`
2. Le dossier iCloud Drive est synchronisé (vérifier dans Finder)
3. Le backend est lancé (le service tourne en arrière-plan)
4. Vérifier les logs : `tail -f backend/logs/auto_import.log`

### Puis-je utiliser Garmin / Strava ?

Actuellement, seul Apple Health est supporté nativement.

**Workaround** :
1. Synchroniser Garmin/Strava → Apple Health
2. Exporter Apple Health
3. Importer dans l'app

Une intégration directe Strava est prévue dans une future version.

### Comment supprimer mes données ?

Pour réinitialiser la base de données :
```bash
cd backend
rm running_tracker.db
python init_db.py
```

**Attention** : Cela supprime **toutes** vos données (workouts, suggestions, plans).

### Les suggestions IA coûtent-elles cher ?

Non ! Une suggestion coûte ~0.01-0.03$ en tokens Claude (modèle Sonnet 4.5).

Estimation : 100 suggestions ≈ 2-3$

L'app utilise des prompts optimisés pour minimiser les coûts.

### Puis-je partager mes plans avec un coach ?

Pas encore, mais prévu ! Fonctionnalités futures :
- Export PDF du plan d'entraînement
- Partage par lien
- Collaboration coach/athlète

### L'app fonctionne-t-elle hors ligne ?

**Frontend** : Non, requiert connexion (Next.js SSR)

**Backend** : Peut tourner localement hors ligne SAUF pour :
- Suggestions IA (nécessite API Claude)
- Sync calendrier webcal://

### Comment contribuer au projet ?

Le projet est open-source !

1. Fork le repo GitHub
2. Créer une branche feature
3. Soumettre une Pull Request

Contributions bienvenues : bugs, nouvelles features, docs, tests.

---

## 🛠️ Support Technique

**Problèmes courants :**

1. **Erreur 500 lors de l'import**
   - Vérifier format ZIP Apple Health
   - Vérifier espace disque disponible
   - Consulter logs backend

2. **Frontend ne se connecte pas au backend**
   - Vérifier que le backend tourne sur port 8000
   - Vérifier CORS dans `main.py`
   - Essayer http://localhost:3000 (pas 127.0.0.1)

3. **Génération plan échoue**
   - Vérifier `CLAUDE_API_KEY` dans `.env`
   - Vérifier crédits API Anthropic
   - Consulter logs backend

**Logs utiles :**
```bash
# Backend logs
tail -f backend/logs/app.log

# Auto-import logs
tail -f backend/logs/auto_import.log

# Frontend logs (développement)
npm run dev  # Affiche dans terminal
```

---

## 📱 Compatibilité

**Backend :**
- Python 3.13+
- FastAPI 0.115+
- SQLAlchemy 2.0+

**Frontend :**
- Node.js 18+
- Next.js 16+
- React 19+

**Navigateurs :**
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**OS :**
- ✅ macOS (testé sur Ventura+)
- ✅ Linux (Ubuntu 20.04+)
- ✅ Windows 10/11 (via WSL recommandé)

---

## 📝 Notes de Version

### v2.0.0 (Actuelle)

**Nouvelles fonctionnalités :**
- ✅ Plans d'entraînement multi-semaines (8-12 semaines)
- ✅ Synchronisation calendrier (iCal, webcal://)
- ✅ Dashboard refondu (4 nouveaux graphiques)
- ✅ Mode sombre complet
- ✅ Auto-import Apple Health depuis iCloud Drive
- ✅ Adaptation dynamique des plans

**Améliorations :**
- ✅ Suggestions IA avec périodisation
- ✅ UI/UX responsive mobile
- ✅ Sécurité renforcée (ZIP bomb protection)
- ✅ Tests complets backend

**Corrections :**
- ✅ Bug format profil utilisateur (current_level None)
- ✅ Doublons import Apple Health
- ✅ Build TypeScript frontend

---

## 🎯 Roadmap Future

**Prochaines versions :**

**v2.1** (Court terme)
- [ ] Intégration Strava OAuth
- [ ] Export PDF plan d'entraînement
- [ ] Statistiques avancées (VO2max, seuil lactique)
- [ ] Notifications push (rappels séances)

**v2.2** (Moyen terme)
- [ ] Application mobile (React Native)
- [ ] Partage social (réseaux sociaux)
- [ ] Comparaison avec autres coureurs
- [ ] Analyse biomécanique (cadence, temps de contact)

**v3.0** (Long terme)
- [ ] Multi-utilisateurs avec authentification
- [ ] Fonctionnalités coach (suivi athlètes)
- [ ] Prédiction performances (ML)
- [ ] Intégration équipement (chaussures, capteurs)

---

## 📄 Licence

MIT License - Voir fichier `LICENSE`

## 👨‍💻 Auteur

Développé avec ❤️ et assistance de Claude Code

**Contact :**
- GitHub Issues : [Signaler un bug](https://github.com/votre-repo/issues)
- Email : votre@email.com

---

**Bon entraînement ! 🏃‍♂️💨**
