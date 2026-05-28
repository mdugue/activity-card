---
name: image-palette
description: Use when working on the photo-driven theme that derives card colors from the user's uploaded background image. Covers node-vibrant v4 swatch extraction, OKLCH-based color math via culori (complementary hue rotation, lightness derivation), WCAG contrast guarantees with black/white fallback, the role-based assignment model (background / headline / body / accent / onAccent), the three user-facing preset variants, and the greyish-photo guard. Read before touching lib/palette.ts, hooks/use-image-palette.ts, or any theme that auto-colors from a photo.
---

# image-palette

How the photo-adaptive theme derives its colors. Implementation lives in
`lib/palette.ts` (pure logic) and `hooks/use-image-palette.ts` (React hook).

The user-facing feature name is **mood**. The code uses "palette" / "variant" internally for the colour logic — these are implementation details. UI copy should say "mood".

## The model

A photo produces colors via three stages:

1. **Extract** — `node-vibrant` v4 returns up to six swatches (Vibrant, DarkVibrant, LightVibrant, Muted, DarkMuted, LightMuted), each with hex + population.
2. **Assign by role** — map swatches to semantic roles, not raw colors:
   - `background` — DarkMuted (or darkest swatch)
   - `headline` — best-contrast light swatch over background
   - `body` — dimmed headline, lower contrast bar
   - `accent` — variant-dependent (see below)
   - `onAccent` — auto black/white for text placed on the accent
3. **Guarantee contrast** — every text/bg pair is checked with `wcagContrast` (culori). Headline must clear 4.5:1, body 3:1. If no swatch qualifies, fall back to white or black. **Legibility always wins over aesthetics.**

## Three preset moods

Don't ship one fixed mapping — auto-color is delightful when it hits and jarring when it misses. Offer three valid interpretations the user flips between:

- **vibrant** — accent = the Vibrant swatch. Punchy, photo-forward.
- **muted** — accent = LightMuted/Muted. Calm, editorial.
- **complementary** — accent = Vibrant hue rotated 180° in OKLCH. Striking, designed-looking.

`buildPaletteFromImage()` returns all three pre-built. The hook selects one via `setVariant`.

## Why OKLCH (not HSL)

All hue rotation and lightness math runs in OKLCH via culori. OKLCH is perceptually uniform, so a 180° hue rotation produces a complement that *looks* like an equal shift and maintains perceived lightness. HSL rotation produces uneven, often muddy results. This is the single biggest quality lever in the whole feature.

## The greyish-photo guard (important)

Complementary rotation on a low-chroma photo (fog, snow, overcast beach) produces an ugly muddy "complement". Guard against it:

```
if (chroma(baseColor) < MIN_ACCENT_CHROMA /* 0.06 */) {
  // skip rotation, keep the base color
}
```

A grey photo should get a clean neutral accent, never an invented brown. The guard is verified to work: a fog palette's complementary variant returns the same grey as its vibrant variant rather than rotating.

## node-vibrant v4 specifics

- Browser import: `import { Vibrant } from 'node-vibrant/browser'`
- `Vibrant.from(src).quality(1).getPalette()` — quality 1 = no downsampling, most consistent results
- Swatches can be `null` — always null-check before reading `.hex`
- Each swatch also exposes `bodyTextColor` / `titleTextColor` (Vibrant's own legible-text computation). We compute our own via culori for full control, but these are a valid shortcut.
- Results vary slightly across browsers/machines (canvas fingerprinting). Imperceptible at quality 1; don't rely on byte-identical output.

## Performance

Quantization is the slow stage and can jank on large photos. node-vibrant v4 ships a worker entry (`node-vibrant/worker` + `WorkerPipeline`). Move extraction off-thread only after confirming jank on real uploads — premature for the first cut. The hook's API is unchanged either way.

## Consuming the theme

`paletteToCssVars(theme)` maps the theme onto CSS custom properties
(`--bg`, `--headline`, `--body`, `--accent`, `--on-accent`). Spread onto the
card root; reference the vars in the theme's CSS. This keeps the photo theme's
markup identical to other themes — only the variable values change.

## Edge cases handled

- **Empty/transparent image** → safe neutral fallback theme (no crash).
- **No qualifying text color** → white/black fallback.
- **Greyish photo** → complementary degrades to neutral.
- **Photo removed** → hook returns to `idle`, theme is null; the card should fall back to its non-photo default palette.
- **New photo during loading** → the hook retains the previous theme until the new one resolves, so the card doesn't flash to neutral mid-transition.

## What this does NOT do

- Doesn't pick *which* swatch is "the subject" — it's population-based, not saliency-based. Good enough for backgrounds; if you later want subject-aware extraction, that's a saliency-map problem and a much bigger lift.
- Doesn't theme the app UI from the photo — only the card. Keep the app chrome stable.
