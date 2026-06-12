# Plan 003: Enforce the Storybook build in CI and pin the Bun version

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2315563..HEAD -- .github/workflows/ci.yml package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `2315563`, 2026-06-12

## Why this matters

AGENTS.md makes `bun run build-storybook` a binding convention — "the
headless check that every story still compiles" and "Keep `bun run
build-storybook` green too when you touch themes or stories" — but CI never
runs it. Every theme is required to ship a story, so an unenforced story
build means theme regressions land silently and the convention decays into a
false signal. Separately, every CI job installs Bun with `bun-version:
latest`, so an upstream Bun release can change CI behavior between two pushes
of the same PR, and local Bun versions silently drift from CI.

## Current state

- `.github/workflows/ci.yml` — five jobs: `lint`, `typecheck`,
  `unit`, `build`, `e2e`. No storybook job. Every job contains:

  ```yaml
  - uses: oven-sh/setup-bun@v2
    with:
      bun-version: latest
  - run: bun install --frozen-lockfile
  ```

- The `build` job (ci.yml:55-76) is the closest structural template for a new
  job — checkout, setup-bun, frozen install, run a bun script, 10-minute
  timeout.
- `package.json` scripts include `"build-storybook": "storybook build"`.
  There is no `packageManager` field and no `.bun-version` file in the repo.
- The Bun version in the maintainer's current environment is **1.3.11**
  (verified via `bun --version` equivalent during the audit). Pin that.
- `oven-sh/setup-bun@v2` supports a `bun-version-file` input that reads a
  `.bun-version` file.

## Commands you will need

| Purpose         | Command                   | Expected on success |
|-----------------|---------------------------|---------------------|
| Storybook build | `bun run build-storybook` | exit 0, writes `storybook-static/` |
| Sanity          | `bun lint && bun typecheck` | exit 0            |

## Scope

**In scope**:
- `.github/workflows/ci.yml`
- `.bun-version` (create, new file at repo root)
- `plans/README.md` (status row)

**Out of scope**:
- `package.json` (plan 001 edits it; avoid collisions — the pin lives in
  `.bun-version`, not a `packageManager` field)
- `.github/workflows/pr-title.yml`
- `.storybook/**` and any story file — if the storybook build fails, that's a
  finding to report, not something this plan fixes

## Git workflow

- Work on the current branch unless the operator says otherwise.
- Conventional Commits: `ci: gate storybook build, pin bun version`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Prove the storybook build is green locally

```bash
bun install --frozen-lockfile && bun run build-storybook
```

**Verify**: exit 0. If this fails, STOP — the plan assumes the build is
currently green; a red baseline is a separate bug to report.

### Step 2: Create `.bun-version`

Create a file `.bun-version` at the repo root containing exactly:

```
1.3.11
```

**Verify**: `cat .bun-version` → `1.3.11`.

### Step 3: Switch all setup-bun blocks to the version file

In `.github/workflows/ci.yml`, replace every occurrence of

```yaml
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
```

with

```yaml
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: .bun-version
```

**Verify**: `grep -c "bun-version-file: .bun-version" .github/workflows/ci.yml`
→ `5` (before Step 4 adds the sixth) and
`grep -c "bun-version: latest" .github/workflows/ci.yml` → `0`.

### Step 4: Add the storybook job

Append to `.github/workflows/ci.yml` (same indentation level as the other
jobs, modeled on the `build` job but without the Next.js cache):

```yaml
  storybook:
    name: Storybook build
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v6
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version-file: .bun-version
      - run: bun install --frozen-lockfile
      - run: bun run build-storybook
        env:
          NEXT_TELEMETRY_DISABLED: "1"
```

**Verify**: `grep -c "bun-version-file: .bun-version" .github/workflows/ci.yml`
→ `6`, and the YAML stays parseable:
`bun -e "const fs=require('fs');const y=fs.readFileSync('.github/workflows/ci.yml','utf8');if(!/storybook:/.test(y))process.exit(1)"`
→ exit 0. (If a YAML parser is available — e.g.
`bunx yaml validate` equivalents — prefer a real parse; otherwise rely on CI.)

### Step 5: Local sanity

```bash
bun lint && bun typecheck
```

**Verify**: exit 0 (proves nothing else was touched).

## Test plan

The new CI job *is* the test. After this lands, the first PR that breaks a
story must fail the `Storybook build` check. No unit tests apply to workflow
YAML; the local `bun run build-storybook` run in Step 1 is the pre-merge
evidence.

## Done criteria

- [ ] `.bun-version` exists with content `1.3.11`
- [ ] `grep -c "bun-version: latest" .github/workflows/ci.yml` → 0
- [ ] `grep -c "bun-version-file" .github/workflows/ci.yml` → 6
- [ ] ci.yml contains a `storybook:` job running `bun run build-storybook`
- [ ] `bun run build-storybook` exits 0 locally
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- Step 1's storybook build fails (red baseline — report the failing story,
  do not fix it here).
- The installed Bun version available to you differs from 1.3.11 by a major
  or minor version AND `bun install --frozen-lockfile` fails with it —
  report which version works; the pin should be a version that installs the
  lockfile cleanly.
- ci.yml's structure no longer matches the excerpt (e.g. jobs were renamed
  or setup steps changed) — re-anchor by content or report.

## Maintenance notes

- Bumping Bun is now a deliberate one-line change to `.bun-version` (CI and
  every contributor pick it up together). Watch for Bun release notes when
  bumping.
- The storybook job roughly doubles as a "themes compile" gate; if CI minutes
  become a concern, it can be conditioned on paths
  (`components/**`, `.storybook/**`) — deferred deliberately to keep the gate
  simple and always-on.
- If plan 001 (dependency prune) lands around the same time, both touch CI
  inputs (`bun.lock` via 001, workflow via 003) — merge order doesn't matter,
  but re-run CI after the second one lands.
