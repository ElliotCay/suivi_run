# Roadmap - Suivi Course

## ✅ Fonctionnalités Implémentées

### Import & Dashboard
- [x] Import Apple Health manuel (upload ZIP)
- [x] Auto-détection fichier export.zip dans iCloud Drive
- [x] Import automatique toutes les 60 secondes
- [x] Détection des doublons (évite re-import)
- [x] Interface de statut dans /import
- [x] Dashboard avec métriques (volume, allure, FC)
- [x] Graphiques volume hebdomadaire (8 semaines)
- [x] Records personnels avec historique
- [x] Analyse charge d'entraînement (ratio 7j/28j)
- [x] Alertes progression volume (règle 10%)

### Suggestions IA
- [x] Suggestions d'entraînement via Claude (Anthropic)
- [x] Génération semaine complète (3 séances)
- [x] Historique des suggestions
- [x] Marquage séances comme réalisées

---

## 🚀 Fonctionnalités à Développer

### 1. Plans d'Entraînement Multi-Semaines (PRIORITÉ 1)

**Objectif**: Transformer les suggestions ponctuelles en programme cohérent sur 8-12 semaines

#### Backend
- [ ] Nouveau modèle `TrainingPlan` avec structure semaines/séances
- [ ] Endpoint POST `/api/training-plans` (créer plan)
  - Paramètres: objectif (5km, 10km, semi, marathon), date cible, niveau actuel
  - Génération via Claude : prompt avec périodisation (base → build → peak → taper)
- [ ] Endpoint GET `/api/training-plans` (liste plans)
- [ ] Endpoint GET `/api/training-plans/{id}` (détail plan avec toutes semaines)
- [ ] Endpoint PATCH `/api/training-plans/{id}/week/{week_num}` (ajuster semaine)
- [ ] Logique d'adaptation dynamique :
  - Si séance manquée → ajuster semaine suivante
  - Si performance meilleure → progresser plus vite
  - Si signes fatigue (FC élevée) → semaine récup

#### Frontend
- [ ] Page `/training-plans` (liste plans actifs/passés)
- [ ] Page `/training-plans/create` (formulaire création)
  - Choix objectif (distance, date, temps cible optionnel)
  - Affichage preview plan généré par IA
- [ ] Page `/training-plans/{id}` (vue détaillée)
  - Calendrier 8-12 semaines avec séances
  - Code couleur : fait ✅, à venir 🔵, manqué ❌
  - Progression visuelle (% complété)
- [ ] Marquer séance comme faite depuis le plan
- [ ] Ajuster plan si changements (blessure, objectif modifié)

#### Amélioration Suggestions IA
- [ ] Contexte plan dans prompts Claude (semaine X/12, phase build)
- [ ] Cohérence entre séances (intensité répartie sur semaine)
- [ ] Respect périodisation (progression logique)

**Estimation**: 12-15h de dev

---

### 2. Synchronisation Calendrier (PRIORITÉ 2)

**Objectif**: Exporter séances planifiées vers calendrier avec description détaillée

#### Backend
- [ ] Endpoint GET `/api/calendar/export.ics` (export iCal)
  - Génère fichier .ics avec toutes séances à venir (30 jours)
  - Format événement :
    - Titre : "Séance VMA - 8×400m"
    - Date/heure : jour suggéré + heure préférée (configurable)
    - Description : structure complète (échauffement, séries, récup, retour calme)
    - Durée estimée : calculée depuis structure
    - Localisation : "Course à pied" (optionnel)
- [ ] Endpoint POST `/api/calendar/sync` (sync événements)
  - Mise à jour si séance modifiée
  - Suppression si séance annulée
- [ ] Configuration utilisateur :
  - Jours préférés (ex: Mardi, Jeudi, Samedi)
  - Heure préférée (ex: 18h00)
  - Rappels (15 min avant, 1h avant, veille)

#### Frontend
- [ ] Section "Calendrier" dans `/profile`
  - Toggle "Activer sync calendrier"
  - Configuration jours/heures préférés
  - Bouton "Télécharger .ics" (manuel)
  - Option "Auto-sync" (webhook ou URL calendrier)
- [ ] Bouton "Ajouter au calendrier" sur chaque suggestion
- [ ] Instructions setup calendrier (Apple Calendar, Google Calendar)

#### Intégration Calendrier
- [ ] URL webcal:// pour abonnement calendrier
  - Mise à jour automatique quand nouvelles séances
- [ ] Webhook CalDAV (optionnel, avancé)

**Estimation**: 8-10h de dev

---

### 3. Amélioration Graphismes (PRIORITÉ 3)

**Objectif**: Interface plus engageante et insights visuels avancés

#### Dashboard
- [ ] Refonte design avec cartes interactives
- [ ] Graphique progression records (courbe temps par distance)
  - Afficher tous les records sur même graphique
  - Courbe prédiction (VDOT, Riegel formula)
- [ ] Heatmap calendrier annuel (comme GitHub contributions)
  - Intensité couleur = volume du jour
  - Hover : détails séance
- [ ] Distribution types séances (camembert ou barres)
- [ ] Evolution FC repos (ligne tendance sur 3 mois)

#### Graphiques Avancés
- [ ] Graphique pace vs FC (scatter plot)
  - Détecte amélioration efficience (même pace, FC plus basse)
- [ ] Graphique volume vs intensité (2 axes)
  - Volume total (barres) + % séances intenses (ligne)
- [ ] Comparaison mois/année
  - Sélecteur période
  - Comparaison side-by-side
- [ ] Zoom & pan sur graphiques (interactivité Recharts)

#### UI/UX
- [ ] Mode sombre (toggle dans settings)
- [ ] Animations transitions pages
- [ ] Loading skeletons (pas juste "Chargement...")
- [ ] Toasts notifications (succès, erreurs)
- [ ] Responsive mobile optimisé

**Estimation**: 10-12h de dev

---

### 4. Tests & Qualité (Continu)

#### Tests Synchronisation Apple Health
- [ ] Test détection nouveau fichier
- [ ] Test modification fichier existant
- [ ] Test import sans doublons
- [ ] Test après re-export complet Apple Health
- [ ] Test gestion erreurs (fichier corrompu, etc.)

#### Tests Calendrier
- [ ] Test création événement calendrier
- [ ] Test mise à jour événement existant
- [ ] Test suppression événement
- [ ] Test format iCal valide
- [ ] Test gestion des fuseaux horaires

#### Tests Plans d'Entraînement
- [ ] Test génération plan 8 semaines
- [ ] Test adaptation dynamique
- [ ] Test marquage séances faites
- [ ] Test cohérence suggestions multi-semaines

**Estimation**: 6-8h de dev

---

## 📊 Analyse de Parallélisation

### ✅ Totalement Parallélisables (Aucune dépendance)

1. **Synchronisation Calendrier** ↔ **Amélioration Graphismes**
   - Zéro dépendance technique
   - Modules complètement séparés
   - Peuvent être développés simultanément par 2 personnes

2. **Tests Apple Health** ↔ **Tous les autres**
   - Tests indépendants des nouvelles features
   - Peuvent être écrits en parallèle

### ⚠️ Dépendance Partielle

**Plans d'Entraînement** → **Synchronisation Calendrier**
- Le calendrier peut exporter les séances des plans
- MAIS : calendrier peut d'abord exporter suggestions simples
- **Stratégie** :
  1. Implémenter calendrier avec suggestions actuelles
  2. Étendre pour plans quand disponibles
  - **→ 80% parallélisable**

**Plans d'Entraînement** → **Graphismes**
- Graphiques peuvent afficher progression dans plan
- MAIS : autres graphiques (heatmap, records) indépendants
- **Stratégie** :
  1. Faire graphiques généraux d'abord
  2. Ajouter graphique plan après
  - **→ 90% parallélisable**

### 🎯 Stratégie de Développement Optimale

#### Phase 1 (Parallèle) - 2-3 semaines
- **Track A** : Plans d'Entraînement (backend + frontend base)
- **Track B** : Synchronisation Calendrier (backend + frontend)
- **Track C** : Graphismes (refonte dashboard, nouveaux graphiques)

#### Phase 2 (Intégration) - 1 semaine
- Connecter calendrier aux plans d'entraînement
- Ajouter graphiques spécifiques plans
- Tests d'intégration

#### Phase 3 (Polish) - 1 semaine
- Tests complets
- Corrections bugs
- Documentation utilisateur

**Total estimé** : 4-5 semaines si développement solo
**Total estimé** : 2-3 semaines si développement avec aide (ou parallélisation)

---

## 📝 Notes

- Application mono-utilisateur : pas besoin d'auth
- Focus sur expérience personnelle et cohérence long terme
- Priorité : plans entraînement > calendrier > graphismes
- Tests inclus dans chaque feature (TDD light)
