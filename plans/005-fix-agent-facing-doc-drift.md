# Plan 005: Agent-facing docs match the code (commands, test scope, paths, theme count)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat d67a92b..HEAD -- AGENTS.md README.md SPEC.md docs/strava.md .claude/skills/effort-videos/SKILL.md .claude/skills/theme-params/SKILL.md .claude/skills/card-rendering/SKILL.md .claude/skills/sport-data/SKILL.md .claude/skills/activity-card-spec/SKILL.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (docs only)
- **Depends on**: none. If plan 003 runs first, it also edits `docs/strava.md` (bounce section) — edit only the cookie table/“only path” sentence here.
- **Category**: docs
- **Planned at**: commit `d67a92b`, 2026-09-28

## Why this matters

`AGENTS.md` and `.claude/skills/*` are the first thing every coding agent
reads here ("Read these before any non-trivial work"). Several statements
are now wrong: a build command that runs Bun's bundler instead of Next,
test-scope instructions contradicting `package.json`, a truncated Testing
section, dead file paths (which invite agents to re-create files that exist,
e.g. a second `simplify.ts`), a theme-count guardrail already exceeded, and
Strava cookie lifetimes that don't match the code. Wrong instructions cost
every future agent session.

## Current state (each item verified against the code at `d67a92b`)

1. `AGENTS.md:48` — `bun build        # production build`. `bun build` is Bun's bundler; the script is `bun run build` (`package.json` `"build": "next build"`; `README.md:37` already says `bun run build`).
2. `AGENTS.md:53` says tests are "scoped to ./lib + ./theme" (correct, matches `package.json` `"test": "bun test ./lib ./theme"`), but `AGENTS.md:65-75` says tests live as `lib/<name>.test.ts`, "scoped to `./lib`", and "Add new unit-test roots … if tests grow beyond `lib/`". Tests already exist under `theme/` (e.g. `theme/core/theme-registry.test.ts`). `README.md:44` also says "scoped to ./lib". The correct wording already exists in `bunfig.toml` (lines 1-8).
3. `AGENTS.md:69-70` — the unit-test bullet ends and is followed by an orphan fragment: "`playwright.config.ts` and [`docs/strava.md`](./docs/strava.md)." The e2e bullet ("Two layers, two runners") is missing. Facts for it: Playwright specs live in `e2e/*.spec.ts`, run with `bun run test:e2e`; the Strava flow uses a local mock (`e2e/strava-mock.ts`) wired through env vars in `playwright.config.ts`; see `docs/strava.md`.
4. `AGENTS.md:125` — "(`.storybook/main.ts` globs `components/**/*.stories.tsx`)". Actual globs (`.storybook/main.ts:5-6`): `../components/**/*.stories.@(js|jsx|mjs|ts|tsx)` and `../theme/**/*.stories.@(js|jsx|mjs|ts|tsx)`.
5. Theme count: `theme/single-card/index.ts` `THEME_ORDER` has **7** single-card themes; `theme/carousel/registry.ts` has **6** carousel themes. But `AGENTS.md:282` says "Adding a seventh theme or removing one of the six"; `SPEC.md:21` says "Six themes (see below)" while `SPEC.md:129` says "Seven themes"; `.claude/skills/activity-card-spec/SKILL.md:44` says "six is the spec … rather than adding a seventh."
6. Dead paths in skills:
   - `.claude/skills/effort-videos/SKILL.md:60` → `components/themes/shared/photo-fx.tsx`; real: `theme/shared/photo-fx.tsx`.
   - `.claude/skills/theme-params/SKILL.md:142` → `lib/theme-registry.test.ts`; real: `theme/core/theme-registry.test.ts`.
   - `.claude/skills/card-rendering/SKILL.md:127` → "Implement in `lib/metrics/simplify.ts`"; real, existing: `lib/simplify.ts`.
   - `.claude/skills/sport-data/SKILL.md:75` → "Centralise in `/metrics/format.ts`"; real, existing: `lib/format.ts`.
7. `docs/strava.md:245-258` cookie table says `strava_access` lives "Until expiry", `strava_athlete` "Until disconnect", and that "`ensureFreshToken()` is the only path that talks to `/oauth/token`". Code: `lib/strava-cookies.ts:24-38` sets a one-year `maxAge` on the token cookies (comment there explains why); `/oauth/token` is also called by `forceRefreshToken` (`lib/strava-cookies.ts`, used from `lib/strava-client.ts`) and by the callback's code exchange (`app/api/strava/callback/route.ts`). Re-read those lines before editing — describe the code's behaviour, do not change it. Never paste secret values.

Note: `.claude/skills/{effort-videos,theme-params,card-rendering,sport-data,activity-card-spec}` are real directories owned by this repo (not symlinks to `.agents/skills`) — editing them is fine. Do **not** edit anything under `.agents/skills/` (third-party, managed by `npx skills update`).

## Commands you will need

| Purpose                         | Command          | Expected on success |
| ------------------------------- | ---------------- | ------------------- |
| Format/lint (includes markdown) | `bun lint`       | exit 0              |
| Autoformat                      | `bun run format` | exit 0              |

## Scope

**In scope**: `AGENTS.md`, `README.md`, `SPEC.md` (line ~21 only), `docs/strava.md` (cookie table + "only path" sentence), the five `.claude/skills/*/SKILL.md` files named above.

**Out of scope**: any code; `.agents/skills/**`; `CLAUDE.md` (it only includes `AGENTS.md`); any wording about _whether_ new themes should be added beyond restating the current counts.

## Git workflow

- Branch: `advisor/005-doc-drift`
- One commit: `docs: fix agent-facing drift (commands, test scope, paths, theme counts)`

## Steps

### Step 1: AGENTS.md commands + testing

- Item 1: `bun build` → `bun run build`.
- Item 2: change "`lib/<name>.test.ts`" to "`lib/<name>.test.ts` / `theme/**/<name>.test.ts`", "scoped to `./lib`" → "scoped to `./lib ./theme`", and the last sentence to "…if tests grow beyond `lib/` and `theme/`." Same fix in `README.md:44`.
- Item 3: replace the orphan fragment with a second bullet: "**E2E tests** use **Playwright**: specs in `e2e/*.spec.ts`, run with `bun run test:e2e`. The Strava flow runs against a local mock (`e2e/strava-mock.ts`) wired through env vars in `playwright.config.ts` — see `docs/strava.md`."

**Verify**: `grep -nE '^bun build|scoped to .\./lib.\s*so' AGENTS.md` → no matches; `grep -n "E2E tests" AGENTS.md` → 1 match.

### Step 2: Storybook glob (item 4)

Replace the parenthetical with "(`.storybook/main.ts` globs `components/**` and `theme/**` for `*.stories.tsx`)".

**Verify**: `grep -n 'globs `components/\*\*/\*.stories.tsx`' AGENTS.md` → no match.

### Step 3: Theme counts (item 5)

- `AGENTS.md:282` → "Adding or removing a theme (currently 7 single-card and 6 carousel themes)".
- `SPEC.md:21` → "Seven single-card themes and six carousel themes (see below), sport-aware stat rendering".
- `activity-card-spec/SKILL.md:44` → "\"Should I add another theme?\" — ask first. There are 7 single-card and 6 carousel themes; improve an existing one rather than adding another without sign-off."

**Verify**: `grep -rn "one of the six\|Six themes\|six is the spec" AGENTS.md SPEC.md .claude/skills/activity-card-spec/` → no matches.

### Step 4: Skill paths (item 6)

Point each at the real path; reword card-rendering and sport-data to say the module **exists** ("RDP lives in `lib/simplify.ts`", "Formatting is centralised in `lib/format.ts`").

**Verify**: `grep -rn "components/themes/shared\|lib/theme-registry.test\|lib/metrics/\|/metrics/format" .claude/skills/*/SKILL.md` → no matches (ignore hits inside `.agents/`).

### Step 5: Strava cookie docs (item 7)

Update the Lifetime column to match `lib/strava-cookies.ts` and replace the "only path" sentence with one listing the three callers of the token endpoint.

**Verify**: `grep -n "is the only path" docs/strava.md` → no match.

### Step 6: Format

**Verify**: `bun run format && bun lint` → exit 0.

## Done criteria

- [ ] All Step verifications hold
- [ ] `bun lint` exits 0
- [ ] `git diff --stat` shows only in-scope files; `plans/README.md` row updated

## STOP conditions

- Any referenced line no longer contains the quoted text (drift).
- The theme counts in code differ from 7 / 6 when you check `THEME_ORDER` and the carousel registry — report the actual numbers instead of guessing.

## Maintenance notes

- When adding/removing a theme, update the counts in `AGENTS.md`, `SPEC.md` and the `activity-card-spec` skill together.
- Consider a unit test in `theme/core/theme-registry.test.ts` that asserts the counts, so the docs can't silently drift again (deferred — would need a maintainer call on whether the number is a rule).
