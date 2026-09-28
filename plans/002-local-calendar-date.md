# Plan 002: Cards show the activity's local calendar date in every timezone

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat d67a92b..HEAD -- lib/format.ts lib/format.test.ts lib/parse-shared.ts lib/strava-to-parsed.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `d67a92b`, 2026-09-28

## Why this matters

`ActivityData.date` is an ISO `YYYY-MM-DD` string. Two bugs combine:

1. **Display**: `formatDate("2026-05-18")` does `new Date("2026-05-18")`,
   which JavaScript parses as **UTC midnight**, then formats it with
   `toLocaleDateString` in the **viewer's** timezone. Anywhere west of UTC
   (all of the Americas) every card prints the previous day ("May 17").
2. **Storage**: `toIsoDate()` stores the **UTC** calendar day of the start
   time, and Strava imports pass `start_date` (UTC) instead of
   `start_date_local`. A 06:30 run in Sydney (UTC+10) is stamped with the
   previous day.

The wrong date ends up in the exported PNG and the export filename. The
existing test `lib/format.test.ts` only passes because CI runs in UTC.

## Current state

`lib/format.ts:89-107`:

```ts
export function formatDate(iso?: string): string {
  if (!iso) {
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** ISO date → "MAY 18, 2026". */
export function formatDateUpper(iso?: string): string {
  return formatDate(iso).toUpperCase();
}
```

`lib/parse-shared.ts:374-383`:

```ts
function toIsoDate(input?: string | number | Date): string {
  if (!input) {
    return new Date().toISOString().slice(0, 10);
  }
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 10);
}
```

It is called at `lib/parse-shared.ts:136` as `date: toIsoDate(isoDate)`.

`lib/strava-to-parsed.ts:79` passes `isoDate: detail.start_date,`. The
generated Strava types (`lib/strava-api.generated.ts`) include an optional
`start_date_local?: string` on the detailed activity. Strava's
`start_date_local` is the wall-clock time **with a misleading `Z` suffix**
(e.g. `"2026-05-18T06:30:00Z"` for 06:30 local) — so its first 10
characters are the local calendar date.

`lib/strava-to-parsed.ts:36-38` also uses `start_date` to compute absolute
epoch ms for the time stream — that use is correct and must stay.

`theme/export/export-shared.ts:20` — `effortDateSlug(date)` strips
non-digits from the stored `YYYY-MM-DD`; it needs no change once the stored
date is right.

Existing tests: `lib/format.test.ts:105-123` (`describe("formatDate", …)`),
e.g. `expect(formatDate("2026-05-18")).toBe("May 18, 2026");`.

Conventions: `bun:test`, colocated tests; strict TS; no `console.log`.

## Commands you will need

| Purpose   | Command                                              | Expected on success      |
| --------- | ---------------------------------------------------- | ------------------------ |
| Typecheck | `bun typecheck`                                      | exit 0                   |
| Tests     | `bun run test`                                       | all pass                 |
| TZ probe  | `TZ=America/Los_Angeles bun test lib/format.test.ts` | all pass (after the fix) |
| Lint      | `bun lint`                                           | exit 0                   |

## Scope

**In scope**:

- `lib/format.ts` (`formatDate` only)
- `lib/format.test.ts`
- `lib/parse-shared.ts` (`toIsoDate` only)
- `lib/parse-shared.test.ts`
- `lib/strava-to-parsed.ts` (the `isoDate:` line only)
- `package.json` — only if you choose to pin `TZ` for the `test` scripts (Step 4)

**Out of scope**:

- The `startMs` computation in `lib/strava-to-parsed.ts:36-38` — it needs UTC.
- Any theme component that calls `formatDate`/`formatDateUpper` — they get fixed for free.
- Changing the `date` field's type or format in `lib/activity.ts` (SPEC data model).

## Git workflow

- Branch: `advisor/002-local-calendar-date`
- Conventional Commits, e.g. `fix(format): show the activity's calendar date regardless of viewer timezone`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Reproduce

**Verify**: `TZ=America/Los_Angeles bun test lib/format.test.ts` → the
"formats an ISO date as a long US date" test FAILS with `May 17, 2026`.
(If it passes, STOP — the premise is wrong.)

### Step 2: Make `formatDate` timezone-independent

In `formatDate`, when the input matches `/^\d{4}-\d{2}-\d{2}$/u`, format it
as a calendar date, not an instant: pass `timeZone: "UTC"` in the
`toLocaleDateString` options (the Date was built at UTC midnight, so
formatting in UTC yields the same calendar day). For any other parseable
input keep today's behaviour. Keep empty/invalid handling unchanged.

**Verify**: `TZ=America/Los_Angeles bun test lib/format.test.ts` → all pass;
`TZ=Pacific/Kiritimati bun test lib/format.test.ts` → all pass.

### Step 3: Store the local calendar date

- `toIsoDate`: if the input is a string already starting with
  `YYYY-MM-DD` (regex `/^\d{4}-\d{2}-\d{2}/u`), return its first 10
  characters unchanged. Otherwise build the date from **local** parts:
  `` `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` ``
  (same for the "now" fallback). Rationale: file timestamps are instants;
  the athlete's device timezone is the best local proxy we have client-side.
- **Careful**: GPX/FIT times are full ISO instants like
  `2026-05-18T23:30:00Z` — they also match the regex prefix. Only take the
  string shortcut when the string has **no time part** (exactly
  `/^\d{4}-\d{2}-\d{2}$/u`); instants go through the local-parts path.
- `lib/strava-to-parsed.ts:79`: change to
  `isoDate: detail.start_date_local?.slice(0, 10) ?? detail.start_date,`
  (a bare `YYYY-MM-DD` hits the unchanged-string path above).

**Verify**: `bun typecheck` → exit 0; `bun run test` → all pass.

### Step 4: Tests that fail in the wrong timezone

- `lib/format.test.ts`: keep existing cases; add one asserting
  `formatDate("2026-01-01")` is `"January 1, 2026"` (year boundary).
- `lib/parse-shared.test.ts`: add a test through the public `finalise()`
  (look at the existing tests in that file for how it is called) that a bare
  `isoDate: "2026-05-18"` yields `date: "2026-05-18"`.
- Make the timezone explicit so CI catches regressions: change the three
  `test*` scripts in `package.json` to run with `TZ=America/Los_Angeles`
  (e.g. `"test": "TZ=America/Los_Angeles bun test ./lib ./theme"`). Then
  run the whole suite once more in UTC too.

**Verify**: `bun run test` → all pass; `TZ=UTC bun test ./lib ./theme` → all pass;
`TZ=Asia/Tokyo bun test ./lib ./theme` → all pass.

## Test plan

See Step 4. Pattern: `lib/format.test.ts` (`describe`/`test`/`expect`).

## Done criteria

- [ ] `bun typecheck` and `bun lint` exit 0
- [ ] `bun run test` exits 0 (now under a negative-offset TZ)
- [ ] `TZ=UTC bun test ./lib ./theme` and `TZ=Asia/Tokyo bun test ./lib ./theme` exit 0
- [ ] `grep -n "start_date_local" lib/strava-to-parsed.ts` finds the new line
- [ ] Only in-scope files modified; `plans/README.md` row updated

## STOP conditions

- Step 1 does not reproduce.
- Any existing test outside `lib/format.test.ts` / `lib/parse-shared.test.ts` fails after pinning `TZ` (another hidden timezone assumption — report it, don't patch it here).
- `start_date_local` is missing from the generated Strava types for the detail object used in `strava-to-parsed.ts`.

## Maintenance notes

- `date` is a **calendar date**, never an instant. Any new formatter must format with `timeZone: "UTC"` or split the string.
- Reviewer: confirm `startMs` still uses `start_date`.
