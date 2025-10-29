# Roadmap - Suivi Course

## Fonctionnalités à développer

### 1. Synchronisation Apple Health ↔ App (via iCloud Drive)
- [x] Auto-détection du fichier export.zip dans iCloud Drive
- [x] Import automatique toutes les 60 secondes
- [x] Détection des doublons (évite re-import)
- [x] Interface de statut dans /import
- [ ] Tests de la synchronisation
  - [ ] Test détection nouveau fichier
  - [ ] Test modification fichier existant
  - [ ] Test import sans doublons
  - [ ] Test après re-export complet Apple Health
  - [ ] Test gestion erreurs (fichier corrompu, etc.)

**Documentation existante**: `TEST_IMPORT_AUTO.md`

### 2. Synchronisation Calendrier (Séances ↔ iCal)
- [ ] Export des séances planifiées vers le calendrier (iCal format)
- [ ] Configuration du format d'export
- [ ] Notifications/rappels pour les séances planifiées
- [ ] Mise à jour automatique lors de modifications de suggestions
- [ ] Tests de la synchronisation
  - [ ] Test création événement calendrier
  - [ ] Test mise à jour événement existant
  - [ ] Test suppression événement
  - [ ] Test format iCal valide
  - [ ] Test gestion des fuseaux horaires

### 2. Personnalisation des Suggestions IA
- [ ] Interface de configuration des préférences utilisateur
- [ ] Paramètres à ajouter :
  - Types de séances favoris (VMA, seuil, fartlek, etc.)
  - Plages de distance préférées
  - Jours d'entraînement habituels
  - Durée maximale/minimale des séances
  - Préférences de structure (échauffement, séries, récup, etc.)
- [ ] Intégration des préférences dans les prompts Claude
- [ ] Sauvegarde des préférences dans le profil utilisateur
