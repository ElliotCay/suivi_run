# TODO Roadmap - Allure Running App

## Phase 1 : Core Features & Coach IA

### ✅ Complétées

- [x] **Phase 1.1** - Refonte Navigation (Sidebar + TopNav)
  - Navigation simplifiée : Dashboard | Séances | Records | Blocs | Coach | Réglages
  - Page /coach créée avec 3 modes (Objectif Course, Bloc 4 semaines, Suggestion)

- [x] **Phase 1.2** - Page Réglages Unifiée (fusion Profil/Paramètres)
  - 7 sections collapsibles : Profil, Blessures, Chaussures, Préférences, Coach IA, Données, Apparence
  - Upload de photo de profil avec crop/zoom
  - Intégration next-themes pour mode clair/sombre

- [x] **Phase 1.3** - Readiness Score Algorithmique
  - Score 0-100 basé sur 3 facteurs actifs : charge (7j/28j), récupération, allure
  - 2 facteurs à implémenter : FC repos (Apple Health), séances manquées (plans)
  - Card prominente sur Dashboard avec dialog détaillé
  - Utilise FCmax personnelle pour zones HR

- [x] **Phase 1.4** - Coach IA Mode Export Manuel
  - Toggle dans Réglages : Mode Intégré vs Export Manuel
  - Utilitaires d'export markdown (`ai-export.ts`)
  - Composant `AIAnalyzeButton` réutilisable
  - Copie automatique dans presse-papier

### 🔄 En cours / À compléter plus tard

- [ ] **Phase 1.5** - Détection Auto Séance Faite (Strava Sync)
  - ⚠️ Infrastructure Strava en place
  - ⚠️ Nécessite système de séances planifiées (plans d'entraînement)
  - À implémenter :
    - Logique de matching (date ±1j, distance ±10%)
    - Modal de confirmation si ambiguïté
    - Marquage automatique des séances comme "faites"
    - Ajustement du plan si séance différente

- [ ] **Phase 1.6** - Horaires Calendrier Fixes
  - ⚠️ Pas encore de service calendrier
  - À implémenter :
    - Service `calendar_service.py` pour génération iCal
    - Utiliser `preferred_time` du profil
    - Calculer durée estimée selon type de séance
    - Format RFC 5545 avec DTSTART/DTEND

- [x] **Phase 1.7** - Gestion 2 Paires Chaussures + IA ✅ TERMINÉ
  - ✅ Modèle `Shoe` en BDD avec relation User
  - ✅ Migration `migrate_add_shoes_table.py` exécutée
  - ✅ Schemas Pydantic (ShoeCreate, ShoeUpdate, ShoeResponse)
  - ✅ Router FastAPI complet avec tous les endpoints CRUD
  - ✅ Hook `useShoes.ts` et `useShoeAlerts.ts` pour frontend
  - ✅ Interface complète dans page Réglages (CRUD avec dialog)
  - ✅ Alertes affichées sur Dashboard (card conditionnelle)
  - ✅ Calcul automatique : wear_percentage, km_remaining, alert_level
  - ✅ Alertes : warning (75%), danger (90%), critical (100%)
  - ⏳ Compteur km automatique lors sync (à implémenter avec auto-import)

- [x] **Phase 1.8** - Contexte Commun IA (Cohérence Prompts) ✅ TERMINÉ
  - ✅ Table `ai_context` en BDD créée
  - ✅ Modèle AIContext avec tous les champs nécessaires
  - ✅ Service `ai_context_service.py` avec fonctions get/update/increment
  - ✅ Injection automatique dans prompts (build_suggestion_prompt, build_week_prompt)
  - ✅ Mise à jour après génération de suggestions
  - [ ] Tests d'intégration pour vérifier contexte IA
  - [ ] Mise à jour auto du contexte lors sync workouts (détection hard sessions/long runs)
  - [ ] Enrichissement contexte avec données chaussures
  - [ ] Intégration avec Readiness Score

## Phase 2 : Polish & Landing Page

- [ ] **Phase 2.1** - Landing Page avec Storytelling
  - À implémenter :
    - Route `/` (homepage publique) distincte de `/dashboard` (app)
    - Design inspiré Allure (fond gradients, runner silhouette)
    - Sections : Hero, Features, Screenshots, CTA
    - Animations subtiles (scroll reveal)
    - Mobile-first responsive
    - Lien "Commencer" → /dashboard

- [ ] **Phase 2.10** - Badges Automatiques
- [ ] **Phase 2.11** - Weekly Recap Narratif (via IA)
- [ ] **Phase 2.12** - Prédiction de Performance (VDOT)
- [ ] **Phase 2.15** - Page Admin - Coûts API

## Phase 3 : Polish & Qualité (À venir)

- [ ] **Phase 3.16** - Tests Automatisés (Backend + Frontend + E2E)
- [ ] **Phase 3.17** - Tracking Chaussures Avancé
- [ ] **Phase 3.18** - Journal de Santé (Blessures)
- [ ] **Phase 3.19** - Form & Fitness (CTL/ATL/TSB)

## Backlog Long Terme

- [ ] **Phase 4.20** - IA Proactive (Suggestions Non Sollicitées)
- [ ] **Phase 4.21** - Amélioration Classification Séances
- [ ] **Phase 4.22** - Méthodologie Jack Daniels (70-80% EF strict)
- [ ] **Phase 4.23** - Multi-Utilisateurs (Authentification JWT)
- [ ] **Phase 4.24** - Migration Gemini Flash (si coûts explosent)

---

## Notes de Développement

### Dépendances entre phases

- **Phase 1.5** dépend de plans d'entraînement (pas encore implémentés)
- **Phase 1.6** dépend de service calendrier (à créer)
- **Phase 1.8** peut être implémenté indépendamment

### Prochaines étapes prioritaires

1. ✅ Phase 1.7 - Chaussures (terminé)
2. ✅ Phase 1.8 - Contexte IA (terminé)
3. **Phase 2.1 - Landing Page** (en cours - priorité)
4. Phase 2.10 - Badges Automatiques
5. Phase 1.5 & 1.6 - Détection auto séance + Horaires fixes (quand plans d'entraînement seront prêts)

### Décisions techniques

- **Readiness Score** : Algorithme 100% backend, pas d'appel IA
- **Export Manuel** : Utilise clipboard API, markdown formaté
- **Chaussures** : Stockage BDD avec description IA pour suggestions
- **Zones HR** : Utilise FCmax personnelle (profile.fcmax ou 220-age)

---

*Dernière mise à jour : 17 novembre 2025*
