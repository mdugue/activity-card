---
name: card-rendering
description: Use when implementing or debugging anything that touches DOM-to-PNG rasterisation, the route SVG path, the elevation/pace chart SVG, font loading for export, or the shared component contract every theme implements. Covers html-to-image gotchas (iOS Safari, fonts.ready, pixelRatio), Ramer–Douglas–Peucker route simplification, lat/lng→viewport projection, and the ActivityCardProps interface.
---

# card-rendering

The non-obvious technical bits of rendering an activity card and converting it to a PNG.

## The export pipeline

The card is a normal React component rendered in the DOM. The user sees the actual card as a live preview. On download, we rasterise that exact DOM node to PNG.

```ts
// app/lib/rasterise.ts
import { toPng } from 'html-to-image'

export async function rasteriseCard(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready

  // iOS Safari: first call sometimes returns blank. Discard and retry.
  await toPng(node, { pixelRatio: 2 })
  const dataUrl = await toPng(node, { pixelRatio: 2 })

  const res = await fetch(dataUrl)
  return res.blob()
}
```

### Why these specific options

- **`pixelRatio: 2`** — DOM renders at 540×675; output is crisp 1080×1350. Lay the card out at the smaller size and let pixelRatio do the upscale; trying to render the DOM at 1080×1350 directly causes Tailwind sizing and font rendering to look heavy.
- **No `cacheBust`** — it appends `?cache-bust=<time>` to every fetched resource URL. The uploaded photo is a `blob:` object URL, and a busted blob URL (`blob:…?cache-bust=…`) doesn't resolve, so the fetch fails and the background **silently drops from the export**. `cacheBust` only helps cross-origin remote images (forcing a fresh CORS fetch) — which we never use (the photo is always an object URL, see below), so leave it off.
- **`await document.fonts.ready`** — without this, fallback fonts sneak into the export even though the preview looks correct.
- **The double call** — iOS Safari quirk in html-to-image. The first call warms the canvas; the second produces real output. Don't remove this.

### Sharing the result

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

Every single-card theme implements `ActivityCardProps`
(`components/themes/types.ts`):

```ts
export interface ActivityCardProps {
  data: ActivityData;            // the normalised activity (visibility already applied)
  imageTransform?: ImageTransform | null; // pan/zoom for the background photo
  photoUrl?: string | null;      // null when the photo is toggled off
}
```

Each theme is a **named export** (`ThemeName`) registered in
`components/themes/index.ts` (`THEMES` / `ThemeId`). The dispatcher
`components/app/render-theme.tsx` maps a `theme` id to its component and provides
the photo-effects context (below). Three themes take one extra prop beyond the
contract — `config` (Strata / Altitude, their coerced parameter config) or
`paletteTheme` (Photo) — passed by `RenderTheme`; the rest take exactly the
contract. A theme's adjustable knobs are **not** props: they're declared as data
(`ParamDef[]`) and rendered generically — see the `theme-params` skill.

### Photo effects

`PhotoEffects` (filter preset, grain, mirror, rotate) are provided once by
`RenderTheme` via a React context (`components/themes/photo-fx.tsx`) and read by
the shared photo layers (`PhotoLayer` / `PhotoBackdrop` / `PhotoUnderlay`) and
Strata's inline photo. So every theme's background is adjustable without threading
the effects through each component. Apply them as inline CSS (`filterCss`,
`effectsTransformSuffix`, `GRAIN_BG`) — never `backdrop-filter`, which
html-to-image mishandles. Rendered without the provider (e.g. in a story) the
layers see `null` and render unfiltered.

### Theme dimensions

Author themes at **540×675** (so `pixelRatio: 2` exports as 1080×1350). Use Tailwind arbitrary values where needed:

```tsx
<div className="w-[540px] h-[675px] ...">
```

This is the only fixed-size container; everything inside flows from there.

### Sport awareness

Themes branch on `activity.sport` to choose which stats to show and how to render the profile chart. The mapping rules are in the `sport-data` skill — read that before implementing per-sport logic in a theme.

### Background photo

When `activity.backgroundImage` is set, themes that support it (Photo theme always, others optionally) use it as a CSS `background-image` on a layer. For html-to-image to capture it correctly, the photo should be an object URL or data URL — not a remote URL that would fail CORS.

### Every theme needs a story

Each single-card theme has a colocated `components/themes/<name>.stories.tsx`
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

## Debugging the export

If the PNG looks wrong vs the preview:

1. Did you await `document.fonts.ready`?
2. Is the background image a remote URL? Convert to object URL first.
3. Are you using `backdrop-filter`? It rasterises imperfectly. Switch to a solid overlay.
4. Are SVG `<text>` elements present? html-to-image handles them but check the font is loaded.
5. iOS specifically: are you doing the double-call?

If the PNG is blank: it's almost always the iOS double-call issue or fonts not ready.
