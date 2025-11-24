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
Allure is not just a dashboard; it's a living organism. It breathes, flows, and reacts.
The aesthetic is **"Liquid Glass"**: deep, transparent layers that feel like water or premium glass, combined with organic motion.

### The "Wow" Factors
1.  **Liquid Glass**: Deep transparency (`bg-white/5`), heavy blur (`backdrop-blur-xl`), and subtle noise textures.
2.  **Sheen Effects**: Specular reflections that glide across cards on interaction, mimicking light hitting glass.
3.  **Organic Motion**: Everything flows. Cards lift when dragged, details expand fluidly. No hard cuts.

## Typography System
Our typography is a "Tech-Couture" blend: High-performance sport meets high-end editorial.

### 1. The Body (UI & Text) - **Outfit**
*   **Role**: Primary font for all UI elements, body text, and labels.
*   **Why**: Geometric, modern, and athletic. Its rounded forms echo the track and the stopwatch.
*   **Usage**: `font-sans`

### 2. The Soul (Headings & Emotion) - **Magilio**
*   **Role**: Display font for major headings, inspirational quotes, and emphasis.
*   **Why**: Elegant, editorial, and premium. It breaks the "cold tech" feel and adds a human, luxury touch.
*   **Usage**: `font-serif`

### 3. The Engine (Data & Metrics) - **JetBrains Mono**
*   **Role**: All numerical data, paces, distances, and technical details.
*   **Why**: Precision engineering. Monospace ensures perfect alignment of figures.
*   **Special Trick**: Use **Italic** for speed metrics (Pace, Speed) to create a sense of forward motion.
*   **Usage**: `font-mono`

### 4. The Brand (Logo) - **Branch**
*   **Role**: Exclusively for the "allure" logo.
*   **Why**: Organic, unique ligatures that feel like nature.
*   **Usage**: `font-branch` (with forced ligatures)

## Color Palette & Materials
*   **Glass**: Standard `bg-white/5` to `bg-white/10` with `backdrop-blur-xl`.
*   **Super Glass**: For high-priority overlays (Navbar, Floating UI), use `backdrop-blur(40px) saturate(150%)` with subtle inner shadow (`inset 0 1px 0 0 rgba(255, 255, 255, 0.1)`).
*   **Borders**: Ultra-thin `border-white/10` for subtle definition.
*   **Gradients**: The "Allure Gradient" (Pink/Purple/Blue) is used sparingly for accents and "living" elements.
*   **Noise**: A subtle grain texture (`bg-noise`) adds tactility to the glass.

## Interaction Principles
*   **Hover**: Elements should "lift" or "shine" (Sheen effect).
*   **Drag**: Elements become weightless (`opacity-0` on original, lifted shadow on drag).
*   **Feedback**: Instant, fluid response to every touch.

### Layout Principles
- **Generous white space**: Breathing room between elements (space-y-6 to space-y-8)
- **Bento grid system**: 12-column responsive grid with thoughtful col-spans
- **Uniform card heights**: Visual consistency (e.g., 130px, 140px for different contexts)
- **Strategic emphasis**: Important elements get more space (e.g., Semi/Marathon at col-span-6)

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

---

### ❌ Rejected Patterns
- ❌ **Flat Design**: Too boring. We want depth.
- ❌ **Generic Sans-Serifs**: Arial/Inter are too standard. We use Outfit for character.
- ❌ **Static Data**: Numbers should feel alive (use italics/colors).
- ❌ **Heavy Borders**: We use light and shadow, not thick lines.

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
