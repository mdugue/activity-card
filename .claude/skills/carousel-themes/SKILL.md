---
name: carousel-themes
description: Use when designing, editing, or adding a Carousel Post theme — the look/ideas of Trace, Ascent, Exposure, Frame, Press, Strata, the Dawn/Dusk light·dark pairing, the canvas + panels descriptor model, per-theme slide count, photo handling (filter + grain + veil + text-shadow), and the element-visibility model. Read before touching anything under components/themes/carousel/ or lib/carousel/.
---

# carousel-themes

How the Carousel Post themes are designed. The carousel is its own medium — its
themes are **not** the single-card themes. They live in their own id space
(`CarouselThemeId` in `components/themes/carousel/registry.ts`), independent of
the single-card `ThemeId`, so the set can grow freely.

## A carousel theme is a descriptor (canvas + panels)

Like a single-card theme, a carousel theme is a `ThemeBase` descriptor (identity,
colour/photo policy, params, **`uses`** capabilities) — one self-contained
`defineCarouselTheme` entry in `components/themes/carousel/registry.ts`
(`CAROUSEL_THEMES`, the carousel peer of `SINGLE_CARD_THEMES`). It adds a render
strategy — two component fields plus the inline `look` they render with:

- **`canvas?`** — the spanning signature component, drawn **once** across the
  whole n×1080 × 1350 strip and bled across every slide edge. Optional: photo-led
  themes (Exposure / Frame / Press) omit it. The three canvases live in
  `components/themes/carousel/canvas/`: `RouteCanvas` (Trace), `ElevationCanvas`
  (Ascent), `StrataCanvas` (Strata).
- **`panels`** — an array of foreground components, **one per slide**; its length
  IS the slide count (most themes 3, Frame/Press 4). Standard themes share
  `[HeroSlide, StatGridSlide, EditorialSlide]`; Frame and Press bring their own
  per-slide panels.

One shared renderer composes them — `components/themes/carousel/deck.tsx`
(`CarouselDeck`): the shared background photo + veil, then `theme.canvas`, then
`theme.panels.map((Panel, i) => …)`. There is **no per-theme branch** in the
renderer; a theme *is* its canvas + panels. The editor windows onto the deck, the
thumbnails slice it, and the export slices it — preview === output.

## The look

Each theme's `look` (a `CarouselLook`, vocabulary in
`lib/carousel/theme-tokens.ts`) lives inline on its descriptor;
`defineCarouselTheme` derives the colour/photo policy from it, and
`resolveDeckStyle` spreads it (plus the resolved colours + fonts) into the one
`EffectiveStyle` every canvas/panel receives. The levers:

- **`heroMetric`** — the number the intro slide headlines: `distance` or
  `elevation` (Ascent leads with total climb).
- **`crossViz`** — a small secondary glyph on the wrap-up slide (`route` or
  `elevation`) nodding at the other dimension.
- **`detailViz`** — render small path + altitude graphics on the detail slide(s),
  for themes whose signature isn't already the route/elevation (Exposure, Press).
- **`fontPair`** — `serif` (Cormorant, light pairs), `bold` (Anton, dark pairs),
  `magazine` (Playfair, Exposure/Press), `grotesk` (Space Grotesk, Frame),
  `syne` (Strata).
- **`contentAnchor`** — where slide content sits: `"top"` above an
  elevation-range canvas (Ascent), `"bottom"` everywhere else.
- **`veil`** — whether the deck draws the light legibility wash between photo
  and panels; type-led themes (Frame / Press) set `false` and protect their own
  text (shadows / opaque boxes).
- **`dark`**, colours (`background`, `ink`, `mutedInk`, `accent`, `accent2`),
  `routeStyle`, `elevation`/`elevationAccent`, `defaultFilter` + `defaultGrain`
  (the photo look applied when the theme is chosen), and an optional
  `defaultColorChoice` (Exposure starts photo-derived). Knobs (Strata's
  mood/density/legend) are `params`/`defaults` on the descriptor entry itself.

Colour flows through the shared model (`lib/colors.ts`): the deck renders with a
resolved `ColorScheme` — `resolveDeckStyle(theme.look, theme.label, scheme)` →
`EffectiveStyle` — where the user's `ColorChoice` (preset or photo-derived)
overrides the look's accents. A theme may post-process that style via an
optional `resolveStyle(base, config)` (Strata's mood swaps the whole palette).

## The themes

- **Trace** — the route silhouette as an art-print (`RouteCanvas`). The
  ATMOSPHERE param picks Dawn (light & serif on warm paper) or Dusk (the same
  idea after dark, condensed & bold). Hero = distance, elevation cross-viz.
- **Ascent** — the elevation range as a mountain-range portrait
  (`ElevationCanvas`), content anchored above it. Same Dawn/Dusk ATMOSPHERE
  param. Hero = total elevation, route cross-viz.
- **Exposure** — full-bleed photo panorama + magazine masthead, no spanning
  canvas; the route and elevation appear as small detail graphics (the photo is
  the hero).
- **Frame** — ultra-minimal: one big datum per slide between hairline rules, each
  paired with its sparkline (route / elevation / speed / watts). 4 panels.
- **Press** — editorial broadsheet: masthead, drop-cap lede, pull-quote stats,
  byline. Over a photo, text sits in **fully-opaque print boxes** — never a soft
  scrim. Small print-style path/altitude cuts ride along the spreads. 4 panels.
- **Strata** — the generative woven morph-field (`StrataCanvas`): route ridge top,
  elevation ridge bottom, the swipe walking across the whole topography. Mood
  (via `resolveStyle`), density, legend are adjustable params.

**Dawn/Dusk is a knob, not a theme split:** same signature idea, opposite tone —
light = bright photo filter + dark serif text; dark = moody photo filter + light
bold text. Trace and Ascent expose it as the shared ATMOSPHERE param
(`lib/carousel/atmosphere.ts` + `atmosphereResolveStyle` in `registry.ts`, the
same `resolveStyle` mechanism as Strata's mood). Keep new families consistent
with this contrast.

## Photo handling

Every theme renders an uploaded photo **full-bleed**, gated by the shared "Use as
background" toggle (`visibility.photoBackdrop`) — the same flag as the single
card. The deck owns the photo + veil (universal); the `canvas` is the theme's
signature viz only. Legibility comes from, in order of preference:

1. the per-theme **default filter** (`fade` brightens for dark-text themes;
   `noir`/`mono` darken for light-text themes) — `lib/photo-effects.ts`,
2. **dual text-shadows** (`slideText` in `templates/shared.ts` returns a light
   halo for light themes, a dark drop for dark themes),
3. a **light veil** (themes with `look.veil: true`: ~26% white for light
   themes, ~34% black for dark) — Frame uses shadows only; Press uses its
   opaque boxes.

The panorama itself is the shared natural-size-aware `CoverPhoto`
(`components/themes/shared/cover-photo.tsx`, wrapped by `carousel-photo.tsx`):
quarter-turn rotations swap the element's width/height so the strip stays
covered. Optional **film grain** survives snapdom because it's decoded as
an image, not a live filter. Default-on for the art-print themes via the token
look's photo fields.

## Route geometry — never stretch

The route is the Trace signature and the cross-/detail-viz glyph elsewhere. It is
always projected **aspect-preserving and centred** (`RouteLine` → `projectRoute`
in `lib/chart-helpers.ts` uses a single uniform scale), so the silhouette keeps
its real proportions. As the spanning signature it sits in the **middle of the
complete carousel viewport** at its true shape — do **not** stretch the path
per-axis to span the full strip width. A smeared silhouette misrepresents the
ride; compact routes naturally concentrate around the centre slide, and only
genuinely long routes reach further across. (Strata's woven field is the
deliberate exception — its identity is the continuous weave, so it spans by
design.)

## Stats & visibility — panels self-derive

There is **no deck-wide stat planner**. Each panel derives the stats it shows
directly from `data`, by its own slide index, via `lib/carousel/stats.ts`:

- `heroStat(data, style.heroMetric, statOptsFor(visibility))` — the one big
  intro number.
- `detailStats(data, metric, opts)` — the standard detail grid: every stat
  **except** the hero metric (so the deck doesn't repeat its big number).
- `frameStats(data, opts)[index]` — Frame's curated one-datum-per-slide order.
- `pressSlideStats(data, index, total, opts)` — Press's lede / pull-quote slices.

`statOptsFor(visibility)` carries the distance/time toggles (a card's core, never
stripped). Every **other** overlay element is toggleable (`lib/visibility.ts`):
most toggles work by **stripping the field** in `applyVisibility` before render,
so one switch hides the element in both modes with no per-theme code. Which
switches a theme offers comes from its capability declaration —
`themeAvailability(data, theme)` intersects the activity's data with the theme's
`uses` (every carousel theme declares the shared `CAROUSEL_CAPABILITIES`).
Athlete name, the "made with effort" mark, and page numbers default OFF.

## Adding a theme

1. Add the id to `CarouselThemeId` + `CAROUSEL_THEME_ORDER` and one
   self-contained `defineCarouselTheme` entry in
   `components/themes/carousel/registry.ts`: identity, the `canvas?` (reuse
   `RouteCanvas` / `ElevationCanvas` / `StrataCanvas`, or add one under
   `canvas/`), the `panels` (reuse `STANDARD_PANELS`, or compose new per-slide
   panel components), and the inline `look`. Add `params`/`defaults` for knobs
   and a `resolveStyle` only if the theme post-processes the palette (Strata's
   mood); `uses` defaults to `CAROUSEL_CAPABILITIES`.
2. Keep the contract: a `canvas` owns its own placement and renders **null** when
   its metric is absent; panels render foreground only and self-derive their
   stats from `data`. The deck owns the photo + veil.
3. **Add a story** — a `<theme>.stories.tsx` next to the registry that renders
   `<CarouselDeck theme={CAROUSEL_THEMES[id]} …>` with `backgroundArgTypes` (use
   the `carouselArgs` helper in `story-support.ts`). Every carousel theme must
   have a story — enforced in `AGENTS.md`. Verify with `bun run build-storybook`.

## File map

```
lib/carousel/theme-tokens.ts   the look vocabulary — CarouselLook · font pairs · CAROUSEL_CAPABILITIES
lib/carousel/resolve.ts        look + ColorScheme → EffectiveStyle · heroInk
lib/carousel/stats.ts          buildStats · heroStat · detailStats · frameStats · pressSlideStats · series
lib/carousel/types.ts          SLIDE_W/H · RouteStyle · FontPairId
hooks/use-carousel.ts          panel count → clamped slide selection (one index)
components/themes/carousel/define-theme.ts   defineCarouselTheme · CarouselTheme · CanvasProps · PanelProps
components/themes/carousel/registry.ts       CAROUSEL_THEMES + CarouselThemeId (one entry per theme, look inline)
components/themes/carousel/deck.tsx          CarouselDeck — the shared renderer
components/themes/carousel/canvas/           RouteCanvas · ElevationCanvas · StrataCanvas
components/themes/carousel/templates/        standard panels (Hero/StatGrid/Editorial) + shared text helpers
components/themes/carousel/panels/           Frame + Press per-slide panels
components/themes/carousel/route-line.tsx    route + start-direction arrow
components/themes/carousel/elevation-band.tsx mountain range / sparkline
components/themes/carousel/carousel-photo.tsx panorama photo (shared CoverPhoto)
components/themes/carousel/<theme>.stories.tsx one story file per theme (required)
```

Every panel receives the same `PanelProps` bag (the contract lives beside
`CanvasProps` in `define-theme.ts`): pre-resolved `style`, slide `index`/`total`,
`hasPhoto`, the deck-wide `visibility`, and the chrome flags. Its `data` is
narrowed to the theme's declared capabilities (`ThemeData<K>`), exactly like the
single card's `ThemeProps`. Panels are foreground fragments inside ONE renderer —
the style is resolved once (which guarantees the seamless deck), and each panel
derives its own stats from `data`.
