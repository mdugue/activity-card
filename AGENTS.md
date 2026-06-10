# AGENTS.md

This file is the entrypoint for coding agents working on this repo.

## What this project is

**Effort** is a client-side web app where endurance athletes upload a GPX or .fit file from an activity (ride, run, swim, triathlon) and download a beautifully designed shareable image — the "activity card".

Single-page, fully client-side, no backend, no auth (for MVP). The card is a React component rasterised to PNG via `html-to-image`.

## Read these before any non-trivial work

1. [`SPEC.md`](./SPEC.md) — product vision, architecture decisions, data model, build phases. This is the source of truth for _what_ and _why_.
2. Skills in `.claude/skills/` — focused technical references:
   - `activity-card-spec/` — quick reference to scope and phases
   - `card-rendering/` — `html-to-image` gotchas, route SVG math, the single-card theme component contract
   - `carousel-themes/` — the Carousel ("accordion") theme system: tokens, decks, photo handling
   - `sport-data/` — sport-specific metrics, units, parsing normalisation
3. Topic-specific docs under `docs/`:
   - [`docs/creating-a-theme.md`](./docs/creating-a-theme.md) — the step-by-step
     guide for adding a theme (either family) or a new adjustable knob: the
     `defineTheme` walkthrough, checklists, and verification commands.
   - [`docs/strava.md`](./docs/strava.md) — Strava OAuth + picker
     integration, local dev against the real API or the bundled mock,
     and brand-compliance constraints. Read before touching anything
     under `app/api/strava/`, `lib/strava-*.ts`, or `components/app/strava-*.tsx`.

If a decision is in SPEC.md, follow it. If you want to deviate, raise it and ask.

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind v4
- `html-to-image` for DOM-to-PNG
- `fast-xml-parser` for GPX, `fit-file-parser` for .fit
- Deployed as a static site (Cloudflare Pages or Vercel)
- No database, no API routes that hold state (MVP)

## Commands

```bash
bun install
bun dev          # local dev server
bun build        # production build
bun lint
bun typecheck
bun run test     # unit tests (bun:test, scoped to ./lib)
bun run test:e2e # Playwright e2e
```

## Testing

Two layers, two runners — keep them separate:

- **Unit tests** use the built-in **`bun:test`** runner. They live colocated
  next to the code they cover as `lib/<name>.test.ts` and assert pure logic
  (formatters, geometry, parsing, OAuth-state encode/validate). Run with
  `bun run test` (scoped to `./lib` so it never picks up the e2e specs),
  `bun run test:watch`, or `bun run test:coverage`.
  `playwright.config.ts` and [`docs/strava.md`](./docs/strava.md).

Why scoped: Playwright owns `*.spec.ts` under `e2e/`; bun unit tests use
`*.test.ts`. The `test` script passes `./lib` explicitly so a bare run can't
try to execute Playwright specs through the wrong runner. Add new unit-test
roots to that script (and `bunfig.toml`'s note) if tests grow beyond `lib/`.

## Themes — two families

Effort has **two theme families**. Every theme — either family — is expressed
through the same descriptor core (`ThemeBase` in `lib/theme-contract.ts`:
identity, colour policy, photo policy, params) and the same editor machinery;
the families differ only in their **render strategy** and keep separate id
spaces. Never cross-import a single-card theme into the carousel renderer or
vice-versa — the renderers' guarantees differ (a bespoke poster vs the seamless
strip).

|                | Single card                                            | Carousel ("accordion")                                              |
| -------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| Output         | one 1080×1350 poster                                   | an n×1080 × 1350 seamless strip, sliced into slides                 |
| A theme is…    | **a `defineTheme` descriptor** (component + declaration) | **a token row** (data)                                              |
| Lives in       | `components/themes/single-card/<name>.tsx`             | tokens: `lib/carousel/theme-tokens.ts` · render: `components/themes/carousel/` |
| Id space       | `ThemeId` (`components/themes/index.ts`)               | `CarouselThemeId` (`lib/carousel/theme-tokens.ts`)                  |
| Registered in  | `SINGLE_CARD_THEMES` (descriptor registry)             | `CAROUSEL_THEME_TOKENS` + `CAROUSEL_THEME_ORDER`                    |
| Renderer       | the theme component itself                             | one shared `components/themes/carousel/seamless-canvas.tsx`         |
| Contract       | `ThemeProps` + capability declaration — see `card-rendering` + `theme-params` skills | theme tokens/levers — see `carousel-themes` skill |
| Story          | `components/themes/single-card/<name>.stories.tsx`     | a story in `components/themes/carousel/seamless-canvas.stories.tsx` |

Both families share the same **editor machinery**:

- **Parameters** (`lib/params/`): a theme's adjustable knobs are declared as data
  (`ParamDef[]`) and rendered generically — there are no per-theme control
  components. Config lives in one coerced slot keyed by theme id; the editor
  groups controls by category (STYLE · LAYOUT · PHOTO · TEXT · STATS · MARKS · ACTIVITY).
- **Capabilities** (`lib/theme-contract.ts`): a single-card theme *declares* which
  overlay elements it renders (`uses` / sport-aware `usesWhen`). The declaration
  narrows the component's `data` prop type (reading an undeclared field is a
  compile error) and drives the editor's availability; the carousel derives the
  same answer from its stat planner.
- **Colour** (`lib/colors.ts`): themes consume a resolved `ColorScheme`; the user
  picks a `ColorChoice` — a static preset (single hue or pair) or a photo-derived
  strategy — in one control, hidden for fixed-palette themes.
- **Photo**: every theme shows a background photo, gated by the shared
  `photoBackdrop` toggle, adjustable via the same filter / grain / mirror /
  rotate presets in both modes; per-theme defaults come from the descriptor's /
  token row's photo policy.

See the `theme-params` skill before adding or changing a theme's knobs, and
[`docs/creating-a-theme.md`](./docs/creating-a-theme.md) for the full
add-a-theme walkthrough (both families, with checklists).

## Storybook

Stories live **colocated** with the component as `<name>.stories.tsx`
(`.storybook/main.ts` globs `components/**/*.stories.tsx`). The shared preview
imports `app/globals.css` so stories render with the real Tailwind layer + theme
tokens; a **Background** toolbar dropdown (free sport photos) plus a per-story
**Background upload** control let you preview any photo-capable theme over an
image (`.storybook/backgrounds.ts`, `.storybook/with-background.tsx`).

- `bun run storybook` — dev server · `bun run build-storybook` — static build,
  the headless check that every story still compiles (a vitest runner is
  intentionally not wired up).
- Tag generated stories `['ai-generated']`.

**Every theme must have a story — both families** (see the table above for where
each lives). A theme is not "done" until it renders in Storybook. For a
photo-capable theme, spread `backgroundArgTypes` into the story `meta` and type
it `Meta<ComponentProps<typeof X> & BackgroundArgs>` so the background controls
appear.

## Conventions

- **TypeScript strict mode.** No `any` without a `// reason:` comment.
- **Tailwind for styling.** No CSS-in-JS, no styled-components. Theme components may use scoped `<style>` for fonts.
- **Combine class names with `cn()`** from `@/lib/utils` (clsx + tailwind-merge). Never template-literal concatenation for conditional classes — write `cn("base", active && "…")`, not `` `base ${active ? "…" : ""}` ``.
- **Shadows use Tailwind's scale** (`shadow-xs` … `shadow-2xl`), tinted when needed via `shadow-<token>` (e.g. `shadow-primary/50`). No arbitrary `shadow-[…]` in app chrome. Themes in `components/themes/` are the exception: they rasterise to PNG, so their shadows stay inline as `style={{ boxShadow }}`.
- **Route/path silhouettes stay geographically faithful.** Project route coordinates with a single uniform scale and centre them in their container — use `projectRoute` / `routePath` (`lib/chart-helpers.ts`), which do exactly this. Never stretch a path per-axis to fill a box (e.g. to span the full carousel width): a distorted silhouette misrepresents the real route. Keep its true proportions and centre it (for the carousel hero, in the middle of the complete viewport).
- **No console.log in committed code.** Use proper error UI for user-facing failures.
- **Every theme ships a colocated story** — single-card *and* carousel. Adding or
  renaming a theme isn't complete without its `*.stories.tsx`; see [Storybook](#storybook).
- **Commit messages**: Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.).
- **Lint + typecheck must be green** before pushing: `bun lint && bun typecheck`. Keep
  `bun run build-storybook` green too when you touch themes or stories.

## File structure

```
app/                  Next.js App Router routes only (page.tsx, layout.tsx, route handlers).
                      No private `_components/` folders — keep components in `/components/`.
components/
  ui/                 shadcn primitives. VENDOR — do NOT edit; re-add via `bunx shadcn add`.
  app/                App-level composite components (states, shell, wordmark, sample data).
  themes/
    single-card/      SINGLE-CARD themes — one file per theme, each exporting its
                      component plus a `defineTheme` descriptor; collected in
                      `themes/index.ts` (`SINGLE_CARD_THEMES` / `ThemeId`).
    carousel/         CAROUSEL ("accordion") themes — one renderer
                      (`seamless-canvas.tsx`) + slide templates/panels. A carousel
                      theme itself is a token row in `lib/carousel/theme-tokens.ts`,
                      not a file-per-theme component.
    shared/           Rendering utilities both card kinds build on (photo layers,
                      cover-photo geometry, photo-fx context, overlay-route).
                      (Stories colocate next to components as `<name>.stories.tsx`.)
hooks/                Shared client hooks. (`use-mobile.ts` is shadcn-vendor.)
lib/                  Utilities (`cn`, parsers, formatters). `lib/activity.ts` is the
                      canonical ActivityData model. `lib/theme-contract.ts` holds the
                      single-card descriptor contract (capabilities, ThemeData,
                      defineTheme); `lib/colors.ts` the ColorScheme/ColorChoice model.
                      `lib/carousel/` holds the carousel theme tokens (+ the derived
                      `CAROUSEL_THEMES` ThemeBase registry), deck + stat planning, and
                      resolve logic. `lib/params/` holds the editor parameter schema
                      (`ParamDef`) and `coerceConfig` coercion; param specs live on the
                      theme descriptors themselves.
public/               Static assets.
.storybook/           Storybook config + the shared preview, background presets,
                      and the background-photo decorator.
.claude/skills/       Focused references — read before non-trivial work in their area.
```

### Naming

- **No underscore-prefixed folders.** Next.js treats `_foo/` as private routes; we keep
  components under `/components/` instead so they're importable everywhere via `@/components/...`.
- **Files** are `kebab-case.tsx` / `kebab-case.ts`.
- **Components** are `PascalCase` named exports. No default exports except for Next.js
  page/layout files.
- **Hooks** start with `use` and live in `hooks/`.
- Prefer `interface` over `type` for object shapes (lint enforces this via ultracite).
- Use the `@/...` path alias for absolute imports across folders. Sibling files may use
  relative paths.

### Where new code goes

- **A new screen or state of the app** → `components/app/<name>.tsx`, wired from `app/page.tsx`.
- **A new single-card theme** → one `components/themes/single-card/<name>.tsx`
  exporting the component and a `defineTheme` descriptor (capabilities, colour +
  photo policy, params); add it to `SINGLE_CARD_THEMES` + `THEME_ORDER`
  (`components/themes/index.ts`), **plus a colocated
  `components/themes/single-card/<name>.stories.tsx`**.
- **A new carousel theme** → a token row in `lib/carousel/theme-tokens.ts` (add
  the id to `CarouselThemeId` + `CAROUSEL_THEME_ORDER`), **plus a story for it in
  `components/themes/carousel/seamless-canvas.stories.tsx`**. See the `carousel-themes` skill.
- **A new adjustable knob on a theme** → add a `ParamDef` to the theme's
  `*_PARAMS` spec (pure data in `lib/<theme>.ts`) and reference it from the
  theme's descriptor (`defineTheme` `params`/`defaults`, or the carousel token
  row). It renders generically — no new control component, app-state field, or
  dispatch arm. See the `theme-params` skill.
- **A new shadcn primitive** → `bunx shadcn add <name>` (lands in `components/ui/`, untouched).
- **A new shared utility** → `lib/<name>.ts`.

### Vendor files

`components/ui/**` and `hooks/use-mobile.ts` are scaffolded by the shadcn / Next.js CLIs.
For these files `biome.jsonc` disables a curated set of rules that shadcn's generated
code violates (see the `overrides` block); `eslint.config.mjs` ignores them entirely
since react-hooks rules can't be turned off per-folder cleanly. `components/ui/calendar.tsx`
is additionally excluded from `bun typecheck` (see `tsconfig.json`) — it ships against
`react-day-picker` v9 but v10 is installed. Don't restyle vendor files; if a primitive
doesn't fit, wrap it in `components/app/`.

## Non-goals (still out of scope)

To keep the agent focused, these are explicitly out of scope right now:

- **komoot OAuth integration** (no public OAuth — partner-only)
- User accounts, persistence, saved cards
- "Update Strava activity description with link to card" (depends on saved cards)
- Event organiser / B2B verification flow
- PDF export
- Email delivery
- Server-side rendering of cards
- Map tiles (route is always rendered as an abstract SVG silhouette)

Note: **Strava OAuth (Phase 2A) is live** — see [`docs/strava.md`](./docs/strava.md).
The original MVP "no backend" constraint was relaxed for the token-exchange
Route Handlers; everything else above remains off-limits without explicit
sign-off.

If you find yourself reaching for any of these, stop and confirm.

## When in doubt

Ask before:

- Introducing a backend / API route with state
- Changing the data model in SPEC.md
- Adding a seventh theme or removing one of the six
- Bringing in a map library

Small refactors, bug fixes, styling iteration, theme polish — proceed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->
