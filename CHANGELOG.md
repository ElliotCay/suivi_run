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
- [x] Suggestions - Design sobre avec badges neutres
- [x] Import - Cards uniformes avec buttons outline
- [x] Profile - Layout épuré avec cards sober
- [x] Training Plans - Grid responsive avec boutons compacts

---

### 🎨 Pages Redesignées (Session 2)

#### Page Suggestions
- **Header** : Titre 6xl bold, sous-titre avec compteur
- **Bouton "Générer"** : Variant outline, size sm
- **Badges** : Couleurs neutres (bg-muted au lieu de green/orange/red)
- **Cards** : Hover shadow-md, padding compact (p-4)
- **Sections** : Titres "Structure" et "Raison" en text-sm font-bold
- **Metadata** : Séparateurs bullet (•) au lieu de texte "Modèle:", "Tokens:"

#### Page Import
- **Header** : Titre 6xl bold "Import"
- **Cards** : 3 sections (Strava, Auto-Import, Manuel)
- **Status boxes** : bg-muted au lieu de couleurs green/blue
- **Boutons** : Tous en variant outline size sm
- **Textes** : Titres font-bold, descriptions text-muted-foreground

#### Page Profile
- **Header** : Titre 6xl bold "Profil"
- **Cards** : Hover shadow-md, headers pb-3
- **Blessures** : Border-l-2 border-foreground au lieu de border-l-4 border-red-500
- **Équipement** : Labels font-bold, valeurs text-muted-foreground
- **Save button** : Variant outline size sm

#### Page Training Plans
- **Header** : Titre 6xl bold "Plans"
- **Bouton "Nouveau"** : Variant outline size sm avec icon Plus
- **Filtres** : Size sm pour tous les boutons
- **Grid** : Gap-3 au lieu de gap-4
- **Empty state** : Padding 16, titre font-bold text-base

---

## Prochaines Étapes
- Tests UI/UX sur toutes les pages
- Optimiser les graphiques pour mobile (si besoin futur)
