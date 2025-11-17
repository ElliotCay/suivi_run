# Allure Design Philosophy

## Core Identity
**Allure** is a premium, minimalist AI running coach that emphasizes sophistication, clarity, and purpose. Every design decision should reflect the mindset of a dedicated athlete—focused, intentional, and uncluttered.

## Visual Language

### Typography
- **Bold, confident headlines**: Large sizes (text-6xl for page titles), tight tracking (-0.02em)
- **Clear hierarchy**: Size and weight differentiate importance, not color
- **Monospace for data**: Metrics like pace, time, and duration use tabular numbers for precision
- **Minimal decoration**: No emojis, icons only when absolutely necessary

### Color & Contrast
- **Sober minimal palette**: Warm off-white (#FAFAF9) background, near-black (#1A1A1A) text
- **Allure gradient identity**: `linear-gradient(90deg, #ee95b3 → #667abf)` used sparingly for brand moments
- **Workout type colors**: Semantic colors for training zones (green=easy, orange=tempo, red=intervals)
- **High contrast dark mode**: Deep black (#0A0A0A) with careful luminosity adjustments

### Layout Principles
- **Generous white space**: Breathing room between elements (space-y-6 to space-y-8)
- **Bento grid system**: 12-column responsive grid with thoughtful col-spans
- **Uniform card heights**: Visual consistency (e.g., 130px, 140px for different contexts)
- **Strategic emphasis**: Important elements get more space (e.g., Semi/Marathon at col-span-6)

### Interaction Design
- **Hover states**: Subtle shadows (hover:shadow-lg) and transitions (duration-300)
- **Glassmorphism (selective)**: Used sparingly for navigation (`backdrop-filter: blur(40px)`)
- **Gradient borders on hover**: Allure gradient appears as card border on hover for premium feel
- **Smooth animations**: Framer Motion for page transitions and element reveals

## Content Philosophy

### Information Architecture
1. **Lead with summary, not forms**: Show current state before edit mode
2. **Progressive disclosure**: Hide complexity until needed (dialogs, accordions)
3. **Clear hierarchy**: What matters most appears first and largest
4. **Contextual data**: Show metrics with their meaning (e.g., "7d/28d ratio" not just numbers)

### Writing Style
- **Concise labels**: "Volume 7j" not "Volume hebdomadaire des 7 derniers jours"
- **French language**: Authentic French, not translated English
- **No jargon overload**: Balance technical terms with accessibility
- **Action-oriented**: CTAs are clear ("Ajouter un record", "Importer mes séances")

## What Allure Is NOT

### Rejected Patterns
- ❌ **Colorful badges everywhere**: We tried workout type badges—too noisy
- ❌ **Icons for everything**: Icons broke the "classe" aesthetic on Records page
- ❌ **Summary cards with stats**: Removed from Records page—redundant and biased
- ❌ **Gradient backgrounds**: Rejected for Dashboard—overwhelming
- ❌ **Dense forms**: No wall of input fields—use read/edit modes

### Anti-Patterns
- **Over-decoration**: More icons ≠ better UX
- **Trendy for trendy's sake**: Glassmorphism everywhere = gimmicky
- **Cognitive overload**: Too many metrics at once = confusion
- **Administrative feel**: Forms that feel like paperwork, not athletic tools

## Key Design Decisions (Historical Context)

### Homepage
- Added overlay gradient for text contrast without darkening entire image
- Strava logo in native orange (#FC4C02) for authenticity
- Navbar opacity: 35% on light mode homepage (iteratively refined)
- Logo size: 101px (10% reduction for better proportions)

### Dashboard
- Rejected gradient background, kept sober palette
- Added gradient border on hover for cards (Allure identity)
- Increased spacing: gap-3 → gap-4, space-y-6 → space-y-8
- Training load with emoji + color-coded message (💪 = optimal)

### Séances (Workouts)
- Rejected colored badges (visibility issues in dark mode)
- Chose vertical gradient bars (3px) for workout type categorization
- Typography hierarchy: date less prominent than distance/pace
- Right padding (pr-6) for balance

### Records
- Rejected all summary options (cards, inline, sidebar)
- Chose pure minimalist grid: 3 columns, uniform 140px height
- Semi/Marathon at col-span-6 to emphasize long distances
- "NEW" badge with Allure gradient for most recent record(s)
- Removed all icons (Award broke the aesthetic)

## Design Decision Framework

When evaluating a new feature or layout:

1. **Does it serve the athlete's goals?** (Performance tracking, improvement, clarity)
2. **Is it the simplest solution?** (Minimal > maximal)
3. **Does it maintain visual coherence?** (Consistency with existing pages)
4. **Is it authentic to the running experience?** (Not generic SaaS dashboard)
5. **Does it respect the user's attention?** (No unnecessary decoration)

### Hierarchy of Importance
1. **Clarity of data** (athlete needs to understand their performance)
2. **Visual consistency** (coherent experience across pages)
3. **Brand identity** (Allure gradient, sober palette, confident typography)
4. **Delight** (subtle animations, NEW badges, celebration modals)

## Technical Implementation Notes

### Font Stack
- **Magilio**: Primary font (loaded locally)
- **Branch**: Logo and special headings (allure branding)
- Multiple display fonts available but used sparingly

### Responsive Approach
- Mobile-first grid system (grid-cols-12)
- Breakpoints: `md:`, `lg:` for larger screens
- Cards adapt gracefully (col-span adjustments)

### Performance
- Local fonts with `display: swap`
- Optimized images (WebP, proper sizing)
- React 19 + Next.js 14+ (app router, RSC)

---

**Last updated**: Session on Records page redesign (2025)

This document should guide future design decisions and maintain consistency as Allure evolves.
