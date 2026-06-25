---
name: image-palette
description: Use when working on the photo-driven theme that derives card colors from the user's uploaded background image. Covers node-vibrant v4 swatch extraction, OKLCH-based color math via culori (complementary hue rotation, lightness derivation), WCAG contrast guarantees with black/white fallback, the role-based assignment model (background / headline / body / accent / accent2 / onAccent), the five user-facing preset variants (vibrant / muted / complementary / spectrum / pure), and the greyish-photo guard. Read before touching lib/palette.ts, hooks/use-image-palette.ts, or any theme that auto-colors from a photo.
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
   - `accent2` — secondary accent. Equal to `accent` for every variant except **spectrum**, which sets it to the complementary rotation of `accent` so the card can carry two hues at once (gradient rule, ornamental italics).
   - `onAccent` — auto black/white for text placed on the accent
3. **Guarantee contrast** — every text/bg pair is checked with `wcagContrast` (culori). Headline must clear 4.5:1, body 3:1. If no swatch qualifies, fall back to white or black. **Legibility always wins over aesthetics.**

## Five preset moods

Don't ship one fixed mapping — auto-color is delightful when it hits and jarring when it misses. Offer several valid interpretations the user flips between:

- **vibrant** — accent = the Vibrant swatch. Punchy, photo-forward.
- **muted** — accent = LightMuted/Muted. Calm, editorial.
- **complementary** — accent = Vibrant hue rotated 180° in OKLCH. Striking, designed-looking.
- **spectrum** — headline pulls LightVibrant, body pulls LightMuted, accent pulls Vibrant, and a *second* accent (`accent2`) is set to the complementary rotation of the primary. Themes can paint different elements with `accent` vs `accent2` (or use them together in a gradient) so a Spectrum card visibly carries two hues at once. The wildest of the moods by design.
- **pure** — ignores the swatches entirely and returns fixed white type with a white accent. The photo still shows as background; the type stays neutral so the image speaks for itself. Use this as the "opt out" — when the extracted colours don't land or the user wants the original look.

`buildPaletteFromImage()` returns all five pre-built (`ExtractedPalette.themes`).
Because all five are pre-built in one pass, the editor's unified COLOUR control
previews **each strategy's real swatch** for free. The five variants are no
longer a Photo-theme-only "mood": they are the photo-derived arm of the shared
`ColorChoice` (`theme/core/colors.ts`, `{ kind: "photo", variant }`), available to every
colour-adjustable theme once a photo is loaded and badged "FROM YOUR PHOTO" in
the picker (`theme/editor/color-control.tsx`). `schemeFromPalette` maps a
variant to the `ColorScheme` a theme consumes (accents + the role palette the
Photo theme paints its CSS vars from); a photo-kind choice without a palette
resolves to the theme's own default.

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

Quantization is the slow stage and janked on large photos, so extraction now
runs **off-thread**: `lib/palette.ts` lazily installs node-vibrant's
`WorkerPipeline` (worker script: `lib/palette.worker.ts`, which just runs
`node-vibrant/worker.worker`). The `node-vibrant/browser` import keeps the
in-thread pipeline registered as the baseline, so environments without
`Worker` (SSR module evaluation, tests) still work — `ensureWorkerPipeline()`
upgrades on first extraction in the browser. Image *decode* stays on the main
thread (it needs the DOM); only the pixel crunching ships off. The hook's API
is unchanged. Verified e2e: `e2e/export-photo.spec.ts` asserts the "FROM YOUR
PHOTO" swatch row appears after an upload in the production build.

## Consuming the theme

`paletteToCssVars(theme)` maps the theme onto CSS custom properties
(`--bg`, `--headline`, `--body`, `--accent`, `--accent-2`, `--on-accent`).
Spread onto the card root; reference the vars in the theme's CSS. This keeps
the photo theme's markup identical to other themes — only the variable
values change. Use `--accent-2` for ornamental "second colour" elements; it
gracefully collapses to `--accent` outside Spectrum.

## Edge cases handled

- **Empty/transparent image** → safe neutral fallback theme (no crash).
- **No qualifying text color** → white/black fallback.
- **Greyish photo** → complementary degrades to neutral.
- **Photo removed** → hook returns to `idle`, theme is null; the card should fall back to its non-photo default palette.
- **New photo during loading** → the hook retains the previous theme until the new one resolves, so the card doesn't flash to neutral mid-transition.

## What this does NOT do

- Doesn't pick *which* swatch is "the subject" — it's population-based, not saliency-based. Good enough for backgrounds; if you later want subject-aware extraction, that's a saliency-map problem and a much bigger lift.
- Doesn't theme the app UI from the photo — only the card. Keep the app chrome stable.
