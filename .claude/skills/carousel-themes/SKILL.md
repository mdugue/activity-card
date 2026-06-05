---
name: carousel-themes
description: Use when designing, editing, or adding a Carousel Post theme — the look/ideas of Trace, Ascent, Exposure, Frame, Press, the Dawn/Dusk light·dark pairing, the per-theme deck length, photo handling (filter + grain + veil + text-shadow), the per-slide stat planner, and the element-visibility model. Read before touching anything under components/carousel/ or lib/carousel/.
---

# carousel-themes

How the Carousel Post themes are designed. The carousel is its own medium — its
themes are **not** the single-card themes. They live in their own id space
(`CarouselThemeId` in `lib/carousel/theme-tokens.ts`), independent of the
single-card `ThemeId`, so the set can grow freely.

One renderer drives everything: `components/carousel/seamless-canvas.tsx`. It
paints one continuous n×1080 × 1350 strip — a spanning "hero" layer that bleeds
across slide edges, plus per-slide foreground panels — and the editor windows
onto it, the thumbnails slice it, and the export slices it. Preview === output.

## The levers (theme tokens)

Each theme is a row in `CAROUSEL_THEME_TOKENS`. The signature levers:

- **`heroLayer`** — the spanning element: `route` (Trace), `elevation` (Ascent),
  `photo` (Exposure), `none` (Frame / Press).
- **`panelKind`** — per-slide layout: `standard` (Hero/StatRow/StatGrid/Editorial
  templates), `frame` (one big datum + sparkline), `press` (broadsheet spreads).
- **`heroMetric`** — the number the intro slide headlines: `distance` or
  `elevation` (Ascent leads with total climb).
- **`deck`** — the fixed slide sequence. Most themes are **3 slides**
  (`hero · statGrid · editorial`); **Frame and Press are 4**
  (`hero · statRow · statGrid · editorial`). The user does **not** pick a deck;
  switching theme switches the deck (`hooks/use-carousel.ts`).
- **`crossViz`** — a small secondary glyph on the wrap-up slide (`route` or
  `elevation`) nodding at the other dimension.
- **`detailViz`** — render small path + altitude graphics on the detail slide(s),
  for themes whose hero isn't already the route/elevation (Exposure, Press). See
  `components/carousel/detail-viz.tsx`.
- **`fontPair`** — `serif` (Cormorant, light pairs), `bold` (Anton, dark pairs),
  `magazine` (Playfair, Exposure/Press), `grotesk` (Space Grotesk, Frame).
- **`dark`**, colours (`background`, `ink`, `mutedInk`, `accent`, `accent2`),
  `defaultFilter` + `defaultGrain` (the photo look applied when the theme is
  chosen), `photoSupported`, `usesPhotoPalette` (Exposure derives accent from the
  photo).

The shared **accent** (single-card swatch control) is the primary accent for
every theme except Exposure (photo palette); `accent2` is theme-fixed. Each
theme's `accent` token is the Reset target for the accent control.

## The themes

- **Trace Dawn / Trace Dusk** — the route silhouette as an art-print. Dawn is
  light & serif on warm paper; Dusk is the same idea after dark, condensed & bold.
  Hero = distance, elevation cross-viz.
- **Ascent Dawn / Ascent Dusk** — the elevation range as a mountain-range
  portrait, content anchored above it. Dawn light/serif, Dusk dark/bold. Hero =
  total elevation, route cross-viz.
- **Exposure** — full-bleed photo panorama + magazine masthead; the route and
  elevation appear as small graphics on the detail slide (the photo is the hero).
- **Frame** — ultra-minimal: one big datum per slide between hairline rules, each
  paired with its sparkline (route / elevation / speed / watts). 4 slides.
- **Press** — editorial broadsheet: masthead, drop-cap lede, pull-quote stats,
  byline. Over a photo, text sits in **fully-opaque print boxes** (an ink
  nameplate, paper slabs) — never a soft scrim. Small print-style path/altitude
  cuts ride along the spreads. 4 slides.

**Dawn/Dusk are pairs:** same hero idea, opposite tone. Light = bright photo
filter + dark serif text; dark = moody photo filter + light bold text. Keep new
families consistent with this contrast.

## Photo handling

Every theme renders an uploaded photo **full-bleed** (no faint-texture mode).
Legibility comes from, in order of preference:

1. the per-theme **default filter** (`fade` brightens for dark-text themes;
   `noir`/`mono` darken for light-text themes) — `lib/photo-effects.ts`,
2. **dual text-shadows** (`slideText` in `templates/shared.ts` returns a light
   halo for light themes, a dark drop for dark themes),
3. a **light veil** (standard panels only: ~26% white for light themes, ~34%
   black for dark) — Frame uses shadows only; Press uses its opaque boxes.

Optional **film grain** (`GRAIN_BG`, an SVG-noise data-URI overlaid in
`carousel-photo.tsx`) survives html-to-image because it's decoded as an image,
not a live filter. Default-on for the art-print themes (Trace Dawn, Ascent Dawn,
Press).

## Route marker

No coloured GPS pins, no finish flag. The route carries a small
**start-direction arrow** at its first point (`route-line.tsx`, `StartArrow`) —
a quiet "started here, went this way" cue, oriented along the initial heading.
Keep markers theme-ink / white over photos.

## Route geometry — never stretch

The route is the Trace hero and the cross-/detail-viz glyph elsewhere. It is
always projected **aspect-preserving and centred** (`RouteLine` → `projectRoute`
in `lib/chart-helpers.ts` uses a single uniform scale), so the silhouette keeps
its real proportions. As the spanning hero it sits in the **middle of the
complete carousel viewport** at its true shape — do **not** stretch the path
per-axis to span the full strip width. A smeared silhouette misrepresents the
ride; compact routes naturally concentrate around the centre slide, and only
genuinely long routes reach further across.

## Stats & visibility

`planSlideStats(data, slides, style, opts)` (`lib/carousel/stats.ts`) assigns
each slide exactly the stats it should show: the intro headlines the hero number,
detail slides page the **rest** without repeating it (so watts surface for
rides), and the wrap-up draws its own summary. Frame uses a curated
`frameStats` order; Press leads with a lede then a pull-quote per spread.

Every overlay element is toggleable (`lib/visibility.ts`). Most toggles work by
**stripping the field** in `applyVisibility` before render, so one switch hides
the element in both modes with no per-theme code. Distance and time are never
stripped (a card's core) — the carousel honours them via the `opts` passed to the
stat builder; on the single card they're locked on. `availableVisibility(data)`
drives the disabled state — a switch is disabled when the activity has no data
for it. Athlete name, the "made with effort" mark, and page numbers default OFF.

## Adding a theme

1. Add an id to `CarouselThemeId`, a row to `CAROUSEL_THEME_TOKENS`, and the id
   to `CAROUSEL_THEME_ORDER`. The picker, labels, deck, and editor pick it up
   automatically — no fixed slot count.
2. Reuse an existing `panelKind`, or add one (wire it in `panelFor` in
   `seamless-canvas.tsx` and the planner branch in `planSlideStats`).
3. Keep the contract: render foreground only; the canvas owns the photo, veil,
   spanning hero layer, and per-slide stat assignment.

## File map

```
lib/carousel/theme-tokens.ts   theme rows + levers + CarouselThemeId
lib/carousel/resolve.ts        token → EffectiveStyle (+ shared accent / photo palette)
lib/carousel/stats.ts          buildStats · planSlideStats · frameStats · series
lib/carousel/types.ts          SlideTemplate · buildDeck
hooks/use-carousel.ts          per-theme deck → slides + selection
components/carousel/seamless-canvas.tsx   the single renderer
components/carousel/route-line.tsx        route + start-direction arrow
components/carousel/elevation-band.tsx    mountain range / sparkline
components/carousel/detail-viz.tsx        small path + altitude graphics
components/carousel/carousel-photo.tsx    panorama photo + grain
components/carousel/templates/            standard panels + shared contract
components/carousel/panels/               frame-panel · press-panel
```
