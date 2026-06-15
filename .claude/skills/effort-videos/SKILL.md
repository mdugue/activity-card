---
name: effort-videos
description: Use when creating or editing a Remotion video for Effort — the marketing hero, a feature/tutorial walkthrough, or any new composition. Covers the shared design system under remotion/ (tokens, fonts, VideoFrame, the component kit), brand + motion conventions, fps/resolution/duration norms, how real theme components star in videos, registration in root.tsx + the catalog, the player embeds on the landing/tutorials pages, and the render/preview commands. Read before touching anything under remotion/ or the tutorial player components.
---

# effort-videos

How Effort's videos are made. Every video — the hero and all walkthroughs — is
a Remotion composition built from **one shared design system** so the set
reads as an extension of the app, not a separate brand. Never style a video
from scratch; build it from the modules below.

## Delivery model

Videos are **not** committed MP4s. They play live in the browser through
`@remotion/player` (lazy, in-view-mounted chunks), and `remotion render` is
the **QA gate + on-demand export** (e.g. the vertical hero for social).
Renders land in the gitignored `out/`.

## The foundation (use these, always)

| Module | What it gives you |
| --- | --- |
| `remotion/design/tokens.ts` | The brand as constants: `INK/PAPER/RUST/RUST_BRIGHT/TAN…`, `FONT` (heading/sans/mono var refs), `TYPE` scale, `TRACKING` (the app's caption recipes), `SAFE`/`SPACE`/`RADIUS`, easings `EASE_PANEL/EASE_RISE/EASE_CUT`, `RISE_PX`, `DUR`, `SETTLE_SPRING`, `FPS`, `LANDSCAPE/PORTRAIT/CARD` |
| `remotion/design/motion.ts` | The continuous-movement layer: `linger`/`lingerValue` (one A→B travel that crawls through the centre — slide-in-and-out as a single decelerating glide), `breathe` (slow sine drift so resting elements stay alive), `cameraDrift` (the Stage3D living camera), `EASE_GLIDE`. |
| `remotion/design/fonts.ts` | `getFontVars()` — re-creates the app's `--font-*` set via `@remotion/google-fonts` in Studio/CLI, and intentionally returns `{}` in the player (next/font already provides the vars there). Applied by VideoFrame **during render** — never call it at module scope, the player flag doesn't exist yet there. |
| `remotion/components/video-frame.tsx` | `VideoFrame` — the composition template. **Every composition's scenes mount inside it.** |

## The component kit (`remotion/components/`)

- `logo-sting.tsx` — `AnimatedMark` (line draws in, rust peak pops) + `LogoSting` (mark · EFFORT · claim · optional mono sub). The standard outro.
- `rise-in.tsx` — `RiseIn` / `FadeOut`: THE entrance. 14px rise (`RISE_PX`), damping-200 spring, no bounce.
- `kinetic-title.tsx` — staggered Anton claim lines (`accent: true` → rust).
- `caption.tsx` — the sound-off reading layer: rust mono overline + Inter sentence, pinned in the safe area; optional `step={{index,total}}` chip for walkthroughs.
- `cut-slices.tsx` — `cutSlices()` presentation for `TransitionSeries.Transition`: the brand's guillotine cut (staggered vertical slice reveal).
- `stage-3d.tsx` — `Stage3D` (a perspective room with a subtle living camera) + `Plane3D` (a block angled toward the centre): the hero's "typography on one side, card on the other, 3D" treatment. Keep rotations ≤ ~18° for legibility.
- `backdrop.tsx` — ink/paper/photo stage + the app's own grain tile + vignette.
- `file-icon.tsx` — `FileIcon` (a drawn .GPX / .FIT sheet) + `SourcePlate`: the "any input" beat. Pair with the official Strava connect SVG.
- `browser-frame.tsx` / `cursor.tsx` / `stat-chip.tsx` (`FileChip`, `Pill`, `PaletteChip`) — app-vignette props.
- `card-showcase.tsx` — `CardScaled` (one 1080×1350 card scaled into a scene) and `StripPan` (pans a CarouselDeck strip; `showSeams` demonstrates slide slicing).
- `theme-card.tsx` — `ThemeCard`: renders a REAL single-card theme from the registry with `pickThemeData`, exactly as the app exports it.
- `route-draw.tsx` — a route silhouette drawing itself via the app's `routePath` projection (geographically faithful — never stretch).
- `preload-img.tsx` — `PreloadImg`: REQUIRED next to anything that paints a photo via CSS background (the app's photo layers do); the renderer only waits for Remotion `<Img>`.
- `remotion/videos/walkthrough.tsx` — `TitleScene` / `StepScene` / `OutroScene` + `WALK` pacing: the scaffolding every tutorial is assembled from.

## Real product, not mockups

Videos star the actual theme components with the app's sample fixtures:

```tsx
<CardScaled height={height * 0.56}>
  <ThemeCard data={SAMPLE_RIDE} id="path" />
</CardScaled>

<CarouselDeck data={SAMPLE_RIDE} {...carouselArgs("trace")} />   // in StripPan
```

- Fixtures: `SAMPLE_RIDE/RUN/SWIM/TRI/BRICK` from `components/app/sample-data.ts`.
- Photos: `staticFile("images/ride.jpg")` (2200×3301) and `staticFile("images/dunes.webp")` (1600×2400). Carousel decks need that natural size as `imageSize: { w, h }` — pass it as a constant.
- Photo filters/grain on a single card: wrap in `PhotoFxProvider` (`components/themes/shared/photo-fx.tsx`).
- Strava beats use ONLY the official asset `public/strava/btn-connect-with-strava-orange.svg`, unmodified (`docs/strava.md` brand rules).

## Brand + motion conventions

- Stage: warm ink (`INK`), warm paper type (`PAPER`), rust accent — never cold slate (cold slate is reserved for the hero's deliberate "generic stats app" anti-beat).
- Type roles: Anton uppercase for claims (`FONT.heading`), Inter for sentences, JetBrains Mono uppercase + `TRACKING.label`/`micro` for overlines. Theme fonts appear only inside cards.
- Motion: settle curves only (`EASE_PANEL/EASE_RISE/EASE_CUT/EASE_GLIDE`), 14–18px rises, `SETTLE_SPRING` (damping 200). The single allowed overshoot is the mark's rust peak pop. **No CSS transitions/animations and no Tailwind `animate-*`/`transition-*`** — animate exclusively from `useCurrentFrame()`.
- Keep it alive: nothing sits dead still on screen. Resting elements `breathe`; elements that cross frame use one continuous `linger` glide (fast at the off-screen edges, a long elegant hold through the centre) rather than separate in/out moves. The hero opens in `Stage3D` (typography one side, visualisation the other) and a shared word can carry between claims as a single morphing object.
- Pacing: hero = cinematic but tight (~3–6s per beat, internal morphs + `cutSlices`/fade between); walkthroughs = calm (~7–8s per step, fades, numbered `StepScene` captions).
- Sound-off by definition: every message is on screen (Caption). Music optional and royalty-free only; no AI voiceover.

## Specs

- 30 fps (`FPS`). Landscape 1920×1080; the hero also ships a 1080×1920 cut (scenes read `useVideoConfig()` and lay out per orientation — see `hero-scenes.tsx`).
- Hero ≈ 30–45s; walkthroughs 30–60s.
- Durations are exported per video as `*_DURATION_IN_FRAMES`, derived from scene constants minus transition overlaps (transitions shorten a `TransitionSeries`).

## Adding a new video

1. Create `remotion/videos/<name>.tsx`: scenes inside `VideoFrame`, assembled with `TransitionSeries`; export the component + `<NAME>_DURATION_IN_FRAMES`.
2. Tutorial? Build it from `walkthrough.tsx` scaffolding and add a row to `remotion/videos/catalog.ts` — that alone registers it in Studio/CLI (via `root.tsx`) **and** puts it on `/tutorials` (`components/app/tutorials-gallery.tsx`).
3. One-off (like the hero)? Register it in `remotion/root.tsx` and embed via the lazy-player pattern: a `"use client"` default-export player module (`components/app/intro-player.tsx` style) behind `next/dynamic` `ssr:false` + `useInView` (`hooks/use-in-view.ts`).

## Preview & render

```bash
bun run video:studio                 # Remotion Studio (entry: remotion/index.ts)
bun run video:render Hero            # render one composition → out/Hero.mp4
bunx remotion still Hero --frame=420 # one-frame layout check
bunx remotion compositions           # list everything that's registered
```

Entry point + webpack (Tailwind v4 + `@/` alias) live in `remotion.config.ts`;
`remotion/index.ts` imports `app/globals.css` for Studio/CLI only.

## Pre-ship checklist

- [ ] `bun lint && bun typecheck` green.
- [ ] Composition listed by `bunx remotion compositions` and clean in Studio (no delayRender timeouts, no missing-font fallbacks).
- [ ] `bun run video:render <Id>` completes headlessly with no errors.
- [ ] Stills checked at each scene's settled frame: nothing collides with the safe-area captions; cards keep exact 1080×1350 proportions.
- [ ] If embedded: `bun run build` green, player mounts in-view, parks on a settled `initialFrame` (reduced-motion users must never see a blank first frame).
- [ ] New tutorial appears on `/tutorials` with kicker/title/blurb.

## Do / don't

- **Do** reuse `RiseIn`/`Caption`/`Backdrop`/`CardScaled` for every entrance, label, stage, and card.
- **Do** keep route silhouettes geographically faithful (`routePath`/`RouteDraw`).
- **Do** add `PreloadImg` for any CSS-background photo.
- **Don't** hard-code colours/fonts/easings in a scene — import tokens.
- **Don't** use CSS transitions, Tailwind animation classes, or bouncy springs.
- **Don't** mock a card layout the product doesn't render — feed real themes real fixtures.
- **Don't** commit rendered videos or anything in `out/`.
- **Don't** alter Strava brand assets or invent Strava UI.
