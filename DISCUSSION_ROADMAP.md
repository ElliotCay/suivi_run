# Discussion Roadmap - Allure Running App

Date : 17 novembre 2025

---

## 1. Onglet Course dédié 🏁

**Oui, totalement d'accord !** Voici la structure proposée :

### Navigation proposée :
```
Dashboard | Séances | Records | Course | Coach
```

### Page "Course" contiendrait :
- **Objectif actuel** (si défini) :
  - Nom de la course (ex: "Semi de Paris")
  - Distance + Date
  - Temps visé (optionnel)
  - Countdown gros et visible
- **Mon plan d'entraînement** :
  - Vue calendrier des X prochaines semaines
  - Séances planifiées avec statut (✅ fait, 🔵 à venir, ❌ raté)
  - Progression % (ex: "Semaine 4/12 - 33% complété")
- **Stratégie de course** (générée par IA) :
  - Allure cible par km/segment
  - Nutrition recommandée
  - Échauffement pré-course
- **Bouton "Ajuster le plan"** si tu rates des séances
- **Historique des courses** passées (si tu en fais)

**Question** : Pour toi, "Course" = objectif ponctuel (ex: semi dans 3 mois) ou ça peut aussi être "augmenter mon volume progressivement" sans course définie ? Parce que ça change un peu la structure.

---

## 2. Import Automatique Apple Health 📲

### Test à faire :
1. **Export Apple Health** depuis iPhone
2. **Upload vers iCloud Drive** (automatisé via Raccourci iOS ?)
3. **Détection du fichier** par le backend
4. **Parsing** (sans LLM, juste extraction XML)
5. **Import en BDD** avec détection doublons

### Complexité estimée :
- **Parsing XML** : déjà fait (tu as `health_parser.py`)
- **Raccourci iOS** : 1-2h à configurer
- **Automatisation quotidienne** : cron job backend qui check iCloud Drive toutes les nuits à 3h du matin par exemple
- **Coût** : 0€ (pas d'API, juste du parsing)

### Pour le Readiness Score sans API :

Calcul **purement algorithmique** basé sur tes données :

```python
def calculate_readiness_score(user_data):
    score = 100  # On part de 100

    # 1. Charge d'entraînement (ratio 7j/28j)
    ratio = volume_7j / volume_28j
    if ratio > 1.5:  # Tu forçes trop récemment
        score -= 20
    elif ratio < 0.5:  # Tu sous-entraînes
        score -= 10

    # 2. FC de repos (si dispo dans Apple Health)
    fc_repos_moy_7j = get_avg_resting_hr(7)
    fc_repos_baseline = get_avg_resting_hr(30)  # Baseline 30 jours

    if fc_repos_moy_7j > fc_repos_baseline + 5:  # +5bpm = fatigue
        score -= 25
    elif fc_repos_moy_7j > fc_repos_baseline + 3:
        score -= 15

    # 3. Récupération depuis dernière séance dure
    last_hard_workout = get_last_hard_workout()  # VMA ou tempo
    hours_since = (now - last_hard_workout.date).total_seconds() / 3600

    if hours_since < 24:  # Moins de 24h
        score -= 30
    elif hours_since < 48:  # Moins de 48h
        score -= 15

    # 4. Séances manquées récemment (moral)
    missed_last_week = count_missed_sessions(7)
    if missed_last_week >= 2:
        score -= 10  # Désentraînement léger

    # 5. Progression des allures (êtes-vous en forme ?)
    avg_pace_7j = get_avg_pace(7)
    avg_pace_28j = get_avg_pace(28)

    if avg_pace_7j < avg_pace_28j - 10:  # Tu cours 10sec/km plus vite
        score += 10  # Bonus forme

    return max(0, min(100, score))  # Entre 0 et 100
```

**Affichage** :
```
💚 95/100 - Forme excellente
🟢 80/100 - Bonne forme
🟡 65/100 - Fatigue légère
🟠 50/100 - Fatigue modérée
🔴 30/100 - Repos recommandé
```

**Aucun appel API**, tout calculé côté backend avec tes données. **Ça te convient ?**

---

## 3. Personnalisation du Prompt ⚙️

Dans **Profil/Paramètres**, tu aurais des champs comme :

### Infos physiologiques :
- Âge
- Poids
- FCmax (auto-détecté ou manuel)
- VMA (auto-calculée ou manuelle)
- Niveau : Débutant / Intermédiaire / Avancé

### Préférences d'entraînement :
- **Fréquence séances/semaine** : 2-3-4-5
- **Jours préférés** : Mardi, Jeudi, Samedi (exemple)
- **Durée max séance** : 60min, 90min, 120min
- **Types de séances aimées** : VMA, Tempo, Endurance, Fartlek
- **Types évités** : Côtes, Piste, etc.
- **Contraintes** : "Jamais 2 jours de suite", "Toujours un jour de repos après VMA"

### Historique blessures :
- **Blessures passées** : Genou droit (2024), Mollet gauche (2023)
- **Zones sensibles** : Tendons d'Achille, IT band

### Chaussures actuelles :
- **Modèle** : Nike Pegasus 40
- **Km parcourus** : 150km
- **Date d'achat** : 01/09/2024

**Tout ça est injecté dans le prompt Claude** quand il génère un plan :

```python
prompt = f"""
Tu es un coach running expert. Génère un plan d'entraînement pour :

Athlète :
- Âge : {user.age} ans
- VMA : {user.vma} km/h
- FCmax : {user.fcmax} bpm
- Niveau : {user.level}

Préférences :
- {user.sessions_per_week} séances/semaine
- Jours préférés : {user.preferred_days}
- Contraintes : {user.constraints}

Historique blessures :
- {user.injury_history}

Objectif : {race.distance} en {race.target_time} le {race.date}

Génère un plan de {weeks_remaining} semaines en respectant la méthodologie Jack Daniels.
"""
```

---

## 4. Weekly Recap - Coût API 💸

### Coût estimé :
- **Modèle** : Claude Haiku (le moins cher) ou Gemini Flash
- **Input** : ~500 tokens (tes séances de la semaine + métriques)
- **Output** : ~200 tokens (le paragraphe narratif)
- **Coût Haiku** : $0.25 / 1M input tokens, $1.25 / 1M output tokens
- **Par recap** : ~$0.0003 (0.03 centime)
- **Par an** : 52 recaps = $0.016 (~2 centimes/an)

**C'est négligeable !** Même avec Sonnet, ça reste sous 5€/an.

### Ton non "sycophantic" :

**❌ Trop sycophantic** :
> "Bravo champion ! 🎉 Tu es incroyable, cette semaine était EXCEPTIONNELLE ! Tu progresses à une vitesse folle, continue comme ça superstar !"

**✅ Ton factuel et honnête** :
> "23km en 3 séances cette semaine (+15% vs semaine dernière). Ta sortie longue de 12km à 5:45/km montre une bonne endurance de base. Par contre, ta séance VMA de mardi était difficile (FC à 92% sur les derniers intervalles) - signe que tu es peut-être allé un peu trop vite. Prévois une semaine à volume équivalent avant d'augmenter."

**Ton du prompt** :
```
Sois factuel, direct et constructif. Pas de superlatifs excessifs.
Si l'athlète fait des erreurs (surcharge, allure trop rapide, manque de récup),
dis-le clairement avec explication. Si c'est bien, dis-le simplement sans en faire trop.
Style : coach expérimenté qui respecte son athlète, pas cheerleader.
```

---

## 5. Claude Coach - Contexte & Modèles 🤖

### Option A : Feedback intégré (analyse séance)

**Contexte envoyé** :
- **Séance actuelle** : distance, allure, FC, dénivelé, ressenti, commentaires
- **3 dernières séances** : pour voir la tendance
- **Profil utilisateur** : âge, VMA, FCmax, blessures passées, chaussures
- **Plan actuel** : quelle semaine tu en es, quel était l'objectif de la séance

**Total** : ~1000-1500 tokens input, ~300-500 tokens output

**Modèle** : **Haiku** suffit pour ça (analyse simple, conseils directs)

**Coût par analyse** : ~$0.0005 (0.05 centime)

---

### Option B : Export markdown

Même contexte, mais formaté en markdown que tu copies-colles. **Gratuit pour toi.**

**Métriques supplémentaires à ajouter** :

#### Dans les deux options :
- **Zones FC** : % temps dans chaque zone (Z1, Z2, Z3, Z4, Z5)
- **Cadence moyenne** (si dispo Apple Watch)
- **Dénivelé positif/négatif**
- **Best efforts** : meilleur 1km, 5km, 10km de la séance
- **Efficience** : ratio allure/FC (ex: "5:00/km à 160bpm = meilleur que d'habitude")
- **Conditions** : météo, température, vent (si tu notes ça)
- **Équipement** : quelle paire de chaussures

**Export markdown complet** :

```markdown
# Séance du 17 novembre 2025

## Métriques clés
- Distance : 8.2 km
- Durée : 42:15
- Allure moyenne : 5:09/km
- Dénivelé : +85m / -82m

## Cardio
- FC moyenne : 165 bpm (82% FCmax)
- FC max : 178 bpm (88% FCmax)
- Zones : Z2 (60%) | Z3 (30%) | Z4 (10%)

## Contexte
- Séance planifiée : Endurance 8km à 5:30-6:00/km
- Objectif du plan : Semaine 4/12 - Phase Base
- Chaussures : Nike Pegasus 40 (215km)
- Météo : 12°C, venteux
- Ressenti : Difficile sur la fin, essoufflement dès km 5

## Dernières séances
- 15/11 : 5km VMA (4×1000m) - FC moy 172 bpm
- 13/11 : 10km endurance - FC moy 158 bpm
- 10/11 : Repos

## Question
Pourquoi j'ai eu le souffle court dès le km 5 alors que c'était censé être une sortie facile ?
```

---

### Comparaison des modèles 📊

| Modèle | Coût (1M input/output) | Qualité conseil | Vitesse | Recommandation |
|--------|------------------------|-----------------|---------|----------------|
| **Claude Haiku** | $0.25 / $1.25 | ⭐⭐⭐ | ⚡⚡⚡ | Parfait pour feedback simple |
| **Claude Sonnet** | $3 / $15 | ⭐⭐⭐⭐⭐ | ⚡⚡ | Génération plans complexes |
| **GPT-4o mini** | $0.15 / $0.60 | ⭐⭐⭐ | ⚡⚡⚡ | Moins cher, mais moins bon |
| **Gemini 1.5 Flash** | $0.075 / $0.30 | ⭐⭐⭐ | ⚡⚡⚡ | Le moins cher, qualité OK |
| **Llama 3.1 70B** (local) | **GRATUIT** | ⭐⭐⭐ | ⚡ | Si tu veux auto-héberger |
| **DeepSeek v3** | $0.27 / $1.10 | ⭐⭐⭐⭐ | ⚡⚡ | Bon rapport qualité/prix |

**Recommandation** :

1. **Feedback séances** : **Gemini Flash** ou **Haiku** (presque gratuit, largement suffisant)
2. **Génération plans** : **Claude Sonnet** (meilleure qualité pour plans complexes)
3. **Weekly recap** : **Gemini Flash** (très cheap, qualité OK pour du narratif)

**Pourquoi pas tout en local avec Llama ?**
- Tu peux ! Mais faut héberger un serveur avec GPU (coût électricité + complexité)
- Pour ton usage perso, les API cloud sont plus simples

**Conseil** : Utilise **Gemini Flash par défaut** (quasi-gratuit) et garde **Claude Sonnet** pour les plans d'entraînement complexes.

---

## 6. Ajustement Plan en Live 🔄

### Scénario : Tu as raté 2 séances cette semaine

1. **Tu vas sur ta page "Course"**
2. **Le plan affiche** :
   ```
   Semaine 4/12
   ✅ Lundi : Endurance 8km (fait)
   ❌ Mercredi : VMA 6km (raté)
   ❌ Vendredi : Tempo 10km (raté)
   🔵 Dimanche : Sortie longue 14km (prévu)
   ```

3. **Bouton "🔄 Ajuster le plan"** visible

4. **Modal s'ouvre** :
   ```
   Pourquoi as-tu raté ces séances ?

   ○ Manque de temps
   ○ Fatigue / surentraînement
   ○ Blessure / douleur
   ○ Motivation faible
   ○ Maladie
   ○ Autre (précise)

   [Champ libre pour détails]

   Veux-tu rattraper ces séances ou réajuster le plan ?

   ○ Rattraper cette semaine (ajoute les séances manquées)
   ○ Réajuster le plan (adapte les prochaines semaines)
   ```

5. **Claude régénère** les semaines suivantes en tenant compte :
   - De ta raison (si fatigue → baisse intensité)
   - De ton objectif (toujours faisable ?)
   - De la logique de progression

6. **Tu valides ou tu modifies** avant d'appliquer

**Question** : Tu veux pouvoir **éditer manuellement** les séances générées par Claude ou tu fais confiance à 100% ?

---

## 7. Refonte Plans + Blocs 4 semaines + Coach AI 🎯

Actuellement tu as :
- **"Plans"** : objectifs long terme (8-12 semaines vers une course)
- **"Blocs 4 semaines"** : cycles courts (training-block/)
- **"Suggestions IA"** : séances ponctuelles ou semaines isolées

**C'est effectivement éparpillé !**

### Nouvelle structure : Onglet "Course"

Dedans, tu as **3 modes** :

#### Mode 1 : Objectif Course 🏁
- Tu crées un objectif précis : "Semi de Paris - 21/04/2025 - Viser 1h30"
- Claude génère un **plan complet** (12 semaines par exemple)
- Vue calendrier avec toutes les semaines
- Ajustement en live si tu rates des séances

#### Mode 2 : Bloc 4 semaines 📅
- Pas de course en vue, juste "Je veux progresser"
- Tu choisis un focus : "Volume", "Vitesse", "VMA", "Endurance"
- Claude génère 4 semaines cohérentes
- À la fin, tu peux renouveler ou changer de focus

#### Mode 3 : Suggestion ponctuelle 💡
- "J'ai besoin d'une idée pour demain"
- Claude te propose 1 séance adaptée à ta semaine actuelle
- Pas de plan, juste de l'inspiration

**Tout ça dans la même page "Course"**, avec un **toggle en haut** :
```
[Objectif Course] [Bloc 4 semaines] [Suggestion ponctuelle]
```

---

## 8. Import automatique - Onboarding 🎬

### Onboarding au premier lancement :

**Étape 1** : Bienvenue
```
Bienvenue sur Allure 👋

On va configurer ton app en 3 minutes.
```

**Étape 2** : Connexion Strava (optionnel)
```
Tu utilises Strava ?

[Oui, connecter mon compte] [Non, passer]
```

**Étape 3** : Import Apple Health
```
Pour analyser tes entraînements, on a besoin de tes données.

Option 1 : Import automatique (recommandé)
→ Configure un Raccourci iOS qui upload ton export chaque nuit

[Voir le tutoriel] [Configurer maintenant]

Option 2 : Import manuel
→ Upload ton export.zip quand tu veux

[Uploader maintenant]
```

**Étape 4** : Profil
```
Quelques infos pour personnaliser tes plans :

- Âge : ___
- Poids : ___
- Niveau : [Débutant / Intermédiaire / Avancé]
- Objectif : [Augmenter volume / Courir plus vite / Préparer une course]
```

**Étape 5** : Préférences Coach IA
```
Comment veux-tu utiliser le Coach IA ?

○ Intégré (utilise mon API Claude - payant)
○ Export manuel (gratuit, tu utilises ton compte Claude)
```

**Étape 6** : C'est prêt !
```
Tout est configuré ! 🎉

[Aller au dashboard]
```

**Ensuite, plus de page "Import"** → tout se fait automatiquement en background.

**Si besoin de réimporter manuellement** → dans Paramètres, section "Données", bouton discret "Forcer un import".

---

## 9. Coach AI intégré partout 🤖

Pas besoin d'une page dédiée "Coach". Au lieu de ça :

### Coach AI intégré contextuellement :

#### Dans la page "Séances" (liste des workouts) :
- Sur chaque séance, bouton **"💬 Analyser"**
- Modal qui s'ouvre avec feedback IA
- **Historique des feedbacks** : petit icône 💬 sur les séances déjà analysées, clic → revoir le feedback

#### Dans le détail d'une séance :
- Section **"Commentaires Coach"** (si tu as demandé une analyse)
- Affiche le feedback de Claude
- Bouton **"Poser une question"** → chat contextuel

#### Dans la page "Course" (plan d'entraînement) :
- Bouton **"Demander un ajustement"**
- Modal avec chat : "Pourquoi cette séance VMA ?" ou "Je suis fatigué, on fait quoi ?"

#### Dans le Dashboard :
- Carte **"Coach du jour"** :
  ```
  💡 Conseil du jour

  "Ta FC de repos est élevée cette semaine (+6bpm vs normale).
  Privilégie une sortie facile aujourd'hui."

  [En savoir plus]
  ```

#### Dans Profil/Paramètres :
- Section **"Historique Coach"** :
  - Toutes les analyses de séances
  - Tous les ajustements de plan
  - Toutes les questions posées
  - Filtrable par date/type

---

## 10. Méthodologie Jack Daniels 📚

Tu utilises déjà Jack Daniels :
- ✅ **VDOT calculator** : `vdot_calculator.py` utilise les formules et tables de Jack Daniels
- ✅ **Training zones** : basées sur VDOT (E, M, T, I, R paces)
- ✅ **Périodisation** : mentionnée dans `claude_service.py` pour les plans

**Mais** le prompt actuel est assez **générique** et ne mentionne pas explicitement "Utilise la méthodologie Jack Daniels strictement".

**On devrait renforcer ça** pour que Claude respecte :
1. **3 types de séances/semaine** : Easy (E), Quality (T ou I), Long run (E+)
2. **Progression 10% max/semaine**
3. **Semaine de récup toutes les 3-4 semaines**
4. **Périodisation** : Foundation → Base → Sharpening → Taper (si course)

---

## 11. Page d'accueil avec "typing effect" ✨

### Concept :

Sur la homepage (ou dashboard), **une barre de recherche centrale** avec un **placeholder animé** qui se tape/efface en boucle :

```
┌─────────────────────────────────────────────┐
│ allure, crée un plan pour un 10km...       │ ← typing...
└─────────────────────────────────────────────┘
   ⌫ efface...

┌─────────────────────────────────────────────┐
│ allure, pourquoi j'ai mal au genou...      │ ← typing...
└─────────────────────────────────────────────┘
   ⌫ efface...

┌─────────────────────────────────────────────┐
│ allure, quelle allure pour mon semi...     │ ← typing...
└─────────────────────────────────────────────┘
```

**Messages à faire défiler** :
- "allure, crée-moi un programme pour un semi..."
- "allure, explique-moi pourquoi j'ai eu mal au genou..."
- "allure, quelle allure viser pour mon 10km..."
- "allure, analyse ma dernière séance..."
- "allure, je suis fatigué, que faire..."
- "allure, comment améliorer ma VMA..."

**Quand tu cliques dedans** :
- Le texte s'efface
- Tu peux taper ta vraie question
- **Enter** → ouvre un modal avec réponse de Claude (ou redirige vers la page appropriée)

**Techno** : React + Framer Motion pour l'animation fluide.

**Alternative** : Barre en haut du dashboard comme "quick action"

**Question** : Préférence Homepage avec typing effect ou barre en haut du Dashboard ?

---

## 12. Refonte Navigation 🧭

### Actuellement (supposé) :
```
Dashboard | Séances | Records | Suggestions | Plans | Profil | Import | Paramètres
```
→ **Trop d'onglets**, éparpillé

### Proposition nouvelle navigation :
```
🏠 Dashboard | 💪 Séances | 🏆 Records | 🎯 Course | ⚙️ Réglages
```

### Sub-navigation :
- **Course** contient :
  - Mon objectif actuel
  - Planning (calendrier des séances)
  - Ajustements

- **Réglages** contient :
  - Mon profil (photo, infos perso, blessures, chaussures)
  - Préférences (jours d'entraînement, contraintes)
  - Coach IA (mode API ou export)
  - Données (import Apple Health, Strava)
  - Apparence (mode sombre, déjà là)

**+ Photo de profil en haut à droite** avec dropdown :
- Mon profil
- Réglages
- Se déconnecter (plus tard)

---

## 13. Raccourci iPhone pour import automatique 📱

### Setup :

1. **Raccourci iOS "Export Allure"** :
   - Déclenche l'export Apple Health
   - Upload le ZIP vers un répertoire partagé (iCloud Drive ou serveur)
   - Remplace le fichier existant (toujours `export.zip` pour éviter l'accumulation)

2. **Backend check quotidien** :
   - Cron job qui tourne à 3h du matin (quand tu dors)
   - Check si `export.zip` a été modifié (compare date de modif)
   - Si nouveau → parse et importe dans BDD
   - Log du résultat dans un fichier

3. **Dashboard** :
   - Petit indicateur "Dernier import : Hier 3:05 - 3 nouvelles séances"
   - Si échec → alerte discrète "Import échoué - voir détails"

### Complexité :
- **Raccourci iOS** : 1-2h à configurer (tutoriel à créer)
- **Backend cron** : 0.5j de dev
- **Détection doublons** : déjà fait dans `import_service.py`
- **Coût** : 0€ (juste parsing XML)

**Temps total** : ~1 jour de dev + 1h de config iOS

---

## 14. Idées Supplémentaires 💡

### A. Gestion des blessures 🩹

**Fonctionnalité "Journal de Santé"** :
- **Tracker les douleurs/sensations** après chaque séance :
  - 🟢 RAS - Aucune douleur
  - 🟡 Légère gêne (préciser où)
  - 🟠 Douleur modérée
  - 🔴 Douleur forte
- **Détection early warning** :
  - Si 2 séances consécutives avec douleur même zone → alerte
  - Suggestion de repos ou séance adaptée
- **Historique des blessures** :
  - Dates début/fin
  - Zone concernée
  - Cause probable
  - Retour d'expérience

**Claude pourrait** :
- Analyser les patterns (ex: "Tu as mal au genou droit à chaque fois que tu dépasses 12km")
- Suggérer des adaptations ("Réduis ton volume de 20% cette semaine")

---

### B. Suivi de la forme 📈

**Graphique "Form & Fitness"** (concept TrainingPeaks) :

- **Fitness** (CTL - Chronic Training Load) : ta forme à long terme (28j)
- **Fatigue** (ATL - Acute Training Load) : ta charge récente (7j)
- **Form** (TSB - Training Stress Balance) : Fitness - Fatigue

**Graphique** :
```
  Form
    ↑
    │     ╱╲    Pic de forme
    │    ╱  ╲   (avant course)
    │   ╱    ╲
    │  ╱      ╲
    │ ╱        ╲___
    │╱
────┼─────────────────→ Temps
```

- **Form positive** : Tu es frais, prêt à performer
- **Form négative** : Tu accumules fatigue (normal en phase de charge)
- **Form neutre** : Équilibre

---

### C. Notifications intelligentes 🔔

**Notifications système macOS** :

**Exemples** :
- **Matin** : "☀️ Bonjour ! Ta séance du jour : Tempo 8km à 5:20/km"
- **Rappel** : "🏃 Ta sortie longue est prévue dans 2h - n'oublie pas de t'hydrater"
- **Alerte fatigue** : "⚠️ Ton readiness score est à 45/100 - privilégie une sortie facile"
- **Célébration** : "🎉 Nouveau record sur 10km : 48:32 !"

**Via** :
- macOS Notifications (si app web ouverte)
- Ou emails quotidiens (si tu préfères)

---

### D. Export des données 📊

**Fonctionnalité "Exporter mes données"** :
- Bouton dans Réglages → "Télécharger toutes mes données"
- Format CSV ou JSON avec :
  - Toutes tes séances
  - Tes records
  - Ton historique de plans
  - Tes feedbacks Coach

---

### E. Dark mode automatique 🌓

**Automatisation** :
- ○ Mode clair
- ○ Mode sombre
- ● **Auto** (suit le système macOS)
- ● **Programmé** (clair 6h-20h, sombre 20h-6h)

---

### F. Comparaison avec des "personas" 🏃‍♂️

Au lieu de comparer avec d'autres users, comparer avec des **profils types** :

Exemples :
- "Runner débutant (< 1 an, 15km/sem)" → **Tu dépasses ce profil de 35%**
- "Runner intermédiaire (1-3 ans, 30km/sem)" → **Tu approches ce profil (68%)**
- "Runner confirmé (3+ ans, 50km/sem)" → **Objectif à long terme**

---

## Récap Final - Roadmap Affinée 🗺️

### Phase 1 : Core Features & Coach IA (2-3 semaines)

1. ✅ **Refonte page "Course"** unifiée
   - Fusionne Plans + Blocs 4 semaines + Suggestions
   - Modes : Objectif Course | Bloc 4 semaines | Suggestion ponctuelle
   - Countdown + Stratégie d'allure + Calendrier

2. ✅ **Coach IA intégré partout**
   - Choix API vs Export manuel (toggle dans Réglages)
   - Feedback séances (bouton "Analyser" sur chaque workout)
   - Ajustement plan en live ("J'ai raté 2 séances")
   - Conseil du jour sur Dashboard

3. ✅ **Readiness Score** (algorithmique, pas d'API)
   - Basé sur : FC repos, volume 7j/28j, récup depuis séance dure
   - Affichage : 💚 🟢 🟡 🟠 🔴 avec conseil clair
   - Pas de calcul IA, juste formules éprouvées

4. ✅ **Import automatique Apple Health**
   - Raccourci iOS qui upload `export.zip` quotidien
   - Cron backend qui parse et importe (3h du matin)
   - Indicateur "Dernier import" sur Dashboard
   - Tutoriel onboarding pour setup

5. ✅ **Refonte UI : Réglages unifiés**
   - Fusion Profil + Paramètres + Import
   - Photo de profil (dropdown TopNav)
   - Champs personnalisés pour prompt (jours préférés, contraintes, blessures)
   - Mode Coach IA (API ou Export)
   - Style Liquid Glass (formes organiques, ombres subtiles)

---

### Phase 2 : Motivation & Insights (3-4 semaines)

6. ✅ **Badges automatiques**
   - Basés sur métriques existantes (100km total, nouveau record, etc.)
   - Affichage dans Profil + notification discrète

7. ✅ **Weekly Recap narratif** (via Gemini Flash)
   - Ton factuel, pas sycophantic
   - Focus sur : progrès, erreurs, conseils concrets
   - Coût : ~0.03€/an (négligeable)

8. ✅ **Prédiction de performance**
   - Utilise VDOT + Riegel formula
   - Affiche temps estimés (5km, 10km, Semi, Marathon)
   - Avec marge d'erreur ("Entre 1h30 et 1h35")

9. ✅ **Photo de profil + Refonte navigation**
   - TopNav avec dropdown (Profil, Réglages, Déconnexion)
   - Navigation simplifiée : Dashboard | Séances | Records | Course | Réglages
   - Homepage avec typing effect OU barre quick action sur dashboard

10. ✅ **Suivi de la forme (Form & Fitness)**
    - Graphique CTL/ATL/TSB
    - Détection pic de forme (optimal pour course)

---

### Phase 3 : Polish & Qualité (2 semaines)

11. ✅ **Tests automatisés**
    - Backend : pytest (coverage 80%+)
    - Frontend : Jest + RTL
    - E2E : Playwright (flows critiques)

12. ✅ **Tracking chaussures**
    - Champ dans édition séance
    - Compteur km par paire
    - Alerte changement à 600-800km

13. ✅ **Gestion blessures** (optionnel)
    - Journal de santé post-séance
    - Détection early warning
    - Historique blessures

14. ⏳ **Multi-utilisateurs** (si besoin plus tard)
    - Auth JWT
    - Pages login/register

---

## Questions finales 🚀

1. **Typing effect** : Homepage dédiée ou barre en haut du Dashboard ?

2. **Readiness Score** : Les critères proposés (FC repos, volume, récup) te semblent suffisants ou tu veux d'autres facteurs ?

3. **Modèles IA** : On part sur **Gemini Flash** par défaut + **Claude Sonnet** pour plans complexes ? Ou tu veux tout en Claude ?

4. **Journal de santé** (blessures) : Phase 2 ou Phase 3 ?

5. **Form & Fitness** (CTL/ATL) : Ça t'intéresse vraiment ou c'est "nice to have" ?

6. **Export données** : Important pour toi ou pas prioritaire ?

7. **Notifications système** (macOS) : Tu les veux ou ça te gonflerait ?

8. **Comparaison personas** : Motivant ou inutile ?
