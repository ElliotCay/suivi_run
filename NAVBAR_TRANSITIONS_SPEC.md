# Cahier des charges : Transitions Navbar Allure

## Vue d'ensemble

Ce document définit les spécifications complètes des transitions entre les 3 modes de navigation de l'application Allure.

### Modes disponibles
1. **Classic** : 3 pills séparées (logo gauche, nav centrale, thème droite)
2. **Floating** : 1 pill centrale unifiée avec tous les éléments
3. **Compact** : 1 pill centrale avec icons uniquement, collapse au scroll

### Principe de design
Les transitions doivent être **fluides, naturelles et réversibles**. Chaque animation doit respecter la philosophie Allure : sophistication, clarté, mouvement organique.

---

## 1. Transitions entre modes

### 1.1 Classic → Floating (MERGE)

**Comportement** :
- La **pill centrale** (nav items) reste fixe et sert d'ancre
- La **pill gauche** (logo "allure") se déplace vers la droite et fusionne avec la pill centrale
- La **pill droite** (toggle thème) se déplace vers la gauche et fusionne avec la pill centrale
- Résultat : 1 pill centrale unifiée contenant logo + nav + thème

**Séquence d'animation** :
1. **Phase 1** (0-300ms) : Déplacement
   - Pill gauche translate vers droite avec `ease-in-out`
   - Pill droite translate vers gauche avec `ease-in-out`
   - Pill centrale reste fixe mais commence à s'élargir

2. **Phase 2** (200-400ms) : Fusion
   - Les 3 pills se chevauchent progressivement
   - Fade in d'un separator entre logo et nav (ligne verticale)
   - Fade in d'un separator entre nav et thème
   - Bordures externes fusionnent en une seule pill

3. **Phase 3** (400-500ms) : Stabilisation
   - Micro bounce subtil (scale 1.0 → 1.02 → 1.0)
   - Opacité finale à 100%

**Propriétés animées** :
- `transform` : translateX pour pills gauche/droite
- `width` : expansion de la pill centrale
- `opacity` : fade in des separators
- `border-radius` : ajustement progressif
- `scale` : bounce final

---

### 1.2 Floating → Classic (SPLIT)

**Comportement** :
- **Inverse exact** de Classic → Floating
- La pill centrale se sépare en 3 pills distinctes
- La pill centrale reste fixe, les deux autres s'éloignent

**Séquence d'animation** :
1. **Phase 1** (0-100ms) : Préparation
   - Micro shrink (scale 1.0 → 0.98)
   - Fade out des separators internes

2. **Phase 2** (100-300ms) : Séparation
   - Pill gauche (logo) apparaît et translate vers la gauche
   - Pill droite (thème) apparaît et translate vers la droite
   - Pill centrale rétrécit pour ne contenir que nav items

3. **Phase 3** (300-400ms) : Stabilisation
   - Les 3 pills prennent leur position finale
   - Bordures individuelles se forment
   - Ombres individuelles apparaissent

**Propriétés animées** :
- `transform` : translateX pour pills gauche/droite (inverse)
- `width` : réduction de la pill centrale
- `opacity` : fade out des separators, fade in des pills séparées
- `border-radius` : formation des pills individuelles
- `scale` : micro shrink initial

---

### 1.3 Floating → Compact (REDUCTION)

**Comportement** :
- La pill reste centrée et unifiée
- Les **labels des nav items** disparaissent progressivement
- Seuls les **icons** restent visibles
- La pill se rétrécit horizontalement pour s'adapter

**Séquence d'animation** :
1. **Phase 1** (0-200ms) : Fade des labels
   - Labels `opacity: 1 → 0`
   - Labels `max-width: 100px → 0`
   - Labels `margin-left: 8px → 0`

2. **Phase 2** (100-300ms) : Rétrécissement
   - Pill `width` se réduit pour s'adapter aux icons
   - Espacement entre items diminue légèrement
   - Logo "allure" reste visible et taille normale

**Propriétés animées** :
- `opacity` : fade des labels
- `max-width` : collapse des labels
- `margin-left` : espacement des labels
- `width` : taille globale de la pill

---

### 1.4 Compact → Floating (EXPANSION)

**Comportement** :
- **Inverse exact** de Floating → Compact
- Les labels réapparaissent progressivement
- La pill s'élargit pour accueillir le texte

**Séquence d'animation** :
1. **Phase 1** (0-200ms) : Élargissement
   - Pill `width` augmente anticipativement
   - Espacement entre items augmente

2. **Phase 2** (100-300ms) : Apparition des labels
   - Labels `max-width: 0 → 100px`
   - Labels `opacity: 0 → 1`
   - Labels `margin-left: 0 → 8px`

**Propriétés animées** :
- `width` : taille globale de la pill
- `opacity` : fade in des labels
- `max-width` : expansion des labels
- `margin-left` : espacement des labels

---

### 1.5 Classic → Compact (MERGE + REDUCTION)

**Comportement** :
- Combine les deux transitions précédentes
- D'abord : merge Classic → Floating (300-500ms)
- Ensuite : reduction Floating → Compact (200-300ms)
- **Total : ~800ms**

**Séquence d'animation** :
1. **Phases 1-3** : Identique à Classic → Floating (0-500ms)
2. **Phase 4** : Courte pause (500-550ms)
3. **Phases 5-6** : Identique à Floating → Compact (550-800ms)

---

### 1.6 Compact → Classic (EXPANSION + SPLIT)

**Comportement** :
- **Important** : Si Compact est en état `scrolled` (collapsed), il doit d'abord `uncollapse`
- Ensuite : expansion Compact → Floating
- Puis : split Floating → Classic

**Séquence d'animation** :

**Cas 1 : Compact NOT scrolled → Classic**
1. **Phases 1-2** : Identique à Compact → Floating (0-300ms)
2. **Phase 3** : Courte pause (300-350ms)
3. **Phases 4-6** : Identique à Floating → Classic (350-750ms)
- **Total : ~750ms**

**Cas 2 : Compact scrolled (collapsed) → Classic**
1. **Phase 0** : Uncollapse (0-400ms)
   - Nav items container `max-width: 0 → full`
   - Nav items container `opacity: 0 → 1`
   - Thème toggle apparaît
   - Logo glisse de centre vers gauche de la pill

2. **Phases 1-2** : Identique à Compact → Floating (400-700ms)
3. **Phase 3** : Courte pause (700-750ms)
4. **Phases 4-6** : Identique à Floating → Classic (750-1150ms)
- **Total : ~1150ms**

---

## 2. Comportement au scroll

### 2.1 Mode Classic
- **Aucun changement** au scroll
- Les 3 pills restent visibles et fixes
- Position : `sticky top-4`

### 2.2 Mode Floating
- **Aucun changement** au scroll
- La pill reste complète avec tous les éléments
- Position : `sticky top-2`

### 2.3 Mode Compact
- **Collapse au scroll** (scroll > 32px)
- Animation de collapse (0-400ms) :
  - Nav items container `max-width: 800px → 0`
  - Nav items container `opacity: 1 → 0`
  - Thème toggle `max-width: 120px → 0` et `opacity: 1 → 0`
  - Logo "allure" reste visible et se centre
  - Pill `gap: 12px → 0`

- **Uncollapse** (scroll retourne en haut ou hover) :
  - Inverse de l'animation ci-dessus (0-400ms)
  - Les éléments réapparaissent de gauche à droite

### 2.4 Interaction hover en Compact scrolled
- Au hover sur la pill collapsed :
  - Trigger l'animation d'uncollapse
  - Reste uncollapsed tant que hover actif
  - Re-collapse au mouse leave (si toujours scrolled)

---

## 3. Architecture technique

### 3.1 Structure des composants

```
Navigation.tsx (state manager)
├── State: mode ('classic' | 'floating' | 'compact')
├── State: scrolled (boolean)
├── State: isTransitioning (boolean)
└── Persist: localStorage + CustomEvent

NavbarOrchestrator.tsx (transition controller)
├── AnimatePresence mode="wait"
├── Détection des transitions (mode changes)
├── Orchestration des séquences
└── Lock pendant les transitions

NavbarClassic.tsx (3 pills séparées)
├── motion.div (pill gauche - logo)
│   └── layoutId="navbar-logo"
├── motion.div (pill centrale - nav)
│   └── layoutId="navbar-nav"
└── motion.div (pill droite - thème)
    └── layoutId="navbar-theme"

NavbarFloating.tsx (1 pill unifiée)
└── motion.div (pill principale)
    ├── motion.div (logo) → layoutId="navbar-logo"
    ├── motion.div (nav) → layoutId="navbar-nav"
    └── motion.div (thème) → layoutId="navbar-theme"

NavbarCompact.tsx (1 pill avec collapse)
└── motion.div (pill principale)
    ├── motion.div (logo) → layoutId="navbar-logo"
    ├── motion.div (nav - icons only) → layoutId="navbar-nav"
    └── motion.div (thème) → layoutId="navbar-theme"
    └── State: isHovered (pour uncollapse)
```

### 3.2 Shared layoutId (Framer Motion)

Pour permettre les transitions fluides entre composants :

- `layoutId="navbar-logo"` : Logo "allure" (partagé entre tous)
- `layoutId="navbar-theme"` : Toggle thème (partagé entre tous)
- `layoutId="navbar-nav"` : Container des nav items (partagé)
- `layoutId="nav-item-{href}"` : Chaque nav item individuel (optionnel)

**Important** : Les éléments avec le même `layoutId` sont animés automatiquement par Framer Motion lors du changement de composant.

### 3.3 Gestion d'état

```typescript
// Navigation.tsx
const [mode, setMode] = useState<NavbarMode>('floating')
const [scrolled, setScrolled] = useState(false)
const [isTransitioning, setIsTransitioning] = useState(false)

// Lock les changements pendant transition
const changeMode = (newMode: NavbarMode) => {
  if (isTransitioning) return // Ignore les clics rapides

  setIsTransitioning(true)
  setMode(newMode)
  localStorage.setItem('navbar-preference', newMode)

  // Unlock après durée max de transition
  setTimeout(() => setIsTransitioning(false), 1200)
}

// Scroll detection
useEffect(() => {
  const handleScroll = () => {
    setScrolled(window.scrollY > 32)
  }
  window.addEventListener('scroll', handleScroll, { passive: true })
  return () => window.removeEventListener('scroll', handleScroll)
}, [])
```

### 3.4 Prévention des états résiduels

**Problème** : Framer Motion peut laisser des inline styles après animation.

**Solutions** :
1. **Key unique** par mode : `key={mode}` force un remount complet
2. **Cleanup explicite** : `onAnimationComplete` pour reset les styles
3. **Reset CSS** : Classes utilitaires pour override
4. **Initial states** : Définir explicitement `initial` pour chaque motion.div

```typescript
// Exemple
<motion.div
  key={mode} // Force remount
  layoutId="navbar-logo"
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.9 }}
  onAnimationComplete={() => {
    // Cleanup si nécessaire
  }}
/>
```

---

## 4. Timing et easing

### 4.1 Courbes d'animation

**Spring naturel** (défaut pour layoutId) :
```typescript
transition={{
  type: "spring",
  stiffness: 300,
  damping: 30
}}
```

**Ease personnalisé** (pour fades et scales) :
```typescript
transition={{
  duration: 0.3,
  ease: [0.25, 0.1, 0.25, 1] // Cubic bezier smooth
}}
```

### 4.2 Durées par transition

| Transition | Durée totale | Notes |
|------------|--------------|-------|
| Classic ↔ Floating | 500ms | Merge/split fluide |
| Floating ↔ Compact | 300ms | Simple fade labels |
| Classic ↔ Compact | 800ms | Combo des deux |
| Compact scrolled → Classic | 1150ms | Avec uncollapse |
| Collapse/Uncollapse (scroll) | 400ms | Réactif mais pas brutal |

---

## 5. Card de sélection dans les réglages

### 5.1 Preview en temps réel

La `NavbarStyleCard` doit afficher un **preview animé** de chaque mode :
- Miniature 3D de chaque navbar
- Animation en loop subtile pour montrer le concept
- Highlight du mode actif avec Allure gradient

### 5.2 Interaction

Au clic sur un mode :
1. Update de l'état dans `Navigation.tsx`
2. Transition immédiate de la vraie navbar (visible en haut)
3. Update du preview dans la card (highlight)
4. Sauvegarde dans localStorage

---

## 6. Edge cases et gestion d'erreurs

### 6.1 Changement rapide de mode

**Problème** : Utilisateur clique plusieurs fois rapidement.

**Solution** :
- Lock avec `isTransitioning` state
- Ignore les clics pendant animation
- Queue optionnelle pour le dernier clic (si souhaité)

### 6.2 Scroll pendant transition

**Problème** : Utilisateur scroll pendant Classic → Compact.

**Solution** :
- Les animations de mode ont priorité
- Le scroll state est mémorisé mais n'affecte pas la transition en cours
- Une fois la transition terminée, appliquer l'état de scroll

### 6.3 Resize pendant animation

**Problème** : Window resize pendant une transition.

**Solution** :
- Framer Motion recalcule automatiquement avec `layout`
- S'assurer que les breakpoints responsive n'interfèrent pas

### 6.4 Navigation page pendant transition

**Problème** : Utilisateur clique sur un lien nav pendant l'animation.

**Solution** :
- Les liens restent cliquables (navigation prioritaire)
- La transition continue en background
- Le nouvel active state s'applique immédiatement

### 6.5 Thème change pendant transition

**Problème** : Toggle dark/light pendant animation.

**Solution** :
- Le thème change immédiatement (colors CSS)
- Les animations de position/taille continuent normalement
- Les nouvelles couleurs s'appliquent avec transition CSS courte (150ms)

---

## 7. Conformité avec ALLURE_DESIGN_PHILOSOPHY.md

### 7.1 Liquid Glass
- Maintenir `bg-white/5`, `backdrop-blur-xl` dans tous les modes
- Super Glass style (`blur(40px) saturate(150%)`) sur les pills
- Subtle noise texture si applicable

### 7.2 Organic Motion
- Utiliser des spring animations (pas des linear)
- Micro bounce à la fin des transitions
- Pas de hard cuts, tout doit flow

### 7.3 Sober Palette
- Pas de couleurs flashy pendant les transitions
- Allure gradient uniquement pour les accents subtils
- Borders `border-white/10` cohérents

### 7.4 Typography
- Logo "allure" en `font-branch` à tout moment
- Pas de changement de taille de font pendant transition
- Labels en `font-sans` (Outfit)

---

## 8. Plan d'implémentation (6 phases)

### Phase 1 : Structure et composants statiques
- [ ] Créer `NavbarClassic.tsx` avec 3 pills séparées
- [ ] Créer `NavbarFloating.tsx` avec 1 pill unifiée
- [ ] Créer `NavbarCompact.tsx` avec icons only
- [ ] Appliquer les layoutId sur tous les shared elements
- [ ] Tester le rendu statique de chaque mode

### Phase 2 : Système de transition Classic ↔ Floating
- [ ] Implémenter le merge (Classic → Floating)
- [ ] Tester la trajectoire (pill centrale fixe)
- [ ] Implémenter le split (Floating → Classic)
- [ ] Vérifier la réversibilité exacte
- [ ] Polish timing et easing

### Phase 3 : Système de transition Floating ↔ Compact
- [ ] Implémenter la réduction (labels fade out)
- [ ] Implémenter l'expansion (labels fade in)
- [ ] Tester la réversibilité
- [ ] Ajuster les durées

### Phase 4 : Transitions combinées
- [ ] Classic ↔ Compact (séquence merge + reduction)
- [ ] Tester les pauses entre phases
- [ ] Optimiser les durées totales

### Phase 5 : Gestion du scroll en mode Compact
- [ ] Implémenter le collapse au scroll
- [ ] Implémenter l'uncollapse (scroll up + hover)
- [ ] Intégrer l'uncollapse dans Compact → Classic
- [ ] Tester tous les cas (scrolled/not scrolled)

### Phase 6 : Polish et optimisation
- [ ] Prévention des états résiduels
- [ ] Gestion des edge cases
- [ ] Performance optimization (will-change, transform)
- [ ] Tests sur différents devices
- [ ] Integration avec NavbarStyleCard dans settings

---

## 9. Critères de validation

Une transition est considérée **parfaite** si :

✅ Aucun saut visuel (smooth à 60fps)
✅ Aucune classe résiduelle après animation
✅ Réversibilité exacte (A→B puis B→A revient à l'état initial)
✅ Timing naturel (ni trop rapide, ni trop lent)
✅ Cohérence avec la philosophie Allure
✅ Fonctionne sur tous les breakpoints responsive
✅ Pas de flash de contenu non stylé (FOUC)
✅ Les interactions (clics, hover) restent fonctionnelles

---

## 10. Notes techniques importantes

### 10.1 Framer Motion layoutId

**Comportement** : Quand deux composants dans des arbres différents partagent le même `layoutId`, Framer Motion crée automatiquement une transition smooth entre leurs positions/tailles.

**Limitation** : Fonctionne seulement entre composants qui sont rendus dans le même `AnimatePresence` ou dans des arbres frères.

**Notre approche** :
- Tous les modes (Classic, Floating, Compact) sont dans le même `NavbarOrchestrator`
- Les layoutId sont partagés pour logo, nav, thème
- Les transitions sont automatiques grâce à layout prop

### 10.2 Performance

Les propriétés animées qui ne déclenchent **pas** de reflow (GPU accelerated) :
- `transform` (translate, scale, rotate)
- `opacity`
- `filter` (blur, saturate)

Les propriétés qui **déclenchent** des reflows (à limiter) :
- `width`, `height` (utiliser scale à la place si possible)
- `padding`, `margin`
- `border-radius` (OK en petite quantité)

**Recommandation** : Utiliser `transform` au maximum, width/padding seulement si nécessaire.

### 10.3 Z-index et stacking context

Pendant les transitions, s'assurer que :
- La navbar a toujours `z-index: 50` minimum
- Les pills en transition ne passent pas derrière le contenu
- Le toggle button de dev reste au-dessus (`z-index: 9999`)

---

**Document version** : 1.0
**Date** : 2025-01-24
**Status** : ✅ Validé et prêt pour implémentation

Ce cahier des charges fait autorité pour toute l'implémentation des transitions navbar. Toute modification doit être documentée ici.
