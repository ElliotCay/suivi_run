# Roadmap Complète - Allure Running App

**Version** : 1.0
**Date** : 17 novembre 2025
**Auteur** : Elliot Cayuela avec Claude Code

---

## 🎯 Vision du Produit

**Allure** est une application de coaching running qui intègre l'intelligence artificielle au cœur de son expérience utilisateur. L'objectif est de créer une app minimaliste, élégante et ultra-personnalisée qui accompagne le runner dans sa progression sans friction.

### Principes fondamentaux :
1. **IA "to the core"** : L'intelligence artificielle est intégrée de manière subtile et contextuelle, jamais intrusive
2. **Philosophie "Liquid Glass"** : Design naturel, formes organiques, animations fluides, hiérarchie claire
3. **Zéro friction** : Automatisation maximale (import Apple Health, sync Strava, détection automatique)
4. **Ton factuel** : Pas de gamification creuse ni de cheerleading excessif, juste des insights concrets
5. **Personnalisation profonde** : Chaque prompt IA est enrichi du contexte utilisateur (blessures, contraintes, préférences)

### Utilisateur cible :
- Runner intermédiaire (20-30km/semaine actuellement)
- Objectif : progresser en volume et vitesse, participer à des courses officielles
- 3 séances/semaine + renforcement musculaire
- Utilise Strava + Apple Watch + iPhone
- Consulte l'app sur Desktop (macOS)

---

## 📐 Architecture Technique Actuelle

### Backend
- **Framework** : FastAPI (Python 3.13)
- **BDD** : SQLite avec SQLAlchemy ORM
- **IA** : Anthropic Claude API (Haiku pour feedback, Sonnet pour plans)
- **Services** :
  - `claude_service.py` : génération suggestions/plans
  - `strava_service.py` : sync OAuth Strava
  - `health_parser.py` : parsing export Apple Health XML
  - `vdot_calculator.py` : calculs Jack Daniels
  - `gpx_parser.py` : analyse tracés GPX
  - `personal_records_service.py` : détection records

### Frontend
- **Framework** : Next.js 16 avec Turbopack
- **React** : 19 avec TypeScript
- **UI** : TailwindCSS + shadcn/ui
- **Fonts** : Branch (logo), Magilio (principal)
- **Animations** : Framer Motion
- **Graphiques** : Recharts

### Intégrations
- **Strava** : OAuth 2.0, sync activités automatique
- **Apple Health** : Import XML via iCloud Drive
- **Calendrier** : Export iCal (RFC 5545)

---

## 🗺️ Phase 1 : Core Features & Coach IA (2-3 semaines)

### 1. Refonte Navigation

**Objectif** : Simplifier l'architecture de l'information et clarifier les rôles de chaque section.

**Navigation actuelle** (éparpillée) :
```
Dashboard | Séances | Records | Suggestions | Plans | Training Block | Profil | Import | Paramètres
```

**Nouvelle navigation** (épurée) :
```
Dashboard | Séances | Records | Blocs | Coach | Réglages
```

#### Détails par section :

**Dashboard** (inchangé) :
- Métriques clés (volume 7j/28j, allure moyenne, FC)
- Graphiques : volume hebdo, heatmap annuel, pace vs FC
- **Nouveau** : Carte "Coach du jour" avec Readiness Score

**Séances** (inchangé) :
- Liste des workouts avec filtres
- Détail séance avec métriques complètes
- **Nouveau** : Bouton "💬 Analyser" pour feedback IA

**Records** (inchangé) :
- Grille minimaliste des records perso
- Historique avec badge "NEW" sur derniers records

**Blocs** (renommé depuis "Training Block") :
- Programme 4 semaines modulable
- Focus : Volume, Vitesse, VMA, Endurance
- Renouvelable à l'infini
- **Usage** : Entraînement quotidien flexible
- **Différence avec Coach** : Pas d'objectif de course précis, juste progression générale

**Coach** (nouvelle page fusionnant Plans + Suggestions) :
- **Objectif Course** : Préparation long terme (8-12 semaines) pour une course officielle
- Countdown vers la course
- Calendrier détaillé avec périodisation
- Stratégie d'allure générée par IA
- Ajustement en live si séances ratées
- **Usage** : Uniquement pour courses officielles (semi, marathon, etc.)

**Réglages** (fusion de Profil + Paramètres + Import) :
- **Section Profil** : Âge, poids, FCmax, VMA, niveau, photo
- **Section Blessures** : Historique zones sensibles
- **Section Chaussures** : Paires actives avec compteur km
- **Section Préférences** : Jours d'entraînement, horaires, contraintes
- **Section Coach IA** : Mode API vs Export, page Admin coûts
- **Section Données** : Statut Strava, Apple Health, dernier import
- **Section Apparence** : Mode clair/sombre/auto

**TopNav** :
- Logo Allure (gauche)
- Navigation principale (centre)
- Toggle mode sombre (droite)
- Photo de profil (droite) avec dropdown :
  - Mon profil
  - Réglages
  - (Se déconnecter - plus tard)

---

### 2. Coach IA Intégré Partout

**Objectif** : Rendre l'IA accessible contextuellement, sans page dédiée "Coach", avec choix entre API intégrée ou export manuel.

#### Mode d'utilisation (configurable dans Réglages) :

**Option A : API Intégrée** (par défaut)
- Utilise l'API Claude du backend
- Boutons "Analyser" / "Ajuster" déclenchent des appels directs
- Modal affiche la réponse instantanément
- Coût facturé à l'app (suivi dans page Admin)

**Option B : Export Manuel** (gratuit)
- Boutons "Analyser" / "Ajuster" génèrent un markdown
- Copié dans le presse-papier automatiquement
- L'utilisateur colle dans l'app Claude externe
- Aucun coût pour l'app

**Toggle dans Réglages** :
```
Mode Coach IA :
○ Intégré (utilise mon API Claude)
○ Export manuel (gratuit, utilise ton compte Claude)
```

#### Points d'intégration :

**1. Dashboard - Conseil du jour**
- Carte affichant le Readiness Score (voir détails section 4)
- Message contextuel :
  - 💚 "Forme excellente - tu peux forcer aujourd'hui"
  - 🟡 "Légère fatigue - séance modérée recommandée"
  - 🔴 "Fatigue détectée - repos ou EF uniquement"
- Bouton "[En savoir plus]" → modal avec analyse détaillée (optionnel, via IA si mode API)

**2. Page Séances - Feedback individuel**
- Sur chaque séance dans la liste : bouton discret "💬"
- Clic → Modal "Analyse de séance" :
  - **Contexte envoyé** :
    - Séance actuelle (distance, allure, FC, dénivelé, ressenti, commentaires)
    - 3 dernières séances (tendance)
    - Profil utilisateur (âge, VMA, FCmax, blessures, chaussures)
    - Plan actuel (semaine X/Y, objectif de la séance)
  - **Modèle** : Claude Haiku (rapide, cheap)
  - **Prompt ton** : Factuel, direct, constructif (pas de cheerleading)
  - **Affichage** : Texte structuré (3-4 paragraphes max)
  - Possibilité de poser une question complémentaire (chat contextuel)
- Si séance déjà analysée : icône 💬 visible, clic → revoir l'analyse

**3. Page Séances - Détail d'une séance**
- Section "Commentaires Coach" (si analyse déjà faite)
- Affiche le feedback persisté en BDD
- Bouton "Poser une question" → chat contextuel

**4. Page Coach - Ajustement plan**
- Si séances ratées détectées → bouton "🔄 Ajuster le plan" visible
- Clic → Modal (voir section 6 pour détails)
- IA régénère les prochaines semaines en tenant compte du contexte

**5. Page Blocs - Génération nouveau bloc**
- Formulaire : Focus (Volume/Vitesse/VMA/Endurance), Durée (4 semaines)
- IA génère le bloc en respectant :
  - Méthodologie Jack Daniels
  - Profil utilisateur (contraintes, blessures, préférences)
  - Progression logique (règle 10% max)

#### Export Manuel - Format Markdown

Lorsque l'utilisateur clique sur "Analyser" en mode Export :

**Métriques incluses** :
- **Séance** : Date, distance, durée, allure moyenne, dénivelé
- **Cardio** : FC moyenne/max, % FCmax, zones FC (Z1 à Z5)
- **Contexte** : Séance planifiée vs réalisée, objectif du plan
- **Chaussures** : Modèle, km parcourus
- **Conditions** : Météo, température (si noté)
- **Ressenti** : Commentaires utilisateur
- **Historique** : 3 dernières séances (dates, distances, FC)
- **Question** : Zone de texte libre

**Markdown généré** :
```markdown
# Séance du [DATE]

## Métriques clés
- Distance : X.X km
- Durée : XX:XX
- Allure moyenne : X:XX/km
- Dénivelé : +XXm / -XXm

## Cardio
- FC moyenne : XXX bpm (XX% FCmax)
- FC max : XXX bpm (XX% FCmax)
- Zones : Z2 (XX%) | Z3 (XX%) | Z4 (XX%)

## Contexte
- Séance planifiée : [Description]
- Objectif du plan : Semaine X/Y - Phase [Base/Build/Peak]
- Chaussures : [Modèle] (XXXkm)
- Météo : [Conditions]
- Ressenti : [Commentaires]

## Dernières séances
- [Date] : [Résumé]
- [Date] : [Résumé]
- [Date] : [Résumé]

## Question
[Question de l'utilisateur ou contexte spécifique]
```

---

### 3. Détection Automatique Séance Faite (Strava Sync)

**Objectif** : Éliminer la saisie manuelle en marquant automatiquement les séances planifiées comme "faites" quand l'activité Strava est synchronisée.

#### Logique de matching :

**Critères de correspondance** :
1. **Date** : Même jour OU ±1 jour (pour flexibilité si séance décalée)
2. **Distance** : ±10% de la distance planifiée (ex: 8km planifié = accepte 7.2-8.8km)
3. **Type** : Activité Strava = "Run"

**Algorithme** :
- Lors de la sync Strava, pour chaque activité récupérée :
  1. Chercher séances planifiées dans les ±1 jour
  2. Comparer distances (tolérance 10%)
  3. Si match unique → marquer automatiquement ✅
  4. Si plusieurs matchs possibles → proposer à l'utilisateur
  5. Si aucun match → ajouter comme séance non planifiée

**Modal de confirmation** (si ambiguïté) :
```
🎉 Séance détectée !

Ta séance Strava du 16/11 :
- 8.2km en 42:15 (5:09/km)
- FC moyenne : 165 bpm

Correspond probablement à ta séance planifiée :
- Endurance 8km à 5:30/km

[Valider et marquer comme faite]
[Ignorer et garder comme séance supplémentaire]
```

**Ajustement du plan** (si séance différente) :
- Si utilisateur a couru **plus** que prévu (ex: 10km au lieu de 8km)
  - Option : "Tu as dépassé ton objectif - ajuster le plan ?"
  - Si oui → réduit légèrement la prochaine séance (éviter surcharge)
- Si utilisateur a couru **moins** (ex: 6km au lieu de 8km)
  - Option : "Séance écourtée - rattraper ou ajuster ?"
  - Choix : Rattraper cette semaine / Ajuster les prochaines semaines

**Statut visuel dans le calendrier** :
- ✅ **Fait** (vert) : Séance complétée et validée
- 🔵 **À venir** (bleu) : Séance planifiée future
- ❌ **Raté** (rouge) : Séance passée non faite
- 🟡 **Partiel** (jaune) : Séance faite mais modifiée (distance/allure différente)

---

### 4. Readiness Score (100% Algorithmique)

**Objectif** : Fournir un score quotidien de "disponibilité à l'effort" basé uniquement sur des calculs algorithmiques (pas d'appel IA), affichable sur le Dashboard.

#### Critères de calcul (5 facteurs) :

**1. Fréquence Cardiaque de Repos (FC repos)**
- **Source** : Apple Health export (si Apple Watch porte la nuit)
- **Calcul** :
  - Moyenne FC repos sur 7 derniers jours
  - Baseline : Moyenne FC repos sur 30 derniers jours
  - **Pénalité** :
    - FC repos +5 bpm vs baseline → -25 points (fatigue importante)
    - FC repos +3 bpm vs baseline → -15 points (fatigue légère)
    - FC repos stable ou baisse → 0 pénalité (bonne récupération)

**2. Ratio Volume 7j/28j (Charge d'entraînement)**
- **Calcul** :
  - Volume total 7 derniers jours / Volume moyen sur 28 jours
  - **Pénalité** :
    - Ratio > 1.5 → -20 points (surcharge récente, risque blessure)
    - Ratio < 0.5 → -10 points (sous-entraînement, déconditionnement)
    - Ratio entre 0.8 et 1.2 → 0 pénalité (équilibre optimal)

**3. Récupération depuis dernière séance dure**
- **Définition séance dure** : VMA (fractionné) ou Tempo (seuil)
- **Calcul** :
  - Heures écoulées depuis dernière séance VMA/Tempo
  - **Pénalité** :
    - < 24h → -30 points (récupération insuffisante)
    - 24-48h → -15 points (récupération partielle)
    - > 48h → 0 pénalité (récupération complète)

**4. Séances manquées récemment**
- **Calcul** :
  - Nombre de séances planifiées mais ratées sur 7 derniers jours
  - **Pénalité** :
    - 2 séances ratées ou plus → -10 points (désentraînement léger, moral)
    - 1 séance ratée → -5 points
    - 0 séance ratée → 0 pénalité

**5. Progression des allures (forme)**
- **Calcul** :
  - Allure moyenne sur 7 derniers jours vs allure moyenne sur 28 jours
  - **Bonus** :
    - Allure 10+ sec/km plus rapide → +10 points (forme en hausse)
    - Allure stable (±5 sec/km) → 0 bonus
    - Allure plus lente → 0 pénalité (pas de double peine, déjà capturé par fatigue)

#### Score final :

**Formule** :
```
Score = 100 - Pénalité_FC - Pénalité_Volume - Pénalité_Récup - Pénalité_Manquées + Bonus_Forme
Score = max(0, min(100, Score))  // Borné entre 0 et 100
```

**Affichage visuel** (carte Dashboard) :

```
┌─────────────────────────────────────┐
│ 💚 Forme du jour : 92/100           │
│                                     │
│ Forme excellente                    │
│ Tu peux forcer aujourd'hui          │
│                                     │
│ [Voir détails]                      │
└─────────────────────────────────────┘
```

**Échelle de couleurs** :
- 💚 **90-100** : Forme excellente → "Tu peux forcer aujourd'hui"
- 🟢 **75-89** : Bonne forme → "Séance qualité possible"
- 🟡 **60-74** : Fatigue légère → "Privilégie endurance facile"
- 🟠 **45-59** : Fatigue modérée → "Séance courte ou repos actif"
- 🔴 **0-44** : Repos recommandé → "Ton corps a besoin de récupération"

**Modal "Voir détails"** (optionnel, clic sur la carte) :
- Affiche les 5 critères avec leur contribution au score
- Ex: "FC repos : +4 bpm (-15 points) • Volume : ratio 1.3 (-10 points) • Récup : 52h (OK)"

#### Note sur les données manquantes :

Si certaines données ne sont pas disponibles (ex: pas d'Apple Watch donc pas de FC repos) :
- **Fallback** : Ignorer ce critère et recalculer le score sur les critères disponibles
- **Message** : "Score basé sur 4/5 critères (FC repos non disponible)"

---

### 5. Import Automatique Apple Health

**Objectif** : Éliminer l'import manuel en automatisant complètement la synchronisation Apple Health via un Raccourci iOS qui s'exécute quotidiennement.

#### Architecture technique :

**Côté iPhone (Raccourci iOS)** :
1. **Déclencheur** : Automatisation quotidienne (ex: 23h chaque soir)
2. **Actions** :
   - Exporter Apple Health (Santé → Exporter toutes les données)
   - Enregistrer le ZIP dans iCloud Drive : `~/Library/Mobile Documents/com~apple~CloudDocs/AppleHealthExport/export.zip`
   - **Important** : Toujours le même nom de fichier (`export.zip`) pour remplacer l'ancien
   - Notification iOS : "✅ Données santé exportées"

**Côté Backend (Cron Job)** :
1. **Déclencheur** : Cron quotidien à 3h du matin (quand utilisateur dort)
2. **Actions** :
   - Vérifier si `export.zip` existe dans iCloud Drive partagé
   - Comparer date de modification du fichier avec dernier import (éviter retraitement)
   - Si nouveau fichier détecté :
     - Extraire le ZIP (temporaire sécurisé)
     - Parser `export.xml` avec `health_parser.py` (sans LLM, juste extraction XML)
     - Détecter doublons (via `workout_id` ou hash distance+date+durée)
     - Insérer nouvelles séances en BDD
     - Logger résultat : "3 nouvelles séances importées" ou "Aucune nouvelle donnée"
   - Nettoyer fichiers temporaires
3. **Coût** : 0€ (pas d'API, juste parsing XML)

**Affichage Dashboard** :
- Petit indicateur discret en haut : "Dernier import : Hier 3:05 - 3 nouvelles séances"
- Si échec : "⚠️ Import échoué - Voir détails" → lien vers Réglages > Données

**Réglages > Section Données** :
- **Statut Apple Health** :
  ```
  ✅ Synchronisation active
  Dernier import : 16/11/2024 à 3:05
  3 séances importées

  [Forcer un import manuel] (bouton discret si besoin)
  [Voir le tutoriel Raccourci iOS]
  ```
- **Historique des imports** (optionnel, replié) :
  - Liste des 10 derniers imports avec dates et nb séances

#### Tutoriel intégré (Onboarding + Réglages) :

**Format** : Guide pas-à-pas avec captures d'écran

**Étapes** :
1. Ouvrir l'app Raccourcis sur iPhone
2. Créer un nouveau raccourci nommé "Export Allure"
3. Ajouter l'action "Exporter données Santé"
4. Ajouter l'action "Enregistrer dans iCloud Drive"
   - Chemin : `AppleHealthExport/export.zip`
   - Option : Remplacer si existe
5. Activer l'automatisation :
   - Déclencheur : Heure du jour (23h)
   - Fréquence : Quotidienne
   - Exécuter sans demander
6. Tester le raccourci manuellement une première fois

**Validation** :
- Après 24h, vérifier dans Dashboard que "Dernier import" est à jour
- Si problème → lien vers troubleshooting

---

### 6. Refonte Réglages/Profil

**Objectif** : Fusionner Profil, Paramètres et Import dans une seule page "Réglages" bien organisée, tout en gardant un accès rapide via la photo de profil.

#### Structure de la page Réglages :

**TopNav dropdown (clic sur photo)** :
- Mon profil → scroll vers section Profil
- Réglages → ouvre page Réglages
- (Se déconnecter) → plus tard

**Page Réglages (sections repliables)** :

---

**📸 Section 1 : Profil**

*Carte avec photo de profil centrée + bouton "Modifier la photo"*

**Champs** :
- **Nom** : Elliot Cayuela
- **Âge** : 28 ans
- **Poids** : 72 kg
- **Taille** : 178 cm
- **Niveau** : Intermédiaire (dropdown : Débutant / Intermédiaire / Avancé / Expert)

**Métriques calculées (affichées, non éditables)** :
- **FCmax** : 192 bpm (détectée automatiquement ou formule 220 - âge)
  - Lien "[Modifier manuellement]" si besoin
- **VMA** : 16.8 km/h (calculée depuis records)
  - Lien "[Recalculer]"

---

**🩹 Section 2 : Blessures & Zones Sensibles**

*Historique des blessures pour personnaliser les recommandations IA*

**Liste des blessures passées** (tableau) :
- Colonne : Zone | Date début | Date fin | Statut | Actions
- Ex: "Genou droit | 05/2024 | 08/2024 | Guéri | [Modifier] [Supprimer]"

**Bouton** : "[+ Ajouter une blessure]"

**Modal ajout blessure** :
- Zone concernée (dropdown : Genou, Mollet, Tendon Achille, IT Band, Pied, Dos, etc.)
- Date début / Date fin (optionnel si en cours)
- Statut : En cours / Guéri / Récurrent
- Notes (optionnel) : "Douleur externe du genou, syndrome essuie-glace"

**Zones sensibles actuelles** (tags) :
- "Tendon Achille gauche" [x]
- "[+ Ajouter une zone]"

**Utilité** : Ces infos sont injectées dans tous les prompts IA pour éviter de suggérer des exercices risqués.

---

**👟 Section 3 : Mes Chaussures**

*Tracking des paires actives pour rotation et alerte changement*

**Liste des paires** (cards) :

```
┌─────────────────────────────────────┐
│ Nike Pegasus 40                     │
│ 215 km / 800 km                     │
│ [████████░░] 27%                    │
│                                     │
│ Type : Entraînement quotidien       │
│ Date achat : 01/09/2024             │
│                                     │
│ [Modifier] [Archiver]               │
└─────────────────────────────────────┘
```

**Bouton** : "[+ Ajouter une paire]"

**Modal ajout paire** :
- Marque + Modèle : "Nike Pegasus 40"
- Type : Entraînement / Compétition / Trail / Récupération
- Date d'achat
- Km initiaux : 0 (si neuve) ou X (si d'occasion)
- Km max recommandés : 800 (par défaut, ajustable)
- Description détaillée (caché en BDD, utilisé par IA) :
  - "Chaussure neutre, drop 10mm, amorti réactif, idéale pour sorties tempo et longues distances"

**Alerte automatique** :
- À 600km (75%) : "⚠️ Tes Nike Pegasus approchent de leur limite (215/800km). Pense à commander une nouvelle paire."
- À 750km (94%) : "🔴 Tes Nike Pegasus ont dépassé 750km. Change-les rapidement pour éviter les blessures."

**Usage par IA (2 paires ou +)** :
- Quand tu crées une séance ou que l'IA génère un plan, elle suggère :
  - "Séance VMA → utilise tes Nike Vaporfly (compétition, réactives)"
  - "Sortie longue → utilise tes Hoka Clifton (confort, amorti)"

**Compteur automatique** :
- Lors de l'import Strava ou Apple Health, la distance est ajoutée à la paire active par défaut
- Possibilité de changer manuellement dans l'édition de séance

---

**⚙️ Section 4 : Préférences d'Entraînement**

*Personnalisation des plans IA*

**Fréquence** :
- Séances par semaine : [3] (slider 2-6)

**Jours préférés** (multi-select) :
- ☑ Lundi
- ☐ Mardi
- ☑ Mercredi
- ☑ Jeudi
- ☐ Vendredi
- ☑ Samedi
- ☐ Dimanche

**Horaire fixe pour calendrier** :
- Heure préférée : [18:00] (time picker)
- *Utilisé pour l'export iCal - toutes les séances planifiées seront à cette heure*

**Durée max séance** :
- [90 minutes] (slider 30-180 min)

**Types de séances préférées** (tags, multi-select) :
- ☑ Endurance fondamentale
- ☑ VMA (fractionné)
- ☑ Tempo (seuil)
- ☐ Fartlek
- ☐ Côtes
- ☐ Piste

**Contraintes** (texte libre) :
- "Jamais 2 jours de suite"
- "Toujours 1 jour de repos après VMA"
- "Dimanche = sortie longue uniquement"

**Utilité** : Toutes ces infos sont injectées dans les prompts Claude pour personnaliser les plans.

---

**🤖 Section 5 : Coach IA**

*Configuration du mode d'utilisation de l'IA*

**Mode Coach IA** (radio buttons) :
```
○ Intégré (utilise mon API Claude - recommandé)
  → Analyse instantanée, ajustements en temps réel
  → Coût estimé : ~2€/mois

○ Export manuel (gratuit)
  → Génère un markdown à copier dans l'app Claude
  → Aucun coût, mais nécessite ton propre compte Claude
```

**Modèle par défaut** (si mode Intégré) :
- Feedback séances : Claude Haiku (rapide, économique)
- Génération plans : Claude Sonnet (qualité maximale)

**[Page Admin - Coûts API]** (bouton, voir section Phase 2 point 15)

---

**📊 Section 6 : Données & Synchronisation**

**Strava** :
```
✅ Connecté (compte @elliot_runs)
Dernière synchro : Aujourd'hui à 14:32
47 activités importées au total

[Déconnecter] [Forcer une synchro]
```

**Apple Health** :
```
✅ Import automatique actif
Dernier import : Hier à 3:05
3 nouvelles séances importées

[Voir le tutoriel Raccourci iOS]
[Forcer un import manuel]
[Historique des imports ▼]
```

**Export de mes données** :
- "[Télécharger toutes mes données]" (CSV ou JSON)
  - Séances, records, plans, feedbacks Coach
  - Pas prioritaire Phase 1, mais facile à implémenter

---

**🎨 Section 7 : Apparence**

**Mode couleur** (radio buttons) :
```
○ Clair
● Sombre
○ Auto (suit le système macOS)
```

**Changement instantané** : Le toggle en haut à droite du TopNav permet de changer rapidement, mais la préférence enregistrée ici persiste.

---

### 7. Horaires Calendrier Fixes

**Objectif** : Corriger le bug actuel où les événements calendrier sont créés à minuit. Utiliser l'heure préférée définie dans Réglages.

#### Implémentation :

**Backend (`calendar_service.py`)** :
- Lors de la génération du fichier `.ics`, récupérer `user.preferred_time` depuis la BDD
- Pour chaque séance planifiée, créer l'événement avec :
  - Date : Jour de la séance (ex: Mardi 19/11/2024)
  - Heure : `preferred_time` (ex: 18:00)
  - Durée estimée : Calculée selon type de séance (ex: VMA 6km = 40min, Endurance 10km = 65min)

**Formule durée estimée** :
```
Durée = (Distance / Allure cible) + 10min échauffement + 5min retour calme
```

**Exemple événement iCal** :
```ics
BEGIN:VEVENT
DTSTART:20241119T180000Z
DTEND:20241119T184500Z
SUMMARY:VMA - 6km (4×1500m)
DESCRIPTION:Échauffement: 10min footing léger\nCorps: 4×1500m à 4:50/km, récup 2min\nRetour au calme: 5min footing
LOCATION:Course à pied
END:VEVENT
```

**Frontend (Réglages)** :
- Champ "Heure préférée" avec time picker (18:00 par défaut)
- Sauvegarde dans `user_preferences.preferred_time`

---

### 8. Gestion 2 Paires de Chaussures (IA suggère laquelle utiliser)

**Objectif** : Quand l'utilisateur possède plusieurs paires, l'IA suggère automatiquement la paire la plus adaptée selon le type de séance.

#### Logique de suggestion :

**Base de données enrichie** (caché à l'utilisateur, utilisé par IA) :

Chaque paire a une **description détaillée** stockée en BDD mais non affichée dans Réglages (pour ne pas polluer l'UI) :

**Exemple** :
```json
{
  "id": 1,
  "brand": "Nike",
  "model": "Pegasus 40",
  "type": "Entraînement quotidien",
  "km_total": 215,
  "km_max": 800,
  "description_ia": "Chaussure neutre, drop 10mm, amorti réactif. Polyvalente. Idéale pour : sorties endurance, tempo modéré, sorties longues. À éviter pour : VMA intense (manque de dynamisme)."
}

{
  "id": 2,
  "brand": "Nike",
  "model": "Vaporfly 3",
  "type": "Compétition",
  "km_total": 45,
  "km_max": 400,
  "description_ia": "Chaussure avec plaque carbone, drop 8mm, amorti ZoomX. Très réactive et légère. Idéale pour : séances VMA, tempo rapide, compétitions. À éviter pour : sorties longues > 15km (fatigue musculaire), récupération."
}
```

**Prompt enrichi lors de la génération de plan** :

```
Tu génères un plan d'entraînement. Voici les chaussures disponibles :

Paire 1 : Nike Pegasus 40 (215km/800km)
- Polyvalente, amorti réactif
- Idéale pour : endurance, tempo modéré, sorties longues

Paire 2 : Nike Vaporfly 3 (45km/400km)
- Plaque carbone, très réactive
- Idéale pour : VMA, tempo rapide, compétitions
- À économiser (faible kilométrage max)

Pour chaque séance du plan, indique quelle paire utiliser et pourquoi.
```

**Affichage dans le plan généré** :

```
Semaine 1 - Mardi : VMA 6km (4×1500m à 4:50/km)
👟 Chaussures recommandées : Nike Vaporfly 3
💡 Raison : Séance rapide nécessitant réactivité et dynamisme

Semaine 1 - Dimanche : Sortie longue 14km à 6:00/km
👟 Chaussures recommandées : Nike Pegasus 40
💡 Raison : Longue distance, privilégie confort et protection
```

**Édition manuelle** :
- Dans le détail de chaque séance, l'utilisateur peut changer la paire recommandée
- Dropdown : Liste des paires actives

**Compteur automatique** :
- Après chaque séance synchronisée (Strava), la distance est ajoutée au compteur de la paire utilisée
- Si paire non renseignée → utilise la paire par défaut (celle avec le plus de km restants)

---

### 9. Consistance des Prompts (Contexte Commun)

**Objectif** : Éviter les incohérences entre les différents appels IA (ex: Weekly Recap dit "maintiens ton rythme VMA" mais Coach suggère du VMA rapide le lendemain).

#### Architecture de contexte partagé :

**Table BDD `ai_context`** :
- `user_id` : 1
- `last_recommendation` : "Maintiens ton volume actuel, pas d'augmentation cette semaine (fatigue détectée)"
- `current_phase` : "Base building" ou "Peak" ou "Taper"
- `fatigue_level` : "Légère" ou "Modérée" ou "Aucune"
- `readiness_score` : 72
- `last_hard_session_date` : 2024-11-15
- `updated_at` : 2024-11-17

**Injection dans tous les prompts** :

Avant chaque appel IA (Feedback, Weekly Recap, Génération plan, Ajustement), le backend charge ce contexte et l'ajoute au prompt :

```
CONTEXTE ACTUEL DE L'ATHLÈTE :
- Readiness Score : 72/100 (fatigue légère)
- Dernière séance dure : Il y a 2 jours (VMA 6km)
- Phase d'entraînement : Base building (semaine 4/12)
- Dernière recommandation donnée : "Maintiens ton volume, pas d'augmentation cette semaine"

IMPORTANT : Reste cohérent avec ce contexte. Si une recommandation de repos a été donnée, ne suggère pas de séance intense aujourd'hui.
```

**Mise à jour du contexte** :
- Après chaque appel IA majeur (Weekly Recap, Ajustement plan), on met à jour `last_recommendation` et `fatigue_level`
- Le `readiness_score` est recalculé quotidiennement (voir section 4)
- `current_phase` est défini par le plan actuel (Base / Build / Peak / Taper)

**Exemple de cohérence** :

**Lundi - Weekly Recap** :
> "Ta FC de repos est élevée (+5 bpm). Privilégie des séances faciles cette semaine."

→ Mise à jour contexte : `last_recommendation = "Repos et EF uniquement"`

**Mardi - Génération suggestion** :
> [Prompt inclut le contexte]
> → IA suggère : "Endurance facile 8km à 6:00/km" (cohérent avec la recommandation de lundi)

**Vendredi - Feedback séance** :
> "Tu as couru 8km à 5:15/km. C'est plus rapide que recommandé vu ta fatigue en début de semaine. Attention à ne pas surcharger."

---

## 🚀 Phase 2 : Motivation & Insights (3-4 semaines)

### 10. Badges Automatiques

**Objectif** : Gamification subtile basée sur les métriques existantes pour célébrer les accomplissements sans être intrusif.

#### Catégories de badges :

**Volume** :
- 🥉 "Premier 50km" (mensuel)
- 🥈 "100km en un mois"
- 🥇 "150km en un mois"
- 🏆 "1000km total"

**Records** :
- ⚡ "Nouveau record 5km"
- ⚡ "Nouveau record 10km"
- ⚡ "Nouveau record Semi"
- ⚡ "Nouveau record Marathon"

**Régularité** :
- 🔥 "10 séances ce mois-ci"
- 🔥 "12 semaines consécutives (3+ séances/semaine)"
- 🔥 "52 semaines actif (record annuel)"

**Progression** :
- 📈 "Volume +20% vs mois dernier"
- 📈 "Allure moyenne -15 sec/km vs trimestre dernier"
- 📈 "5 records battus cette année"

#### Détection automatique :

**Backend** :
- Cron quotidien qui vérifie les critères de badges
- Insertion en table `user_badges` si nouveau badge débloqué
- Notification discrète sur Dashboard

**Affichage** :

**Dashboard (toast discret)** :
```
🎉 Nouveau badge débloqué !
"100km en un mois"
[Voir mes badges]
```

**Page Profil (section Badges)** :
```
┌─────────────────────────────────────┐
│ 🏆 Mes Badges (12)                  │
├─────────────────────────────────────┤
│ [🥇] 150km en un mois               │
│ Débloqué le 15/11/2024              │
│                                     │
│ [⚡] Record 10km - 48:32            │
│ Débloqué le 03/11/2024              │
│                                     │
│ [🔥] 12 semaines consécutives       │
│ Débloqué le 10/11/2024              │
│                                     │
│ ... (9 autres badges)               │
└─────────────────────────────────────┘
```

**Design** :
- Style minimaliste (pas de grosses médailles flashy)
- Icônes simples (émojis ou SVG sobres)
- Texte factuel ("100km en un mois" plutôt que "SUPER CHAMPION DU MONDE")

---

### 11. Weekly Recap Narratif (via IA)

**Objectif** : Générer un résumé hebdomadaire motivant mais factuel, qui met en perspective la semaine écoulée avec des conseils concrets.

#### Déclenchement :

**Timing** : Tous les lundis matin à 6h (avant que l'utilisateur ne consulte l'app)

**Backend** :
- Cron qui récupère les données de la semaine écoulée (lundi-dimanche)
- Appel IA (Gemini Flash ou Claude Haiku selon config)
- Stockage du recap en BDD (`weekly_recaps` table)

#### Données envoyées au modèle :

**Métriques clés** :
- Nombre de séances réalisées / planifiées (ex: 3/3)
- Volume total (ex: 23km vs 20km objectif)
- Allure moyenne (ex: 5:45/km vs 6:00/km habituel)
- FC moyenne (ex: 162 bpm)
- Séances par type (2 EF, 1 VMA)
- Comparaison semaine précédente (+15% volume)

**Contexte** :
- Objectif actuel (ex: "Augmenter volume progressivement")
- Phase du plan (ex: "Semaine 4/12 - Base building")
- Readiness Score moyen de la semaine (ex: 78/100)
- Blessures/douleurs signalées (si journal santé actif)

#### Prompt (ton factuel) :

```
Tu es un coach running expérimenté. Rédige un résumé de la semaine écoulée pour cet athlète.

SEMAINE DU 11 AU 17 NOVEMBRE 2024

Séances réalisées : 3/3 ✅
- Lundi : Endurance 8km à 5:50/km, FC 158 bpm
- Mercredi : VMA 6km (4×1000m à 4:50/km), FC 172 bpm
- Dimanche : Sortie longue 12km à 6:05/km, FC 160 bpm

Volume total : 26km (+30% vs semaine dernière)
Allure moyenne : 5:48/km (15 sec/km plus rapide que d'habitude)
Readiness Score moyen : 78/100

Contexte : Semaine 4/12 du plan semi-marathon (phase Base building)

CONSIGNES :
1. Sois factuel et direct (pas de superlatifs excessifs)
2. Mets en avant les progrès concrets (chiffres)
3. Identifie les erreurs éventuelles (surcharge, allure trop rapide, manque récup)
4. Donne 1-2 conseils pour la semaine à venir
5. Format : 3-4 paragraphes courts, ton professionnel mais encourageant

Longueur max : 200 mots
```

#### Exemple de résultat :

> **Semaine du 11 au 17 novembre**
>
> Tu as complété tes 3 séances planifiées (26km au total), soit +30% de volume par rapport à la semaine dernière. C'est une progression importante qui respecte à peu près la règle des 10% si on lisse sur 2 semaines.
>
> Ta séance VMA de mercredi était solide : 4×1000m à 4:50/km avec FC à 172 bpm, ce qui correspond bien à ta zone I (intensité). Par contre, ta sortie longue de dimanche était un peu rapide (6:05/km au lieu de 6:30/km prévu) avec une FC soutenue à 160 bpm - attention à bien garder tes sorties longues en endurance fondamentale.
>
> Pour la semaine prochaine : maintiens ce volume (25-27km) avant d'augmenter à nouveau. Ralentis légèrement ta prochaine sortie longue pour rester sous 65% FCmax. Ta forme est là, profite-en pour consolider.

**Affichage Dashboard** :

Carte "Récap de la semaine" (en haut, remplace l'ancienne après le lundi) :

```
┌─────────────────────────────────────┐
│ 📊 Semaine du 11 au 17 novembre     │
├─────────────────────────────────────┤
│ [Texte du recap généré par IA]      │
│                                     │
│ [Voir les semaines précédentes]    │
└─────────────────────────────────────┘
```

**Coût** :
- Modèle : Gemini Flash (le moins cher)
- Input : ~700 tokens
- Output : ~250 tokens
- Coût par recap : ~$0.0003
- Coût annuel : 52 recaps × $0.0003 = **~$0.016 (2 centimes/an)**

---

### 12. Prédiction de Performance

**Objectif** : Utiliser les formules éprouvées (VDOT, Riegel) pour prédire les temps de course sur différentes distances, avec marge d'erreur.

#### Calcul (backend) :

**Méthode 1 : VDOT (déjà implémenté)** :
- Utilise le meilleur record récent (ex: 5km en 24:00)
- Calcule VDOT (via `vdot_calculator.py`)
- Extrait les temps équivalents des tables Jack Daniels pour 10km, Semi, Marathon

**Méthode 2 : Riegel Formula** :
- Formule : `T2 = T1 × (D2 / D1)^1.06`
- Ex: Si 5km en 24:00, prédiction 10km = 24 × (10/5)^1.06 = 50:24

**Marge d'erreur** :
- ±3% pour distances proches (5km → 10km)
- ±5% pour distances éloignées (5km → Marathon)

**Facteurs de correction** (optionnels) :
- **Dénivelé** : Si course en côte, ajout de X sec/km par 100m D+
- **Chaleur** : Si > 25°C, ajout de 2-3% au temps
- **Expérience** : Si première course longue distance, ajout de 5%

#### Affichage :

**Page Records (section "Prédictions")** :

```
┌─────────────────────────────────────┐
│ 🎯 Temps Estimés                    │
│                                     │
│ Basés sur ton record 5km (24:00)   │
│ VDOT : 48.5                         │
│                                     │
│ 10km    : 50:15 - 51:45             │
│ Semi    : 1:52:00 - 1:56:00         │
│ Marathon: 3:58:00 - 4:10:00         │
│                                     │
│ 💡 Ces temps supposent un          │
│ entraînement adapté et des          │
│ conditions optimales (plat, 15°C)   │
│                                     │
│ [Simuler une course]                │
└─────────────────────────────────────┘
```

**Modal "Simuler une course"** (optionnel) :
- Distance : [21.1 km] (Semi)
- Dénivelé : [+350m]
- Température prévue : [22°C]
- Expérience : Première fois sur cette distance
- → **Temps estimé ajusté** : 1:58:00 - 2:04:00

---

### 13. Photo de Profil + Refonte Navigation

**Objectif** : Ajouter une photo de profil dans le TopNav et simplifier l'accès aux réglages.

#### TopNav (desktop) :

```
┌────────────────────────────────────────────────────────────┐
│ [Logo] Dashboard  Séances  Records  Blocs  Coach          │
│                                         [🌙] [Photo]       │
└────────────────────────────────────────────────────────────┘
```

**Photo de profil** :
- Taille : 40px × 40px
- Forme : Cercle
- Upload : Via Réglages > Profil
- Si pas de photo : Initiales dans un cercle (ex: "EC")

**Dropdown au clic** :
```
┌──────────────────┐
│ Elliot Cayuela   │
├──────────────────┤
│ Mon profil       │
│ Réglages         │
│ ──────────       │
│ Se déconnecter   │ (Phase 3)
└──────────────────┘
```

**Utilisation dans l'app** :
- **Discussions avec IA Allure** : Si on implémente un chat avec l'IA, afficher la photo de profil à côté des messages utilisateur (vs icône Allure pour les réponses IA)
- **Commentaires de séances** : Photo à côté des notes personnelles

---

### 14. Homepage avec Storytelling (Typing Effect)

**Objectif** : Créer une landing page engageante qui explique la philosophie Allure avec un effet typing interactif, uniquement pour les nouveaux utilisateurs (avant onboarding).

#### Design :

**Layout** :
```
┌─────────────────────────────────────────────┐
│                                             │
│         [Logo Allure grande taille]         │
│                                             │
│  > allure, pourquoi te choisir toi ?       │ ← typing effect
│                                             │
│  [Réponse qui apparaît progressivement]    │
│                                             │
│  Elio, le créateur d'allure, ne trouvait   │
│  pas son bonheur sur Strava. Il voulait    │
│  un coach IA qui comprend vraiment ses     │
│  besoins, sans abonnement qui explose.     │
│                                             │
│  Allure est né de cette vision : une app   │
│  minimaliste, intelligente, qui s'adapte   │
│  à TOI. Pas de gamification creuse, pas    │
│  de comparaisons toxiques. Juste un outil  │
│  qui te rend meilleur.                     │
│                                             │
│  [Découvrir Allure] [En savoir plus]       │
│                                             │
└─────────────────────────────────────────────┘
```

**Effet typing** :
- La question s'écrit lettre par lettre (vitesse : 50ms/lettre)
- Pause de 500ms
- La réponse apparaît progressivement (fade-in par paragraphe)
- Animation subtile (pas de clignotement agressif)

**Questions alternatives** (rotation aléatoire) :
1. "allure, pourquoi te choisir toi ?"
2. "allure, qu'est-ce qui te rend différent ?"
3. "allure, c'est pour qui ?"

**Bouton "Découvrir Allure"** :
- Lance l'onboarding (voir Phase 1 section 5)

**Bouton "En savoir plus"** :
- **Page About** (modale ou nouvelle page) avec :
  - **Philosophie** : "Pas de BS, juste de la progression"
  - **Fonctionnalités clés** : IA personnalisée, sync automatique, insights avancés
  - **Manifeste** :
    - ❌ Pas d'abonnement qui coûte un bras
    - ❌ Pas de gamification creuse (streaks inutiles)
    - ❌ Pas de comparaison toxique avec des inconnus
    - ✅ Coach IA qui connaît TON historique
    - ✅ Automatisation totale (import, détection, ajustement)
    - ✅ Design élégant, pas de pollution visuelle
  - **FAQ rapide** :
    - "C'est gratuit ?" → "Usage personnel, API IA à coût réel (~2€/mois)"
    - "Ça marche sans Strava ?" → "Non, Strava est nécessaire pour la sync"
    - "Mes données sont-elles privées ?" → "100% local, aucune revente de données"

**Note importante** : Cette homepage n'est visible que pour les nouveaux utilisateurs. Une fois l'onboarding complété, l'app redirige directement vers le Dashboard.

---

### 15. Page Admin - Coûts API

**Objectif** : Offrir une transparence totale sur les coûts d'utilisation de l'IA, avec comparaison des économies potentielles si migration vers Gemini Flash.

#### Accès :

**Réglages > Section Coach IA > Bouton "[📊 Voir les coûts API]"**

#### Layout :

```
┌─────────────────────────────────────────────┐
│ 📊 Coûts API - Vue d'ensemble               │
├─────────────────────────────────────────────┤
│                                             │
│ Période : Depuis le 01/11/2024              │
│                                             │
│ TOTAL DÉPENSÉ : 2.34 €                      │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ Modèle actuel : Claude (Haiku + Sonnet)│ │
│ │                                         │ │
│ │ Claude Haiku (feedback)   1.12€ (587)  │ │
│ │ Claude Sonnet (plans)     1.22€ (23)   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 💡 Économies avec Gemini Flash         │ │
│ │                                         │ │
│ │ Coût estimé si Gemini :   0.45€        │ │
│ │ Économie potentielle :    1.89€ (-81%) │ │
│ │                                         │ │
│ │ [Passer à Gemini Flash]                │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ── Détails par fonctionnalité ──           │
│                                             │
│ Weekly Recap        0.08€  (4 appels)      │
│ Feedback séances    1.04€  (583 appels)    │
│ Génération plans    1.22€  (23 appels)     │
│                                             │
│ [Exporter les logs CSV]                    │
│                                             │
└─────────────────────────────────────────────┘
```

#### Calcul des économies :

**Backend** :
- Table `api_usage_logs` :
  - `date`, `function` (feedback/plan/recap), `model` (haiku/sonnet), `input_tokens`, `output_tokens`, `cost`
- Chaque appel IA log son utilisation
- Page Admin récupère les totaux et calcule :
  - Coût réel avec Claude
  - Coût théorique si Gemini Flash (mêmes tokens × prix Gemini)
  - Différence en % et €

**Bouton "Passer à Gemini Flash"** :
- Change la config globale (ou par fonction)
- Relance des tests qualité sur 3-4 appels pour comparer
- Si qualité OK → bascule définitive
- Si qualité insuffisante → garde Claude avec message "Qualité Gemini jugée insuffisante pour ton usage"

**Export CSV** :
- Télécharge un fichier avec toutes les lignes de `api_usage_logs`
- Colonnes : Date, Fonction, Modèle, Tokens In, Tokens Out, Coût

---

## 🏗️ Phase 3 : Polish & Qualité (2 semaines)

### 16. Tests Automatisés

**Objectif** : Atteindre une couverture de tests suffisante (80%+) pour garantir la stabilité avant d'ajouter de nouvelles fonctionnalités complexes.

#### Backend (pytest)

**Structure** :
```
backend/tests/
├── test_models.py           # Tests des modèles SQLAlchemy
├── test_vdot_calculator.py  # Tests calculs VDOT
├── test_health_parser.py    # Tests parsing Apple Health
├── test_strava_service.py   # Tests sync Strava (mocks API)
├── test_calendar_service.py # Tests génération iCal
└── test_api_endpoints.py    # Tests endpoints FastAPI
```

**Priorités** :
1. **Critiques** (doivent tous passer) :
   - Calculs VDOT (précision ±0.1)
   - Parsing Apple Health (gestion doublons, erreurs XML)
   - Détection records (edge cases : même temps, même jour)
   - Génération plans (respect périodisation, cohérence semaines)

2. **Importants** (coverage 80%+) :
   - Endpoints API (status codes, validation Pydantic)
   - Sync Strava (gestion tokens expirés, retry)

**Commande** :
```bash
pytest --cov=backend --cov-report=html
```

---

#### Frontend (Jest + React Testing Library)

**Structure** :
```
frontend/__tests__/
├── components/
│   ├── Dashboard.test.tsx
│   ├── WorkoutCard.test.tsx
│   └── RecordCard.test.tsx
├── hooks/
│   └── useWorkouts.test.ts
└── utils/
    └── formatPace.test.ts
```

**Priorités** :
1. **Composants critiques** :
   - Dashboard (affichage métriques, gestion loading)
   - WorkoutCard (formatting dates, allures, FC)
   - RecordCard (détection NEW badge)

2. **Hooks** :
   - useWorkouts (fetch, filtrage, tri)
   - useProfile (sauvegarde, validation)

**Commande** :
```bash
npm run test -- --coverage
```

---

#### E2E (Playwright)

**Flows critiques** :
1. **Onboarding complet** :
   - Connexion Strava
   - Configuration profil
   - Premier import Apple Health
   - Navigation vers Dashboard

2. **Génération plan course** :
   - Page Coach → Créer objectif
   - Remplir formulaire (Semi, date, temps)
   - IA génère plan
   - Valider et voir calendrier

3. **Feedback séance** :
   - Page Séances → Clic sur séance
   - Bouton "Analyser"
   - Modal affiche feedback IA
   - Fermer et vérifier persistence

**Commande** :
```bash
npx playwright test
```

---

### 17. Tracking Chaussures Avancé

**Objectif** : Compléter la fonctionnalité de base (Phase 1 section 8) avec alertes automatiques et suggestions de remplacement.

#### Alertes automatiques :

**Niveaux d'alerte** :
1. **75% (600km sur 800km max)** :
   - Notification Dashboard : "⚠️ Tes Nike Pegasus approchent de leur limite (600/800km)"
   - Message : "Pense à commander une nouvelle paire bientôt"
   - Couleur : Orange

2. **90% (720km sur 800km max)** :
   - Notification Dashboard : "🔴 Tes Nike Pegasus sont presque usées (720/800km)"
   - Message : "Change-les dans les prochains jours pour éviter les blessures"
   - Couleur : Rouge

3. **100% (800km ou +)** :
   - Notification Dashboard : "❌ Tes Nike Pegasus ont dépassé leur durée de vie (815/800km)"
   - Message : "URGENT : Remplace-les immédiatement, risque de blessure élevé"
   - Couleur : Rouge foncé
   - **Blocage IA** : L'IA refuse de suggérer des séances intenses tant que la paire n'est pas changée

#### Suggestions de remplacement :

**Lien partenaire** (optionnel, si monétisation future) :
- Bouton "Voir des modèles similaires"
- Redirige vers site partenaire (RunnerInn, I-Run, etc.)

**Historique des paires** :
- Section "Chaussures archivées" dans Réglages
- Liste des anciennes paires avec dates et km total
- Analyse : "En moyenne, tu changes tes chaussures tous les 650km"

---

### 18. Journal de Santé (Blessures)

**Objectif** : Permettre le tracking des douleurs post-séance pour détecter les patterns de blessures et ajuster automatiquement les recommandations.

#### Workflow :

**Après chaque séance** (optionnel, prompt discret) :
```
┌─────────────────────────────────────┐
│ Comment te sens-tu après cette      │
│ séance ?                            │
│                                     │
│ ○ 🟢 RAS - Aucune douleur          │
│ ○ 🟡 Légère gêne                   │
│ ○ 🟠 Douleur modérée               │
│ ○ 🔴 Douleur forte                 │
│                                     │
│ [Passer]  [Enregistrer]            │
└─────────────────────────────────────┘
```

**Si douleur signalée** :
```
┌─────────────────────────────────────┐
│ Où as-tu mal ?                      │
│                                     │
│ ☐ Genou gauche                      │
│ ☐ Genou droit                       │
│ ☐ Mollet gauche                     │
│ ☐ Mollet droit                      │
│ ☐ Tendon Achille                    │
│ ☐ IT Band                           │
│ ☐ Pied                              │
│ ☐ Dos                               │
│ ☐ Autre (préciser)                  │
│                                     │
│ Notes (optionnel) :                 │
│ [Zone de texte]                     │
│                                     │
│ [Enregistrer]                       │
└─────────────────────────────────────┘
```

#### Détection early warning (sans IA au début) :

**Trigger algorithmique** :
- Si **même zone** signalée 2 fois en 7 jours → Alerte
- Si **douleur modérée ou forte** 2 séances consécutives → Alerte

**Alerte Dashboard** :
```
⚠️ Pattern de douleur détecté

Tu as signalé une douleur au genou droit lors de tes 2 dernières séances.

Recommandation :
- Prends 2-3 jours de repos complet
- Si douleur persiste, consulte un médecin
- Évite les séances intenses jusqu'à disparition

[Ajuster mon plan] [Ignorer]
```

**Bouton "Ajuster mon plan"** :
- Régénère les 2 prochaines semaines avec :
  - Volume réduit de 30%
  - Suppression séances VMA/Tempo
  - Focus EF uniquement
  - Note dans le prompt IA : "Douleur genou droit, éviter surcharge"

#### Appel IA (optionnel, Phase 3 avancée) :

Si l'utilisateur clique "Analyser ce pattern" :
- **Contexte envoyé** :
  - Historique douleurs (dates, zones, intensité)
  - Séances réalisées (types, distances, allures)
  - Chaussures utilisées
  - Dénivelés récents
- **Modèle** : Gemini Flash (économique)
- **Prompt** :
  ```
  L'athlète signale des douleurs récurrentes au genou droit.
  Historique : [Liste des séances avec douleurs]
  Analyse les patterns possibles (surcharge, mauvaises chaussures, dénivelé, allure trop rapide).
  Suggère des ajustements concrets.
  Ton factuel, pas de diagnostic médical (conseille de consulter si persistant).
  ```

---

### 19. Form & Fitness (CTL/ATL/TSB)

**Objectif** : Implémenter un graphique de suivi de la forme (Training Stress Balance) basé sur le concept TrainingPeaks, pour visualiser fatigue vs fitness.

**Note** : Nice to have, si temps disponible en Phase 3.

#### Concepts :

**CTL (Chronic Training Load)** - Fitness long terme :
- Moyenne mobile exponentielle du stress d'entraînement sur 42 jours
- Représente ta "forme de fond"

**ATL (Acute Training Load)** - Fatigue court terme :
- Moyenne mobile exponentielle sur 7 jours
- Représente ta fatigue récente

**TSB (Training Stress Balance)** - Forme actuelle :
- TSB = CTL - ATL
- Positif → Frais, prêt à performer
- Négatif → Fatigué, en phase de charge
- Neutre → Équilibre

#### Calcul du stress par séance (TSS - Training Stress Score) :

**Formule simplifiée** :
```
TSS = (Durée en heures × Intensité² × 100)

Intensité = % de FCseuil ou % d'allure seuil
```

**Exemple** :
- Séance VMA 45min à 95% FCseuil → TSS = 0.75 × 0.95² × 100 = 67
- Séance EF 60min à 70% FCseuil → TSS = 1 × 0.70² × 100 = 49

#### Graphique :

**Page Dashboard (section avancée)** :

```
┌─────────────────────────────────────────────┐
│ 📈 Form & Fitness (6 derniers mois)        │
├─────────────────────────────────────────────┤
│                                             │
│  CTL │         ╱────╲                       │
│  ATL │    ╱───╱      ╲╲___                  │
│  TSB │___╱                ╲___              │
│      │                                      │
│      └─────────────────────────────────→   │
│        Nov    Déc    Jan    Fév    Mar     │
│                                             │
│  💡 TSB positif : Forme optimale pour      │
│  ta course du 15 mars                      │
│                                             │
└─────────────────────────────────────────────┘
```

**Interprétation automatique** :
- Si TSB > 10 pendant 3+ jours : "Tu es frais, c'est le moment de performer"
- Si TSB < -20 pendant 7+ jours : "Fatigue accumulée, prévois une semaine de récup"
- Si CTL monte régulièrement : "Ta forme de fond progresse bien"

---

## 🔮 Phase Long Terme (Backlog)

### 20. IA Proactive (Suggestions Non Sollicitées)

**Objectif** : Permettre à l'IA d'intervenir automatiquement quand elle détecte un risque ou une opportunité, sans attendre que l'utilisateur demande.

**Exemples** :
- **Détection surcharge** : "⚠️ Tu as augmenté ton volume de 35% cette semaine (règle 10% dépassée). Je recommande de réduire ta prochaine séance de 3km."
- **Opportunité record** : "💡 Ton allure 5km s'est améliorée de 20 sec/km ce mois-ci. Si tu fais une séance test samedi, tu peux battre ton record (objectif : sub-24min)."
- **Météo** : "⛈️ Orages prévus demain soir. Décale ta séance VMA à demain matin ?"

**Trigger** : Analyse quotidienne (cron 6h du matin) qui vérifie :
- Readiness Score < 50
- Volume progression > 15%
- Records potentiels (allure récente proche du record)
- Météo défavorable (intégration API météo)

**Affichage** : Notification Dashboard (comme les badges) + possibilité d'ignorer

---

### 21. Amélioration Prompt Classification Séances

**Objectif** : Corriger les incohérences actuelles dans la classification automatique des séances (EF, Tempo, VMA, Longue).

**Problèmes identifiés** :
- Certaines séances classées "Tempo" alors que FC indique EF
- Fractionné parfois classé "Facile" si allure moyenne basse (à cause des récups)

**Solution** :
- Affiner l'algorithme de classification avec critères multiples :
  - **Allure** : Comparaison avec zones VDOT
  - **FC** : % FCmax (EF < 75%, Tempo 75-85%, VMA > 85%)
  - **Variabilité allure** : Si écart-type élevé → probablement fractionné
  - **Structure GPX** : Détection des intervalles (accélérations/ralentissements répétés)

**Implémentation** :
- Refonte de `workouts.py` (endpoint `/classify`)
- Ajout d'un score de confiance : "Classé VMA (confiance 92%)"
- Possibilité de reclasser manuellement si confiance < 80%

---

### 22. Amélioration Méthodologie Jack Daniels (Respect 70-80% EF)

**Objectif** : Renforcer les prompts IA pour qu'ils respectent strictement la règle "70-80% du volume hebdomadaire doit être en Endurance Fondamentale".

**Problème actuel** :
- Les plans générés par Claude sont parfois trop orientés "intensité"
- Ex: 3 séances/semaine avec 1 EF, 1 Tempo, 1 VMA → seulement 33% EF (au lieu de 70%)

**Solution** :

**Ajout au prompt de génération** :
```
RÈGLE STRICTE : 70-80% du volume hebdomadaire DOIT être en Endurance Fondamentale (allure facile).

Pour un plan de 3 séances/semaine (25km total) :
- 2 séances EF (18km = 72%)
- 1 séance qualité (7km = 28%)

Pour un plan de 4 séances/semaine (35km total) :
- 3 séances EF (25km = 71%)
- 1 séance qualité (10km = 29%)

Les séances Tempo et VMA doivent TOUJOURS inclure :
- Échauffement 10-15min EF
- Retour au calme 10min EF
→ Même les séances "dures" contribuent au volume EF

Si le plan ne respecte pas cette règle, RÉGÉNÈRE-LE.
```

**Validation backend** :
- Après génération d'un plan, calculer le % EF
- Si < 65% → refuser le plan et relancer la génération avec prompt renforcé
- Logger les échecs pour analyse

---

### 23. Multi-Utilisateurs (Authentification)

**Objectif** : Sécuriser l'application et permettre plusieurs utilisateurs (si déploiement public futur).

**Implémentation** :
- **Auth JWT** (JSON Web Tokens)
- **Backend** :
  - Endpoints `/auth/register`, `/auth/login`, `/auth/logout`
  - Middleware `get_current_user_id()` (remplace `user_id: int = 1`)
  - Protection de tous les endpoints avec `Depends(get_current_user_id)`
- **Frontend** :
  - Pages Login/Register
  - Stockage token dans localStorage
  - Redirection automatique si non authentifié

**Priorité** : Basse (pas critique tant que l'app est en usage local mono-utilisateur)

---

### 24. Migration Gemini Flash (Si Coûts Explosent)

**Objectif** : Basculer de Claude vers Gemini Flash pour réduire les coûts si l'usage augmente significativement.

**Trigger** :
- Si coûts mensuels > 10€
- Ou si page Admin montre économies > 50€/an

**Procédure** :
1. Tests qualité sur 20 appels (Feedback, Plans, Recap)
2. Comparaison Claude vs Gemini (note subjective /10)
3. Si qualité Gemini ≥ 8/10 → Migration
4. Sinon → Rester sur Claude mais optimiser prompts (réduire tokens input)

**Implémentation** :
- Ajouter provider "gemini" dans `config.py`
- Service `gemini_service.py` (wrapper API Gemini)
- Toggle dans Réglages > Coach IA : "Modèle : Claude | Gemini"

---

## 🎨 Principes de Design (Rappel)

### Philosophie "Liquid Glass"

**Formes organiques** :
- `border-radius` : rounded-3xl (24px) pour les cards
- Pas de coins durs (éviter rounded-sm)

**Ombres subtiles** :
- Par défaut : `shadow-sm` (ombre légère)
- Au hover : `shadow-lg` (ombre prononcée)
- Transition douce : `duration-300`

**Espacements harmonieux** :
- Proportions Fibonacci : gap-3 (12px), gap-6 (24px), gap-12 (48px)
- Éviter les espacements impairs (gap-5, gap-7)

**Hiérarchie claire** :
- 1 élément principal par vue (ex: Dashboard → Métriques clés en haut)
- Reste en support (graphiques, détails)

**Animations fluides** :
- Framer Motion pour transitions de page
- `transition-all duration-300` pour hover states
- Pas d'animations agressives (éviter bounce, shake)

**Couleurs sobres** :
- Background : `#FAFAF9` (off-white chaud)
- Texte : `#1A1A1A` (near-black)
- Gradient Allure : utilisé avec parcimonie (logo, badges, borders au hover)
- Mode sombre : `#0A0A0A` (deep black)

**Typography** :
- Headings : Branch (logo) ou Magilio (titres de page)
- Body : Magilio
- Data (allures, temps) : Monospace (tabular numbers)
- Taille titre page : `text-6xl` (60px)
- Tracking serré : `-tracking-tight` pour les gros titres

---

## 📊 Métriques de Succès

### Phase 1 (Core Features)
- ✅ Import automatique Apple Health fonctionne sans intervention (0 erreur sur 7 jours)
- ✅ Détection auto séance faite : 95%+ de précision
- ✅ Readiness Score cohérent avec ressenti utilisateur (validation manuelle)
- ✅ Coach IA donne feedbacks pertinents (note subjective 8+/10)

### Phase 2 (Motivation & Insights)
- ✅ Weekly Recap généré chaque lundi sans bug
- ✅ Prédictions de performance écart < 5% vs vrais résultats course
- ✅ Page Admin affiche coûts précis (±0.10€)

### Phase 3 (Polish)
- ✅ Coverage tests : Backend 80%+, Frontend 70%+
- ✅ Tests E2E : 3 flows critiques passent sans erreur
- ✅ Aucune régression sur features Phase 1

---

## 🚀 Prochaines Étapes Immédiates

1. **Validation roadmap** avec Elliot
2. **Priorisation fine** : Ordre exact des tâches Phase 1
3. **Setup environnement** : Branches Git (feature/phase-1-navigation, etc.)
4. **Kick-off Phase 1** : Commencer par refonte navigation (base pour tout le reste)

---

**Fin du cahier des charges** 🎯
