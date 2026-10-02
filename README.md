# Effort — activity cards for endurance athletes

**Effort** turns a single endurance workout into a beautiful, shareable
image. Upload a GPX or `.fit` file — or pick a recent activity straight from
Strava — choose a theme, optionally drop in a background photo, and download
a 1080×1350 PNG (or a multi-slide carousel) rendered entirely in your
browser.

The card is a React component rasterised to PNG via `snapdom`. There is
no database and no user account; the only backend is a handful of Next.js
Route Handlers for the Strava OAuth token exchange. Deployed on Vercel
(Node runtime).

## Read first

- [`SPEC.md`](./SPEC.md) — product vision, architecture decisions, data
  model, build phases. The source of truth for _what_ and _why_.
- [`AGENTS.md`](./AGENTS.md) — the binding guide for contributors and coding
  agents: conventions, file structure, theme system, commands.
- [`docs/strava.md`](./docs/strava.md) — Strava OAuth setup (required env
  vars, local mock, brand constraints).
- [`docs/creating-a-theme.md`](./docs/creating-a-theme.md) — how to add a
  theme.

## Quick start

```bash
bun install
bun dev          # http://localhost:3000
```

Uploading GPX/.fit files works with no configuration. To use the Strava
picker, copy `.env.example` to `.env.local` and fill in your Strava API
credentials (see `docs/strava.md`).

## Commands

```bash
bun dev              # local dev server
bun run build        # production build
bun lint             # oxlint (type-aware) + oxfmt --check, via ultracite
bun run fix          # autofix lint findings, then format
bun typecheck        # tsc --noEmit (TypeScript 7)
bun run test         # unit tests (bun:test, scoped to ./lib ./theme)
bun run test:e2e     # Playwright e2e
bun run storybook    # theme/component workbench
```

## License

The code is licensed under the [Apache License 2.0](./LICENSE). Two things
it builds on are not: the videos are made with
[Remotion](https://www.remotion.dev/license), which is free for individuals
and small companies but needs a company licence beyond three employees, and
the Strava name, logo and connect button are Strava's trademarks. The photos
in `public/images/` are not licensed either. See [`NOTICE`](./NOTICE).
