---
name: card-rendering
description: Use when implementing or debugging anything that touches DOM-to-PNG rasterisation, the route SVG path, the elevation/pace chart SVG, font loading for export, or the shared component contract every theme implements. Covers snapdom usage (embedFonts, scale/dpr, the untransformed capture node), Ramer–Douglas–Peucker route simplification, lat/lng→viewport projection, and the ActivityCardProps interface.
---

# card-rendering

The non-obvious technical bits of rendering an activity card and converting it to a PNG.

## The export pipeline

The card is a normal React component rendered in the DOM. The user sees the actual card as a live preview. On download, we rasterise that exact DOM node to a PNG with [snapdom](https://github.com/zumerlab/snapdom) (`@zumer/snapdom`). The real code lives in `theme/export/export-card.ts` (single card) and `theme/export/export-carousel.ts` (sliced strip); this is the shape:

```ts
import { snapdom } from '@zumer/snapdom'

export async function rasteriseCard(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready

  return snapdom.toBlob(node, {
    width: 1080,
    height: 1350,
    scale: 2,         // 1080×1350 → crisp 2160×2700
    dpr: 1,           // deterministic — ignore the viewer's screen density
    embedFonts: true, // inline the theme's @font-face into the snapshot
    type: 'png',
  })
}
```

### Why these specific options

- **`scale: 2` + `dpr: 1`** — themes are authored at the format's native size (the 4:5 master is 1080×1350); `scale` upscales the output to a crisp 2×. snapdom's `dpr` defaults to the viewer's `devicePixelRatio`, which would double the output **again** on a Retina screen — pin it to `1` so the export is the same pixel size on every device.
- **`embedFonts: true`** — REQUIRED. snapdom rasterises through a serialised `<svg><foreignObject>`, which renders in an isolated context with no access to the page's loaded fonts. Without `embedFonts` only **icon** fonts are inlined, so every theme headline silently falls back to a system font in the export even though the preview looks right.
- **`await document.fonts.ready`** — ensures the live DOM is laid out with the real fonts before snapdom measures + clones it; otherwise fallback metrics leak into the snapshot.
- **No iOS double-call** — snapdom primes the WebKit font/decode pipeline itself (`safariWarmupAttempts`, default 3). The old html-to-image "rasterise twice on iOS and discard the first pass" workaround is gone; **don't reintroduce it.**
- **No `cacheBust`** — that was an html-to-image footgun (it appended `?cache-bust=…` to every resource URL, which broke the uploaded photo's `blob:` object URL so the background silently dropped). snapdom never rewrites resource URLs. The `e2e/export-photo.spec.ts` regression guard asserts the photo actually lands in the PNG.

### The captured node must be untransformed

snapdom **keeps** a root element's own `scale()` transform (`outerTransforms` only strips translate/rotate, never scale). The export sheet shows each format at native size visually scaled to fit its tile — so the visual `transform: scale()` lives on a **wrapper**, and the reffed export source inside it stays at native `width`/`height` with no transform. Don't move the scale back onto the captured node, or the export shrinks into a corner. (The carousel's off-screen wide mount is already untransformed for the same reason.)

### Sharing the result

`snapdom.toBlob` returns a PNG `Blob` directly — no dataURL round-trip. Effort attribution (+ optional GPS) is injected into the raw bytes (canvas output carries no metadata — see `lib/metadata.ts`), then the file is shared via the Web Share API on mobile or downloaded on desktop.

```ts
const blob = await rasteriseCard(cardRef.current!)
const file = new File([blob], 'activity-card.png', { type: 'image/png' })

if (navigator.canShare?.({ files: [file] })) {
  await navigator.share({ files: [file], title: activity.title })
} else {
  // Fallback: direct download
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'activity-card.png'
  a.click()
  URL.revokeObjectURL(url)
}
```

## Route SVG rendering

No map tiles. The route is an SVG polyline drawn from `routeCoordinates: [lat, lng][]`.

### Coordinate projection

```ts
export function projectRoute(
  coords: Array<[number, number]>,
  width: number,
  height: number,
  padding = 16,
): string {
  if (coords.length === 0) return ''

  const lats = coords.map(([lat]) => lat)
  const lngs = coords.map(([, lng]) => lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  // Preserve aspect ratio of the route
  const latRange = maxLat - minLat || 1
  const lngRange = maxLng - minLng || 1
  const scaleX = (width - padding * 2) / lngRange
  const scaleY = (height - padding * 2) / latRange
  const scale = Math.min(scaleX, scaleY)

  // Centre within the box
  const offsetX = (width - lngRange * scale) / 2
  const offsetY = (height - latRange * scale) / 2

  return coords
    .map(([lat, lng]) => {
      const x = (lng - minLng) * scale + offsetX
      const y = (maxLat - lat) * scale + offsetY // flip Y
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}
```

Render as `<polyline points={projected} fill="none" stroke="..." strokeWidth={...} strokeLinejoin="round" strokeLinecap="round" />`.

**Always project with one uniform `scale` (as above) and centre the route — never
map each axis independently to fill the box.** Stretching a path to fill a wide
container (e.g. the full carousel strip) distorts the silhouette so it no longer
matches the real route; keep it geographically faithful and centre it instead.

### Simplification

Raw GPX often has 5000+ points. Simplify to ~150 with Ramer–Douglas–Peucker before storing on `Activity.routeCoordinates`. Implement in `lib/metrics/simplify.ts`. If you reach for `turf` for this, that's fine — but RDP is ~30 lines and avoids a dependency.

### Path styling

The polyline should never look like a generic mapping line. Each theme styles it differently — gradient stroke, glow, dashed, segmented by elevation, etc. The `RoutePath` component in `themes/shared/` should expose enough props for themes to restyle without re-deriving geometry.

## Elevation / pace chart

Same pattern: project an array of numbers to an SVG path.

```ts
export function projectProfile(
  values: number[],
  width: number,
  height: number,
  padding = 8,
): { area: string; line: string } {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const step = (width - padding * 2) / (values.length - 1)

  const points = values.map((v, i) => {
    const x = padding + i * step
    const y = padding + (1 - (v - min) / range) * (height - padding * 2)
    return [x, y] as const
  })

  const line = points
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const area =
    `M ${points[0][0]},${height} ` +
    points.map(([x, y]) => `L ${x.toFixed(1)},${y.toFixed(1)}`).join(' ') +
    ` L ${points[points.length - 1][0]},${height} Z`

  return { area, line }
}
```

Render the area as a filled `<path>` and the line as a stroked `<path>` on top.

## Theme component contract

Every single-card theme implements `ThemeProps` (`theme/core/theme-contract.ts`):

```ts
interface ThemeProps<K extends CapabilityKey, C> {
  colors?: ColorScheme;          // resolved colour scheme (theme default until the user picks)
  config?: C;                    // the theme's coerced parameter config
  data: ThemeData<K>;            // ActivityData NARROWED to the declared capabilities
  imageTransform?: ImageTransform | null; // pan/zoom for the background photo
  photoUrl?: string | null;      // null when the photo is toggled off
}
```

A theme file exports its component plus a **`defineTheme` descriptor** declaring
`uses` (the overlay capabilities it renders — this narrows `data`'s type, so
reading an undeclared field is a compile error), sport-aware `usesWhen`
refinements, a colour policy, a photo policy, and its params. Descriptors are
collected in `theme/single-card/index.ts` (`SINGLE_CARD_THEMES` / `ThemeId`).
The dispatcher `theme/editor/render-theme.tsx` is fully generic: it strips the
data to the declaration (`pickThemeData`), resolves `colors`, and provides the
photo-fx context — no per-theme branches. See the `theme-params` skill for the
descriptor + parameter model.

### Photo effects

`PhotoEffects` (filter preset, grain, mirror, rotate) plus the photo's natural
size are provided once by `RenderTheme` via a React context
(`theme/shared/photo-fx.tsx`) and read by the shared photo layers
(`PhotoLayer` / `PhotoBackdrop` / `PhotoUnderlay`) and Strata's inline photo —
every theme's background is adjustable without threading props. Full-bleed
layers render through the shared `CoverPhoto`
(`theme/shared/cover-photo.tsx`), which sizes the element from the
photo's natural dimensions and swaps width/height on quarter turns so rotation
never exposes the corners (the same geometry as the carousel panorama). Apply
effects as inline CSS (`filterCss`, `effectsTransformSuffix`, `GRAIN_BG`) —
never `backdrop-filter`, which the foreignObject snapshot mishandles. Rendered
without the provider (e.g. in a story) the layers see `null` and render
unfiltered.

### Theme dimensions

Themes are **format-aware**: each renders at the target format's native size and
reads its dimensions + safe insets from the `FormatContext`
(`theme/shared/format-context.tsx`). The 4:5 master is **1080×1350**;
snapdom's `scale: 2` at export time produces the crisp 2160×2700 PNG. Don't
hardcode a fixed-size root — size from the format (see the `theme-architecture`
skill for the format-aware contract).

### Sport awareness

Themes branch on `activity.sport` to choose which stats to show and how to render the profile chart. The mapping rules are in the `sport-data` skill — read that before implementing per-sport logic in a theme.

### Background photo

When `activity.backgroundImage` is set, themes that support it (Photo theme always, others optionally) use it as a CSS `background-image` on a layer. For snapdom to capture it correctly without tainting the canvas, the photo should be an object URL, data URL, or same-origin resource — not a cross-origin remote URL (the Strava photo is streamed through our own `/api/strava/photo` route for exactly this reason). snapdom can fall back to a CORS proxy via `useProxy`, but we don't need it.

### Every theme needs a story

Each single-card theme has a colocated `theme/single-card/<name>.stories.tsx`
(Storybook). A theme is not done until it renders there — enforced in
`AGENTS.md`. Photo-capable themes spread `backgroundArgTypes`
(`.storybook/backgrounds.ts`) into the story `meta` (typed
`Meta<ComponentProps<typeof X> & BackgroundArgs>`) so the Background
toolbar/upload controls preview the theme over an image. Verify with
`bun run build-storybook`. (Carousel themes carry the same requirement — see the
`carousel-themes` skill.)

## Fonts

Self-host theme fonts in `public/fonts/` and load via `@font-face` in `app/globals.css`. Google Fonts CDN also works but adds a network dependency for export — self-hosting is more reliable.

Each theme uses its own font pairing; don't share a single font system across themes. List the fonts at the top of each theme file as a comment so they're easy to swap.

snapdom embeds the fonts itself at export time (`embedFonts: true`), refetching each `@font-face` `src` and inlining it into the SVG snapshot — so the fonts must be **same-origin or CORS-readable** (self-hosting guarantees this). The default `cache: 'soft'` reuses embedded fonts across captures within a session, so "Download all" (one capture per format) doesn't refetch them each time.

## Debugging the export

If the PNG looks wrong vs the preview:

1. Did you await `document.fonts.ready`?
2. Are headlines rendering in the wrong (system) font? You dropped `embedFonts: true` — snapdom only auto-embeds *icon* fonts.
3. Is the background image cross-origin? Stream it same-origin or use an object/data URL.
4. Are you using `backdrop-filter`? It doesn't survive the foreignObject snapshot. Switch to a solid/`filter` overlay.
5. Is the captured node itself transformed (`transform: scale()`)? snapdom keeps root scale transforms — capture an untransformed node and scale a wrapper instead.

If the PNG is blank or low-res: check fonts are ready, and that `dpr`/`scale` are set as above (a stray default `dpr` can blow the canvas past the size cap).
