---
name: apple-design
description: Apply Apple's design system when building UI. Use this skill when the user asks to create Apple-inspired interfaces, wants the Apple aesthetic (clean, minimal, product-hero photography, SF Pro typography, cinematic black/white sections), or references Apple's website design language. Provides complete design tokens, component specs, typography rules, and layout principles.
metadata:
  author: VoltAgent/awesome-design-md
  version: "1.0.0"
---

# Apple-Inspired Design System

This skill provides Apple's complete web design language — color palette, typography, components, layout principles, and responsive behavior. Use it to generate pixel-perfect Apple-style interfaces.

## 1. Visual Theme & Atmosphere

Apple's website is a masterclass in controlled drama — vast expanses of pure black and near-white serve as cinematic backdrops for products that are photographed as if they were sculptures in a gallery. The design philosophy is reductive to its core: every pixel exists in service of the product, and the interface itself retreats until it becomes invisible.

**Key Characteristics:**
- SF Pro Display/Text with optical sizing — letterforms adapt automatically to size context
- Binary light/dark section rhythm: black (`#000000`) alternating with light gray (`#f5f5f7`)
- Single accent color: Apple Blue (`#0071e3`) reserved exclusively for interactive elements
- Product-as-hero photography on solid color fields — no gradients, no textures, no distractions
- Extremely tight headline line-heights (1.07-1.14) creating compressed, billboard-like impact
- Full-width section layout with centered content — the viewport IS the canvas
- Pill-shaped CTAs (980px radius) creating soft, approachable action buttons
- Generous whitespace between sections allowing each product moment to breathe

## 2. Color Palette & Roles

### Primary
- **Pure Black** (`#000000`): Hero section backgrounds, immersive product showcases
- **Light Gray** (`#f5f5f7`): Alternate section backgrounds, informational areas
- **Near Black** (`#1d1d1f`): Primary text on light backgrounds, dark button fills

### Interactive
- **Apple Blue** (`#0071e3`): Primary CTA backgrounds, focus rings — the ONLY chromatic color
- **Link Blue** (`#0066cc`): Inline text links on light backgrounds
- **Bright Blue** (`#2997ff`): Links on dark backgrounds

### Text
- **White** (`#ffffff`): Text on dark backgrounds, button text on blue/dark CTAs
- **Near Black** (`#1d1d1f`): Primary body text on light backgrounds
- **Black 80%** (`rgba(0, 0, 0, 0.8)`): Secondary text, nav items on light backgrounds
- **Black 48%** (`rgba(0, 0, 0, 0.48)`): Tertiary text, disabled states

### Surface & Dark Variants
- **Dark Surface 1** (`#272729`): Card backgrounds in dark sections
- **Dark Surface 2** (`#262628`): Subtle surface variation
- **Dark Surface 3** (`#28282a`): Elevated cards on dark backgrounds
- **Dark Surface 4** (`#2a2a2d`): Highest dark surface elevation
- **Dark Surface 5** (`#242426`): Deepest dark surface tone

### Button States
- **Button Active** (`#ededf2`): Active/pressed state for light buttons
- **Button Default Light** (`#fafafc`): Search/filter button backgrounds
- **Overlay** (`rgba(210, 210, 215, 0.64)`): Media control scrims
- **White 32%** (`rgba(255, 255, 255, 0.32)`): Hover state on dark modal close buttons

### Shadows
- **Card Shadow** (`rgba(0, 0, 0, 0.22) 3px 5px 30px 0px`): Soft, diffused elevation for product cards

## 3. Typography Rules

### Font Family
- **Display** (≥20px): `SF Pro Display`, fallbacks: `SF Pro Icons, Helvetica Neue, Helvetica, Arial, sans-serif`
- **Body** (<20px): `SF Pro Text`, fallbacks: `SF Pro Icons, Helvetica Neue, Helvetica, Arial, sans-serif`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|------|------|------|--------|-------------|----------------|
| Display Hero | SF Pro Display | 56px | 600 | 1.07 | -0.28px |
| Section Heading | SF Pro Display | 40px | 600 | 1.10 | normal |
| Tile Heading | SF Pro Display | 28px | 400 | 1.14 | 0.196px |
| Card Title | SF Pro Display | 21px | 700 | 1.19 | 0.231px |
| Sub-heading | SF Pro Display | 21px | 400 | 1.19 | 0.231px |
| Nav Heading | SF Pro Text | 34px | 600 | 1.47 | -0.374px |
| Sub-nav | SF Pro Text | 24px | 300 | 1.50 | normal |
| Body | SF Pro Text | 17px | 400 | 1.47 | -0.374px |
| Body Emphasis | SF Pro Text | 17px | 600 | 1.24 | -0.374px |
| Button Large | SF Pro Text | 18px | 300 | 1.00 | normal |
| Button | SF Pro Text | 17px | 400 | 2.41 | normal |
| Link | SF Pro Text | 14px | 400 | 1.43 | -0.224px |
| Caption | SF Pro Text | 14px | 400 | 1.29 | -0.224px |
| Caption Bold | SF Pro Text | 14px | 600 | 1.29 | -0.224px |
| Micro | SF Pro Text | 12px | 400 | 1.33 | -0.12px |
| Nano | SF Pro Text | 10px | 400 | 1.47 | -0.08px |

### Principles
- **Optical sizing**: SF Pro switches between Display (≥20px) and Text (<20px) automatically
- **Weight restraint**: 300-700 range, mostly 400 and 600. Weight 700 is rare, 300 only for large decorative text
- **Negative tracking at all sizes**: -0.28px at 56px, -0.374px at 17px, -0.224px at 14px, -0.12px at 12px
- **Extreme line-height range**: Headlines compress to 1.07, body opens to 1.47

## 4. Component Stylings

### Buttons

**Primary Blue (CTA)**
- Background: `#0071e3` | Text: `#ffffff` | Padding: 8px 15px | Radius: 8px
- Font: SF Pro Text, 17px, weight 400
- Focus: `2px solid #0071E3` outline

**Primary Dark**
- Background: `#1d1d1f` | Text: `#ffffff` | Padding: 8px 15px | Radius: 8px

**Pill Link (Learn More / Shop)**
- Background: transparent | Text: `#0066cc` (light) / `#2997ff` (dark)
- Radius: 980px | Border: 1px solid `#0066cc`
- Font: SF Pro Text, 14-17px | Hover: underline

**Filter / Search Button**
- Background: `#fafafc` | Text: `rgba(0, 0, 0, 0.8)` | Padding: 0px 14px | Radius: 11px
- Border: 3px solid `rgba(0, 0, 0, 0.04)`

**Media Control**
- Background: `rgba(210, 210, 215, 0.64)` | Radius: 50% | Active: scale(0.9)

### Cards & Containers
- Background: `#f5f5f7` (light) or `#272729`-`#2a2a2d` (dark)
- Border: none | Radius: 5-8px
- Shadow: `rgba(0, 0, 0, 0.22) 3px 5px 30px 0px` for elevated cards
- Hover: no standard hover — cards are static, links within them are interactive

### Navigation
- Background: `rgba(0, 0, 0, 0.8)` with `backdrop-filter: saturate(180%) blur(20px)`
- Height: 48px | Text: `#ffffff` at 12px, weight 400
- The nav floats above content with dark translucent glass regardless of section background

### Distinctive Components

**Product Hero Module**
- Full-viewport-width section, solid background (black or `#f5f5f7`)
- Product name: SF Pro Display, 56px, weight 600
- Two pill CTAs: "Learn more" (outline) + "Buy" (filled)

**Product Grid Tile**
- Square card, product image 60-70% of tile
- Product name + description + "Learn more" / "Shop" links

**Feature Comparison Strip**
- Horizontal scroll of product variant cards with image, name, key specs

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Scale: 2, 4, 5, 6, 7, 8, 9, 10, 11, 14, 15, 17, 20, 24px

### Grid & Container
- Max content width: ~980px
- Hero: full-viewport-width with centered content
- Product grids: 2-3 columns within centered container
- Single-column for hero moments

### Whitespace Philosophy
- Each product section occupies near full-viewport height
- Alternating background colors (black, `#f5f5f7`) signal new "scenes"
- Tight text (negative letter-spacing) surrounded by vast space creates tension

### Border Radius Scale
- Micro (5px): Small containers | Standard (8px): Buttons, cards
- Comfortable (11px): Search inputs | Large (12px): Feature panels
- Full Pill (980px): CTA links | Circle (50%): Media controls

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | No shadow | Standard content sections |
| Navigation Glass | `backdrop-filter: saturate(180%) blur(20px)` on `rgba(0,0,0,0.8)` | Sticky nav bar |
| Subtle Lift | `rgba(0, 0, 0, 0.22) 3px 5px 30px 0px` | Product cards |
| Media Control | `rgba(210, 210, 215, 0.64)` bg + scale transforms | Play/pause buttons |
| Focus | `2px solid #0071e3` outline | Keyboard focus states |

Shadow is extremely rare. The one shadow (`3px 5px 30px`, 0.22 opacity) is soft and diffused. Most elevation comes from background color contrast.

## 7. Do's and Don'ts

### Do
- Use SF Pro Display at 20px+ and SF Pro Text below 20px
- Apply negative letter-spacing at all text sizes
- Use Apple Blue (`#0071e3`) ONLY for interactive elements
- Alternate black and `#f5f5f7` section backgrounds
- Use 980px pill radius for CTA links
- Keep product imagery on solid-color fields
- Use translucent dark glass (`rgba(0,0,0,0.8)` + blur) for navigation
- Compress headline line-heights to 1.07-1.14

### Don't
- Don't introduce additional accent colors
- Don't use heavy shadows or multiple shadow layers
- Don't use borders on cards or containers
- Don't apply wide letter-spacing to SF Pro
- Don't use weight 800 or 900
- Don't add textures, patterns, or gradients to backgrounds
- Don't make navigation opaque
- Don't center-align body text — only headlines center
- Don't use rounded corners larger than 12px on rectangles (980px is for pills only)

## 8. Responsive Behavior

| Breakpoint | Width | Key Changes |
|------------|-------|-------------|
| Small Mobile | <360px | Single column minimum |
| Mobile | 360-480px | Standard mobile |
| Mobile Large | 480-640px | Wider single column |
| Tablet Small | 640-834px | 2-column grids begin |
| Tablet | 834-1024px | Full tablet, expanded nav |
| Desktop Small | 1024-1070px | Standard desktop begins |
| Desktop | 1070-1440px | Full layout, max width |
| Large Desktop | >1440px | Centered, generous margins |

- Touch targets: minimum 44x44px
- Headlines: 56px → 40px → 28px on mobile
- Grids: 3-col → 2-col → single stack
- Nav: horizontal → hamburger menu
- Section color blocks persist at all breakpoints

## 9. Quick Reference for Agents

### Color Cheat Sheet
- CTA: `#0071e3` | Light bg: `#f5f5f7` | Dark bg: `#000000`
- Text (light): `#1d1d1f` | Text (dark): `#ffffff`
- Links (light): `#0066cc` | Links (dark): `#2997ff`
- Shadow: `rgba(0, 0, 0, 0.22) 3px 5px 30px 0px`

### Example Prompts
- "Hero section: black bg, 56px SF Pro Display weight 600, line-height 1.07, -0.28px spacing, white text. Two CTAs: outline pill + filled blue button."
- "Product card: `#f5f5f7` bg, 8px radius, no border/shadow. Image top 60%, title 28px weight 400, description 14px rgba(0,0,0,0.8)."
- "Navigation: sticky 48px, `rgba(0,0,0,0.8)` + `backdrop-filter: saturate(180%) blur(20px)`, 12px white links."
- "Alternating sections: black bg with white text → `#f5f5f7` bg with `#1d1d1f` text, each near full-viewport height."
