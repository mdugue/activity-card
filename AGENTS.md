# AGENTS.md

This file is the entrypoint for coding agents working on this repo.

## What this project is

**Effort** is a client-side web app where endurance athletes upload a GPX or .fit file from an activity (ride, run, swim, triathlon) and download a beautifully designed shareable image — the "activity card".

Single-page, fully client-side, no backend, no auth (for MVP). The card is a React component rasterised to PNG via `html-to-image`.

## Read these before any non-trivial work

1. [`SPEC.md`](./SPEC.md) — product vision, architecture decisions, data model, build phases. This is the source of truth for _what_ and _why_.
2. Skills in `.claude/skills/` — focused technical references:
   - `activity-card-spec/` — quick reference to scope and phases
   - `card-rendering/` — `html-to-image` gotchas, route SVG math, theme component contract
   - `sport-data/` — sport-specific metrics, units, parsing normalisation
3. Topic-specific docs under `docs/`:
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
```

## Conventions

- **TypeScript strict mode.** No `any` without a `// reason:` comment.
- **Tailwind for styling.** No CSS-in-JS, no styled-components. Theme components may use scoped `<style>` for fonts.
- **Combine class names with `cn()`** from `@/lib/utils` (clsx + tailwind-merge). Never template-literal concatenation for conditional classes — write `cn("base", active && "…")`, not `` `base ${active ? "…" : ""}` ``.
- **Shadows use Tailwind's scale** (`shadow-xs` … `shadow-2xl`), tinted when needed via `shadow-<token>` (e.g. `shadow-primary/50`). No arbitrary `shadow-[…]` in app chrome. Themes in `components/themes/` are the exception: they rasterise to PNG, so their shadows stay inline as `style={{ boxShadow }}`.
- **No console.log in committed code.** Use proper error UI for user-facing failures.
- **Commit messages**: Conventional Commits (`feat:`, `fix:`, `refactor:`, etc.).
- **Lint + typecheck must be green** before pushing: `bun lint && bun typecheck`.

## File structure

```
app/                  Next.js App Router routes only (page.tsx, layout.tsx, route handlers).
                      No private `_components/` folders — keep components in `/components/`.
components/
  ui/                 shadcn primitives. VENDOR — do NOT edit; re-add via `bunx shadcn add`.
  app/                App-level composite components (states, shell, wordmark, sample data).
  themes/             Activity-card themes, one file per theme. All export a component
                      matching the shared `ActivityCardProps` interface.
hooks/                Shared client hooks. (`use-mobile.ts` is shadcn-vendor.)
lib/                  Utilities (`cn`, parsers, formatters).
public/               Static assets.
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
- **A new theme** → `components/themes/<name>.tsx`, registered in the theme map.
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
