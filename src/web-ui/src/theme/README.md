# Theme Contract (AI-Oriented)

This document defines the visual contract for UI changes in this project.
Use it as a strict spec when generating or refactoring UI.

## 1. Design Intent

Target style: Premium modern SaaS (Linear/Vercel-like).

Principles:
- Minimal, clean, high-contrast dark surfaces.
- Flat components with subtle borders instead of heavy shadows.
- Strict spacing rhythm and consistent card layouts.
- Typography-first hierarchy with restrained color accents.

## 2. Source of Truth

- Theme composition: `src/theme/theme.ts`
- Design tokens: `src/theme/tokens.ts`
- Component overrides: `src/theme/componentOverrides.ts`

Never hardcode random colors/radii/shadows in feature components if a token/override exists.

## 3. Core Tokens

### Dark Palette
- Background default: `#09090b`
- Surface (paper/card): `#121214`
- Primary accent: Indigo `#6366f1`
- Divider/borders: `rgba(255, 255, 255, 0.08)`
- Text primary: `#fafafa`
- Text secondary: `#a1a1aa`

### Typography
- Font stack: Plus Jakarta Sans, Inter, then system fallbacks.
- Heading weight (`h1`-`h6`): `600`
- Buttons: weight `600`, letter spacing `0.04em`

### Shape and Density
- Global radius: `10px`
- Button radius: `8px`
- Preferred section/card content spacing: `3` (MUI spacing scale)

## 4. Component Rules

### Surfaces
- `Paper` and `Card`: no elevation look, no gradient overlays.
- Use subtle border for separation: `1px solid rgba(255, 255, 255, 0.08)`.

### Buttons
- Flat appearance: no glow/shadow transitions.
- Compact padding: `6px 12px`.
- Keep text casing natural (`textTransform: none`).

### Scrollbars
- Thin and dark.
- Do not use bright thumb/track colors.

### Tooltips and Chart Tooltips
- Dark translucent background.
- Border consistent with surface borders.
- Use backdrop blur for premium feel.

## 5. Layout Rules

- Prefer strict grids over free-form stacking for card-heavy dashboards.
- Align card heights where cards are comparable.
- Use consistent internal padding (`p: 3`) in cards/sections.
- Avoid mixed spacing values in one visual block unless functionally needed.

## 6. Statistics Block Style

Statistics areas should be minimalist:
- One concise summary area.
- Structured metric grid with simple bordered items.
- Avoid decorative icons/background badges unless they carry clear meaning.
- Prioritize scanability over decoration.

## 7. AI Generation Checklist

Before finalizing generated UI, verify:
- Colors come from theme tokens or semantic palette keys.
- Card/Paper visual language matches flat + subtle-border system.
- Spacing rhythm is consistent (especially `spacing={3}` / `p: 3`).
- Typography hierarchy uses MUI variants, not arbitrary font sizes.
- New tooltips/charts follow dark blur tooltip style.
- No style regressions to default MUI look (blue-ish defaults, thick shadows, mixed radii).

## 8. Prompt Template for AI

Use this template when asking AI to generate UI:

"Implement this UI in the existing project theme contract:
- Style: Premium modern SaaS (Linear/Vercel-like)
- Palette: zinc dark surfaces (`#09090b` / `#121214`) + indigo primary (`#6366f1`)
- Typography: Plus Jakarta Sans/Inter, heading weight 600
- Components: flat cards/papers, subtle 1px rgba(255,255,255,0.08) borders, no heavy shadows
- Spacing: strict grid rhythm, card content padding `p: 3`
- Buttons: compact and flat with slight letter spacing
- Tooltips/charts: dark translucent tooltip with blur
Do not introduce styles that conflict with `src/theme/tokens.ts` and `src/theme/componentOverrides.ts`."

## 9. Extension Policy

When extending the design system:
- Add new colors/scales in `tokens.ts` first.
- Add repeated component behavior in `componentOverrides.ts`.
- Keep `theme.ts` as composition only.
- Prefer reusable patterns over one-off `sx` styling.
