# Effort — Activity Card Spec

## Product

**Effort** turns a single endurance workout into a beautiful, shareable image. Upload a GPX or .fit file, pick a theme, optionally drop in a background photo, download a PNG.

The product is for endurance athletes — cyclists, runners, swimmers, triathletes — who care about the thing they made. It's a personal artefact, not a corporate finisher certificate. Less "race medal photo", more "art print of my Sunday effort".

Output is called an **activity card**.

## North star

Reward someone who did a beautiful workout with something beautiful in return. The card preview is the hero of every screen.

## Build phases

### MVP (this phase)

- Fully client-side, no backend, no auth
- GPX + .fit upload
- Six themes (see below), sport-aware stat rendering
- Optional background photo upload
- Live preview, theme picker, minimal customisation (accent colour, stat visibility toggles — heart-rate visibility defaults to **on** as of Phase 2A so Strava-sourced cards show HR without an extra click; the toggle can hide it for privacy)
- Download PNG (1080×1350, Instagram portrait)
- Native share sheet on mobile (Web Share API with image file)
- Deploy as static site (Cloudflare Pages)

### Step 2 (in progress)

- **Strava OAuth so users can pick recent activities without manual upload** —
  shipped (Phase 2A). Browser → Next.js Route Handlers exchange the code,
  cookies hold the tokens, the same parsing pipeline normalises Strava
  streams into `ParsedActivity`. Cards built from Strava data carry a
  "Powered by Strava" mark per Strava's brand terms.
- komoot integration — not started; no public OAuth, partner-only.
- Account + persistence (saved cards) — not started; requires DB.
- "Update Strava activity description with link to card" — depends on
  saved cards (needs a permanent hosted URL).

### Step 3 (later — do not implement yet)

- B2B event organiser mode: official route GPX, participant submission, overlap scoring, branded white-label cards
- Email delivery via Resend
- PDF export
- Stripe billing per event

## Architecture

### Stack

- **Next.js** App Router + TypeScript (strict)
- **Tailwind v4**
- **html-to-image** for DOM-to-PNG rasterisation
- **fast-xml-parser** for GPX
- **fit-file-parser** for .fit (Garmin / Wahoo binary)
- No database, no auth (MVP). Phase 2A adds Route Handlers for the Strava
  OAuth dance — token cookies, no persisted user state.
- Deploys to Vercel (Node runtime). The original "static export to
  Cloudflare Pages" plan was invalidated when Phase 2 introduced the
  Strava OAuth backend; CF Pages would also work via Pages Functions but
  needlessly splits the runtime story.

### Why html-to-image and not Satori

Satori is flexbox-only, requires fonts as ArrayBuffers, and constrains layout. Themes need CSS Grid, blend modes, real `@font-face` from Google Fonts, and visual variety. `html-to-image` rasterises the actual DOM, so preview === output. The library is ~20KB; total app bundle stays around 100–150KB plus fonts.

Known gotchas live in the `card-rendering` skill.

### Why no map tiles

The route is rendered as a clean SVG polyline derived from lat/lng coordinates, normalised to a canvas rectangle and simplified with Ramer–Douglas–Peucker. This is faster, free, and aesthetically better for a poster-style card than embedding Mapbox or Google tiles. It's also what Strava's own art prints do.

### File structure

See AGENTS.md for the binding layout. The short version: `/components/app/` for app shell states, `/components/themes/` for one file per theme, `/lib/` for parsers, formatters, chart helpers, simplification, and the html-to-image wrapper. No `app/_components/` private folders.

## Data model

The unified `Activity` shape all themes consume:

```ts
type Sport = 'ride' | 'run' | 'swim' | 'triathlon';

type Activity = {
  sport: Sport;
  title: string;                    // user-editable
  date: string;                     // ISO; render per locale in themes
  location?: string;                // reverse-geocoded or empty
  athleteName?: string;
  backgroundImage?: string;         // object URL of user upload

  // Universal
  distanceKm: number;
  durationSec: number;
  elevationGainM?: number;

  // Sport-specific (only populated where relevant)
  avgSpeedKmh?: number;             // ride
  maxSpeedKmh?: number;             // ride
  avgPaceMinPerKm?: number;         // run; store as float minutes, format later
  avgPacePer100m?: number;          // swim
  avgHeartRate?: number;
  avgCadence?: number;
  normalizedPowerW?: number;        // ride
  swolf?: number;                   // swim

  // Visual data
  routeCoordinates: Array<[number, number]>;  // [lat, lng], simplified to ~150 points
  elevationProfile?: number[];      // metres, sampled
  paceProfile?: number[];           // seconds-per-km, sampled (runs)
  splits?: Array<{ km: number; durationSec: number }>;

  // Triathlon only
  segments?: Array<{
    sport: 'swim' | 'ride' | 'run';
    distanceKm: number;
    durationSec: number;
    elevationGainM?: number;
  }>;
  transitions?: Array<{ name: 'T1' | 'T2'; durationSec: number }>;
};
```

Themes never branch on raw file format. They branch on `sport` and check which optional fields are present.

## Themes

Six themes, each a distinct design direction. Each is a React component implementing `({ activity }: { activity: Activity }) => JSX.Element`.

1. **Path** — route silhouette is the hero. Stats quiet.
2. **Altitude / Pace** — elevation profile (rides / trail runs) or pace chart (road runs) dominates. Mountain-range portrait.
3. **Photo** — user's photo full-bleed; route + stats overlay subtly.
4. **Data** — info-dense dashboard-as-poster. VAM, normalised power, HR zones, SWOLF — whichever the sport supports.
5. **Editorial** — typography-led. Magazine-headline treatment of distance, date, location.
6. **Triathlon / Multi-sport** — swim → T1 → bike → T2 → run as one coherent piece.

Each theme owns its type system, palette, and grid. Different display fonts per theme (Google Fonts or self-hosted). Avoid Inter as a default.

Sport-specific stat rendering rules live in the `sport-data` skill.

## Export

- Target: **1080×1350** (Instagram portrait, 4:5)
- PNG via `html-to-image` at `pixelRatio: 2` (so the DOM renders at 540×675 for crispness; adjust the card's internal layout accordingly)
- Wait for `document.fonts.ready` before rasterising
- iOS Safari: rasterise twice and discard the first result (known library quirk)
- Trigger Web Share API on mobile with the resulting `File`, fall back to direct download

## Carousel Post mode

An additive second mode alongside the single card (top-level **Single Card ↔ Carousel** toggle in `components/app/mode-toggle.tsx`). Single Card is untouched. A carousel is always one **seamless** continuous canvas (n×1080 × 1350) sliced into n frames on export, so the photo and route bleed across slide edges. Styling is **deck-wide** (driven by the chosen theme + the shared accent) — there are no per-slide overrides.

- **One renderer** — `components/carousel/seamless-canvas.tsx` is the single source of truth: photo panorama + spanning route + per-panel type. The editor previews it through a horizontally scroll-snapped window (one slide at a time, swipe for neighbours, IG/Strava-style); the slide strip windows onto the same canvas (thumbnails are slices); the export slices it. Preview, thumbnails and output therefore always match.
- **State** — `hooks/use-carousel.ts` owns the chosen **deck** + selection; the user picks a deck (3 or 4 slides — Intro · details · Wrap-up) rather than adding/removing single slides (`DECKS` in `lib/carousel/types.ts`). A slide is just `{ id, template }`.
- **Distinct themes** — the carousel has its own seven hand-tuned themes (names differ from Single Card; the ThemeId still keys both), each a different *layout*, driven by three levers in `lib/carousel/theme-tokens.ts`: `heroLayer` (the signature element spanning the strip), `panelKind` (how each slide is laid out), and an optional `crossViz` (a small wrap-up glyph):
  - **Trace** (path) — route silhouette on paper + elevation sparkline.
  - **Ascent** (altitude) — elevation mountain-range (dark) + route glyph.
  - **Exposure** (photo) — full-bleed photo panorama, magazine masthead.
  - **Frame** (minimal) — one huge datum per slide, hairline rules (`panels/frame-panel.tsx`).
  - **Telemetry** (data) — dense metric grid + HR/power zone bars + micro-graphic (`panels/telemetry-panel.tsx`).
  - **Press** (editorial) — newspaper: masthead, drop cap, pull-quotes (`panels/press-panel.tsx`).
  - **Relay** (triathlon) — swim→T1→bike→T2→run timeline spanning the strip (`segments-timeline.tsx`).
- **Standard panels** — `components/carousel/templates/` (Hero, StatRow, StatGrid, Editorial) for the route/elevation/photo/segments themes; the signature layer threads through them.
- **Shared sidebar** — both editors render `components/app/activity-controls.tsx` (from `control-primitives.tsx`). The theme picker (`theme-picker.tsx`) is shared, shown below the preview in both modes (carousel labels via `CAROUSEL_THEME_LABELS`). Photo crop/zoom/rotate/mirror/filter reuse `image-adjust-overlay.tsx` + `photo-effects-controls.tsx`, applied deck-wide.
- **Route & spanning layers** — `route-line.tsx` (rounded caps, start-green/end-red markers, poster / desaturated / highlighter, full-width stretch), `elevation-band.tsx` (mountain range), `segments-timeline.tsx` (triathlon legs), `cross-viz.tsx` (wrap-up secondary).
- **Export** — `lib/export-carousel.ts` rasterises the wide strip once (`toCanvas`, dimension-capped pixel ratio) and slices it into ordered frames — shared together on mobile, downloaded sequentially on desktop. Same `pixelRatio: 2`, `fonts.ready`, and iOS double-call contract as the single card.

## Non-goals

See AGENTS.md for the binding list. The short version: no backend, no OAuth, no accounts, no maps, no PDF, no event mode — yet.
