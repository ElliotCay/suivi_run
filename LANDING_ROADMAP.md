# Landing Page Roadmap

## Phase actuelle (v1) - Conversation iMessage

### Implémenté
- [x] Conversation interactive avec deux chemins (oui/non)
- [x] Typing indicator style iMessage (3 points animés)
- [x] Sons de chat (send/receive) via Web Audio API
- [x] Effet parallax sur le background au mouvement de souris
- [x] Micro-interactions sur les boutons (hover scale, tap scale)
- [x] Easter egg après 15s d'inactivité
- [x] Sections dépliables "En savoir plus"
- [x] CTA Strava raffiné

---

## Phase 2 - Onboarding interactif étendu

### Objectif
Personnaliser davantage l'expérience en posant des questions supplémentaires.

### Idées
- Demander le niveau de l'utilisateur (débutant, intermédiaire, confirmé)
- Demander l'objectif (5K, 10K, semi-marathon, marathon, ultra)
- Demander la fréquence d'entraînement actuelle
- Adapter le message final en fonction des réponses
- Montrer un aperçu personnalisé de ce qu'Allure pourrait faire pour eux

### Priorité : Moyenne

---

## Phase 3 - Transition fluide vers l'app

### Objectif
Créer une transition immersive entre la landing page et le dashboard.

### Idées
- Le background zoome légèrement au clic sur le CTA
- Les bulles de chat s'estompent progressivement
- Le dashboard "émerge" de l'écran avec un effet de slide/fade
- Animation de "loading" élégante pendant la connexion Strava
- Confettis ou célébration subtile après connexion réussie

### Priorité : Basse (complexité élevée)

---

## Phase 4 - Améliorations UX

### Idées diverses
- Animation d'entrée du logo "allure" (encre qui coule / révélation gradient)
- Sound design plus sophistiqué (vrais fichiers audio au lieu de Web Audio)
- Effet de "pulse" sur le CTA pour attirer l'attention
- Mode sombre/clair automatique basé sur l'heure
- Scroll snap pour une expérience "story" (si on ajoute du contenu)
- Vidéo de démonstration dans une bulle de chat

### Priorité : Basse

---

## Notes techniques

### Sons
Actuellement générés via Web Audio API pour éviter les fichiers externes.
Pour des sons plus sophistiqués, envisager :
- Fichiers .mp3/.wav dans /public/sounds/
- Bibliothèque comme Howler.js pour meilleure gestion

### Performance
- Le parallax utilise CSS transform (GPU-accelerated)
- Les animations Framer Motion sont optimisées
- Les images de background devraient être optimisées (WebP, compression)

### Accessibilité
- Prévoir option pour désactiver les sons
- Prévoir option pour réduire les animations (prefers-reduced-motion)
- S'assurer du contraste suffisant sur les textes
