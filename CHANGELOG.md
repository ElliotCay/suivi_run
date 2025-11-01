# Changelog - Suivi Course

## 2025-01-31 - Design Refonte 2025 + Merge Intelligent Workouts

### 🔄 Système de Merge Intelligent Strava + Apple Watch

#### Problème résolu
- **Doublons** : Chaque séance importée 2 fois (Strava + Apple Watch)
- **Volume doublé** : Dashboard affichait 2x le kilométrage réel
- **Timezone** : Décalage d'1h entre les deux sources

#### Solution implémentée
**Merge intelligent** des workouts dupliqués :
- **Base : Strava** (garde best_efforts pour les records)
- **Enrichissement : Apple Watch** (pour données manquantes/meilleures)

#### Règles de merge
```
Workout fusionné = {
  distance: Strava (plus précis)
  best_efforts: Strava ✅
  avg_hr: Apple Watch si meilleur
  max_hr: Apple Watch si meilleur
  elevation_gain: Apple Watch (plus fiable)
  source: "strava"
  raw_data.merged_from: ["strava", "apple_watch"]
}
```

#### Résultats
- **43 doublons mergés** automatiquement
- **Dénivelés améliorés** : Apple Watch souvent 5-10x plus réaliste que Strava
- **Volume correct** : Dashboard affiche maintenant les vrais kilomètres
- **Records préservés** : best_efforts Strava conservés

#### Fichiers créés
- `services/workout_merge_service.py` : Logique de merge
- `scripts/merge_duplicates.py` : Script de nettoyage manuel
- Intégration dans `routers/import_router.py` : Détection automatique futurs imports

---

## 2025-01-31 - Design Refonte 2025

### 🎨 Nouveau Design Sobre Minimaliste

#### Système de Couleurs
- **Palette sobre** : Off-white (#FAFAF9), noir (#1A1A1A), gris discrets
- **Dark mode sophistiqué** : Noir profond (#0A0A0A) avec variations subtiles
- **Accent discret** : Vert forêt (#2D7A5F) pour les records
- **Fini** : Gradients bleu-purple clichés 2023/2024 retirés

#### Page Records - Bento Grid Layout
- **Layout asymétrique** : Cartes de tailles variées (col-span-3/4/6)
- **5km, 10km** : Cartes hero 6x2 (grandes)
- **15km, Semi, Marathon** : Cartes 4x2 (moyennes-grandes)
- **Distances courtes** (400m, 500m, 800m, 1km, 1 mile, 2km, 3km) : Cartes compactes
- **Dates affichées** : Toutes les cartes montrent maintenant la date du record
- Grid responsive 12 colonnes avec auto-rows

#### Typographie Bold
- Font-weight 700 pour tous les titres
- Letter-spacing négatif (-0.02em) pour modernité
- H1 : 3.5rem (très impactant)
- Kerning et antialiasing optimisés

#### Navigation TopNav
- Logo minimaliste noir/blanc
- Pills discrètes pour navigation active
- Hauteur réduite (14 au lieu de 16)
- Removed : Gradient animations et indicateurs colorés

#### UI Components
- **Dialog** :
  - Forcé style inline `backgroundColor: 'white'` + `opacity: 1` pour garantir opacité complète (fix Firefox)
  - Overlay moderne : `bg-background/40` + `backdrop-blur-md` (glassmorphism 2025 au lieu du noir old school)
- **ActivityHeatmap** : Compact et sobre (titre "Activité", padding réduits, legend plus petite)
- **Animations** : Réduites et subtiles
- **Borders** : Très fines et discrètes
- **Spacing** : Généreux entre éléments

### 🔧 Corrections Techniques
- Retiré `canvas-confetti` du save (trop exubérant)
- Toast simplifié : "Record enregistré" au lieu de "Record enregistré ! 🎉"
- TypeScript : Aucune erreur de compilation

### ✅ Page Dashboard - Bento Grid (Sans trous)
- **Métriques clés** : Layout bento sans espaces vides
  - Volume 7j, FC moyenne, Charge : 3 cartes égales (col-span-4 chacune)
  - Total carrière : Full width (col-span-12)
  - **ActivityHeatmap intégré** : Dans le bento grid, 2 rows (row-span-2)
- **Graphiques** : Section dédiée full-width en dessous
  - Évolution du volume
  - Progression des records
  - Pace vs HR (standalone)
- **Header minimaliste** : Titre 6xl bold, sous-titre discret
- **Hover effects** : Subtiles (shadow-md seulement)

---

### ✅ Pages Redesignées
- [x] Records - Bento grid asymétrique avec dates
- [x] Dashboard - Bento grid + ActivityHeatmap intégré
- [x] Workouts - Liste compacte et lisible
- [ ] Suggestions - À faire
- [ ] Import - À faire
- [ ] Profile - À faire
- [ ] Training Plans - À faire

---

## Prochaines Étapes
- Finaliser le redesign des pages restantes (Suggestions, Import, Profile, Training Plans)
- Optimiser les graphiques pour mobile (si besoin futur)
