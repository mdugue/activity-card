# Plan 002: Replace the boilerplate README and fix the three doc contradictions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2315563..HEAD -- README.md SPEC.md AGENTS.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs
- **Planned at**: commit `2315563`, 2026-06-12

## Why this matters

`README.md` is still the untouched `create-next-app` boilerplate — it doesn't
say what Effort is, doesn't mention Bun, env vars, or where the real docs
live. It's the first file a human contributor reads. Meanwhile the docs
contradict each other about deployment: `SPEC.md:26` says "Deploy as static
site (Cloudflare Pages)", `AGENTS.md:36` says "Cloudflare Pages or Vercel",
and `SPEC.md:58-61` states the actual truth — Vercel, Node runtime, because
the Strava OAuth route handlers killed the static-export plan. SPEC.md's
Non-goals section also still says "no OAuth" even though Strava OAuth shipped
(Phase 2A). Each contradiction costs a new reader a wrong first model of the
project.

## Current state

- `README.md:1-31` — entire file is create-next-app boilerplate ("This is a
  [Next.js](https://nextjs.org) project bootstrapped with…", Geist font notes,
  Vercel template links). Nothing project-specific.
- `SPEC.md:26` — under "### MVP (this phase)":
  ```
  - Deploy as static site (Cloudflare Pages)
  ```
- `SPEC.md:56-61` — under "### Stack" (this is the CORRECT, current story):
  ```
  - No database, no auth (MVP). Phase 2A adds Route Handlers for the Strava
    OAuth dance — token cookies, no persisted user state.
  - Deploys to Vercel (Node runtime). The original "static export to
    Cloudflare Pages" plan was invalidated when Phase 2 introduced the
    Strava OAuth backend; CF Pages would also work via Pages Functions but
    needlessly splits the runtime story.
  ```
- `SPEC.md:169-171` — the stale Non-goals tail:
  ```
  ## Non-goals

  See AGENTS.md for the binding list. The short version: no backend, no OAuth, no accounts, no maps, no PDF, no event mode — yet.
  ```
- `AGENTS.md:36` — under "## Tech stack":
  ```
  - Deployed as a static site (Cloudflare Pages or Vercel)
  ```
- `.env.example` exists at the repo root and documents `STRAVA_CLIENT_ID`,
  `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI` (+ optional overrides), but
  neither README nor AGENTS.md points at it; only `docs/strava.md` does.
- Repo conventions: Markdown docs are plain GFM; AGENTS.md is the binding
  agent-facing doc; SPEC.md is product truth; `docs/` holds topic deep-dives.

## Commands you will need

| Purpose | Command    | Expected on success |
|---------|------------|---------------------|
| Lint    | `bun lint` | exit 0 (markdown isn't linted, but run it to prove nothing else broke) |

## Scope

**In scope** (the only files you should modify):
- `README.md` (full rewrite)
- `SPEC.md` (lines 26 and 169-171 only)
- `AGENTS.md` (line 36, plus one pointer line in the Commands section)
- `plans/README.md` (status row)

**Out of scope** (do NOT touch):
- `docs/strava.md`, `docs/creating-a-theme.md` — spot-checked accurate
- `.env.example` — already correct
- Any code file
- The rest of SPEC.md / AGENTS.md — no rewording beyond the listed edits

## Git workflow

- Work on the current branch unless the operator says otherwise.
- Conventional Commits: `docs: rewrite README, align deploy story and non-goals`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Rewrite README.md

Replace the entire file with:

````markdown
# Effort — activity cards for endurance athletes

**Effort** turns a single endurance workout into a beautiful, shareable
image. Upload a GPX or `.fit` file — or pick a recent activity straight from
Strava — choose a theme, optionally drop in a background photo, and download
a 1080×1350 PNG (or a multi-slide carousel) rendered entirely in your
browser.

The card is a React component rasterised to PNG via `html-to-image`. There is
no database and no user account; the only backend is a handful of Next.js
Route Handlers for the Strava OAuth token exchange. Deployed on Vercel
(Node runtime).

## Read first

- [`SPEC.md`](./SPEC.md) — product vision, architecture decisions, data
  model, build phases. The source of truth for *what* and *why*.
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
bun lint             # ESLint + ultracite (Biome)
bun typecheck        # tsgo --noEmit
bun run test         # unit tests (bun:test, scoped to ./lib)
bun run test:e2e     # Playwright e2e
bun run storybook    # theme/component workbench
```
````

**Verify**: `grep -c "create-next-app\|bootstrapped" README.md` → `0`, and
`grep -c "bun install" README.md` → at least `1`.

### Step 2: Fix SPEC.md's MVP deploy bullet

At `SPEC.md:26`, replace:

```
- Deploy as static site (Cloudflare Pages)
```

with:

```
- Deploy on Vercel (originally planned as a static Cloudflare Pages site;
  superseded in Phase 2A — see Architecture → Stack)
```

**Verify**: `grep -n "Deploy as static site" SPEC.md` → no matches.

### Step 3: Fix SPEC.md's Non-goals tail

At `SPEC.md:169-171`, replace the paragraph under `## Non-goals` with:

```
See AGENTS.md for the binding list. The short version: no accounts, no maps,
no PDF, no event mode — yet. Strava OAuth (Phase 2A) IS live; its Route
Handlers are the one sanctioned exception to the original "no backend" rule.
```

**Verify**: `grep -n "no backend, no OAuth" SPEC.md` → no matches.

### Step 4: Fix AGENTS.md's deploy line and add the env pointer

1. At `AGENTS.md:36`, replace
   `- Deployed as a static site (Cloudflare Pages or Vercel)` with
   `- Deployed on Vercel (Node runtime — the Strava OAuth Route Handlers rule out a fully static export)`
2. In the `## Commands` section of AGENTS.md (right after the fenced command
   block), add one line:
   `Strava OAuth needs env vars — copy `.env.example` to `.env.local` (see [`docs/strava.md`](./docs/strava.md)). File upload works without any configuration.`

**Verify**: `grep -n "static site" AGENTS.md` → no matches;
`grep -n "env.example" AGENTS.md` → 1 match.

### Step 5: Full check

```bash
bun lint
```

**Verify**: exit 0.

## Test plan

Docs-only change; the verification greps in each step are the test. No code
paths touched.

## Done criteria

- [ ] `grep -rn "create-next-app" README.md` → no output
- [ ] `grep -rn "Deploy as static site" SPEC.md AGENTS.md` → no output
- [ ] `grep -n "no backend, no OAuth" SPEC.md` → no output
- [ ] `grep -n "env.example" README.md AGENTS.md` → ≥1 match in each
- [ ] `bun lint` exits 0
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- The quoted SPEC.md/AGENTS.md lines no longer exist at those locations
  (drift) — re-locate them by content; if the surrounding section was
  restructured, report instead of guessing where the claims moved.
- You find a *new* deployment claim elsewhere (e.g. a vercel.json or
  wrangler config appears) that contradicts "Vercel, Node runtime".

## Maintenance notes

- If deployment ever moves off Vercel, three places now state it: README,
  SPEC.md Stack, AGENTS.md Tech stack. Keep them in lockstep — or better,
  state it once in SPEC.md and point the other two at it.
- Reviewer: check the README renders correctly on GitHub (nested code fence
  in Step 1 — the inner ```bash blocks must survive).
