# Allure - Brand Guidelines & Graphic Coherence

## Brand Identity

### Brand Name
- **Name**: allure (lowercase only)
- **Tagline**: "Courez plus vite. Entraînez-vous avec intelligence."

### Typography
- **Primary Font**: Branch
  - Path: `/frontend/app/fonts/Branch.otf`
  - Usage: Logo, headlines, primary brand elements
  - Features: Elegant ligatures, sophisticated appearance

### Logo Specifications

#### Logo Assets
1. **Mono Black**: `/public/chatgpt-runner-mono.png`
   - Use case: Light backgrounds, standard applications
2. **Mono White**: `/public/chatgpt-runner-mono.png` with CSS filter `brightness-0 invert`
   - Use case: Dark backgrounds, dark mode
3. **Gradient**: `/public/chatgpt-runner-gradient.png`
   - Use case: Hero sections, premium placements

#### Logo Size
- **Standard size**: 112px × 112px
- Scales proportionally for different contexts

#### Logo-to-Text Spacing

**CRITICAL SPACING STANDARDS:**

1. **Gradient Logo Versions**
   - Spacing: `gap-1` (4px)
   - TailwindCSS: `gap-1`
   - Use case: Gradient runner icon + "allure" text

   ```tsx
   <div className="flex items-center gap-1">
     <Image src="/chatgpt-runner-gradient.png" width={112} height={112} />
     <span className="font-[family-name:var(--font-branch)] text-6xl">allure</span>
   </div>
   ```

2. **Mono Versions (Black & White)**
   - Spacing: **Overlap -4px** (`-ml-1`)
   - TailwindCSS: `gap-0 -ml-1` (on text element)
   - Use case: Mono black or white runner icon + "allure" text

   ```tsx
   {/* Mono Black */}
   <div className="flex items-center gap-0">
     <Image src="/chatgpt-runner-mono.png" width={112} height={112} />
     <span className="font-[family-name:var(--font-branch)] text-6xl -ml-1">allure</span>
   </div>

   {/* Mono White */}
   <div className="flex items-center gap-0 text-white">
     <Image
       src="/chatgpt-runner-mono.png"
       width={112}
       height={112}
       className="brightness-0 invert"
     />
     <span className="font-[family-name:var(--font-branch)] text-6xl text-white -ml-1">
       allure
     </span>
   </div>
   ```

3. **With Gradient Square Background**
   - Spacing: `gap-6` (24px)
   - Use mono black logo on gradient square
   - Use case: Premium cards, featured placements

   ```tsx
   <div className="flex items-center gap-6">
     <div className="w-24 h-24 rounded-3xl shadow-xl p-3"
          style={{background: 'linear-gradient(135deg, #fdab01 0%, #fea501 10%, #f8985c 20%, #e77491 30%, #d5639e 40%, #d55f9b 50%, #c964b4 70%, #9c65f6 85%, #aa51fb 100%)'}}>
       <Image src="/chatgpt-runner-mono.png" width={112} height={112} className="w-full h-full object-contain" />
     </div>
     <span className="font-[family-name:var(--font-branch)] text-6xl">allure</span>
   </div>
   ```

### Color Palette

#### Gradient (Primary Brand Gradient)
Apple-inspired gradient used for premium elements:
```css
background: linear-gradient(
  135deg,
  #fdab01 0%,
  #fea501 10%,
  #f8985c 20%,
  #e77491 30%,
  #d5639e 40%,
  #d55f9b 50%,
  #c964b4 70%,
  #9c65f6 85%,
  #aa51fb 100%
)
```

#### Alternate Gradient (Intelligence)
Purple-blue gradient for AI/intelligence messaging:
```css
background: linear-gradient(
  90deg,
  #ee95b3 0%,
  #ce8fc8 14%,
  #a683d5 28%,
  #9f87dd 42%,
  #8f8cdd 57%,
  #7e98e3 71%,
  #6a92d8 85%,
  #667abf 100%
)
```

### Background Assets

#### Hero Background
- **File**: `/public/allure-background.png`
- **Description**: Mountain landscape with runner and cows, misty atmosphere
- **Usage**: Fixed background on homepage
- **Opacity**: 20% for subtle atmospheric effect
- **Implementation**:
  ```tsx
  <div className="fixed inset-0 z-0">
    <Image
      src="/allure-background.png"
      alt="Mountain landscape background"
      fill
      className="object-cover opacity-20"
      priority
    />
  </div>
  ```

### CSS Filters for Logo Variations

#### White Logo from Black
```css
.brightness-0 .invert
```
Converts black mono logo to white for dark backgrounds.

### Design Principles

1. **Minimalism**: Clean, uncluttered layouts
2. **Premium Feel**: Use gradients sparingly for impact
3. **Performance Focus**: Everything serves the runner's goals
4. **Typography First**: Branch font creates elegant, sophisticated identity
5. **Consistent Spacing**: Strictly adhere to spacing standards for brand recognition

### Logo Don'ts

- Don't change the spacing standards (always gap-1 for gradient, -ml-1 for mono)
- Don't use uppercase "ALLURE" or "Allure" - always lowercase
- Don't recreate or modify the runner icon design
- Don't use the logo smaller than 64px (readability threshold)
- Don't place gradient logo on busy backgrounds without sufficient contrast
- Don't apply additional filters or effects beyond specified white conversion

### File Structure

```
/frontend/public/
├── chatgpt-runner-mono.png      # Black mono runner icon
├── chatgpt-runner-gradient.png  # Gradient runner icon
├── allure-background.png        # Hero background image
└── icon.png                     # App icon (for legacy references)

/frontend/app/fonts/
└── Branch.otf                   # Primary brand font
```

### Version History

- **v1.0** (2025-11-12): Initial brand guidelines
  - Established "allure" as brand name
  - Defined spacing standards: gap-1 (gradient), overlap -4px (mono)
  - Integrated ChatGPT runner icons
  - Added mountain landscape background

---

**Last updated**: November 12, 2025
**Maintained by**: Elliot Cayuela
**Review cycle**: Quarterly or as needed for major updates
