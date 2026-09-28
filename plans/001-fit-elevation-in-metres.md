# Plan 001: FIT uploads keep their elevation (parse lengths in metres)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat d67a92b..HEAD -- lib/parse-fit.ts lib/parse-shared.ts`
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

Every `.fit` upload (the native Garmin/Wahoo format — one of the app's two
input formats) loses its elevation. `fit-file-parser` is configured with
`lengthUnit: "km"`, and that option converts **every** length field — not
only distance but also `altitude` and `total_ascent`. A 450 m climb arrives
as `0.45`, which `finalise()` rounds to `0`, so `elevationGainM` becomes
`undefined` and the elevation profile collapses to 0s and 1s. Elevation
charts, the Altitude/Strata visuals and triathlon totals are all wrong for
FIT files. There are no FIT tests at all, which is why this went unnoticed.

## Current state

- `lib/parse-fit.ts` — the FIT parser (dynamically imported from `lib/parse-activity.ts`).
- `lib/parse-shared.ts` — `finalise()` turns parsed points + session totals into `ParsedActivity`.
- `node_modules/fit-file-parser/dist/binary.js:318-337` — the library applies
  `options.lengthUnit` to `distance`, `total_distance`, `altitude`,
  `enhanced_altitude`, `total_ascent`, `total_descent` and other length fields.

`lib/parse-fit.ts:49-60` today:

```ts
export async function parseFit(
  buffer: ArrayBuffer,
  filename: string
): Promise<ParsedActivity> {
  const parser = new FitParser({
    force: true,
    speedUnit: "km/h",
    lengthUnit: "km",
    elapsedRecordField: true,
    mode: "list",
  });
```

`lib/parse-fit.ts:75-103` (abridged) reads `r.altitude` into `elevation`,
`session.total_distance` into `sessionDistanceKm`, and
`session.total_ascent` into `sessionElevationM`:

```ts
  const session = fit.activity?.sessions?.[0];
  ...
      elevation: r.altitude,
  ...
    sessionDistanceKm: session?.total_distance,
    sessionDurationSec: session?.total_elapsed_time,
    sessionElevationM: session?.total_ascent,
    sessionAvgSpeedKmh: session?.avg_speed,
```

`lib/parse-shared.ts:97-98` and `:121-126` use them as metres:

```ts
  const elevationGainM =
    input.sessionElevationM ?? cumulativeElevationGain(points);
  ...
  const rawElevation = points.map((p) => p.elevation).filter(isNum);
  const elevationProfile = rawElevation.length
    ? resampleTo(rawElevation, Math.min(ELEVATION_TARGET_POINTS, rawElevation.length))
        .map((v) => Math.round(v))
    : undefined;
```

Speeds are unaffected (`speedUnit: "km/h"` is a separate option).

Conventions: unit tests are `bun:test`, colocated as `lib/<name>.test.ts`
(pattern: `lib/parse-gpx.test.ts`, which builds inputs inline and asserts on
the returned `ParsedActivity`). TypeScript strict; prefer `interface`; no
`console.log`; `zod/mini` is used for schema validation in this file.

## Commands you will need

| Purpose   | Command                          | Expected on success |
| --------- | -------------------------------- | ------------------- |
| Install   | `bun install`                    | exit 0              |
| Typecheck | `bun typecheck`                  | exit 0, no errors   |
| Tests     | `bun run test`                   | all pass            |
| One file  | `bun test lib/parse-fit.test.ts` | all pass            |
| Lint      | `bun lint`                       | exit 0              |

## Scope

**In scope** (the only files you should modify):

- `lib/parse-fit.ts`
- `lib/parse-fit.test.ts` (create)

**Out of scope** (do NOT touch):

- `lib/parse-shared.ts` — `finalise()` is correct; it expects metres/km as documented.
- Multisport session splitting (`sessions[0]` only) — a separate, larger change.
- `lib/parse-gpx.ts`, Strava mapping (`lib/strava-to-parsed.ts`).

## Git workflow

- Branch: `advisor/001-fit-elevation-in-metres`
- Conventional Commits, e.g. `fix(parse): read FIT altitude and ascent in metres`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Split the pure mapping out of `parseFit`

In `lib/parse-fit.ts`, move everything after `parser.parseAsync(buffer)`
(the zod `safeParse` and the mapping to `finalise({...})`) into a new
exported function `fitDataToParsed(data: unknown, filename: string): ParsedActivity`.
`parseFit` becomes: construct parser → `parseAsync` (keep the existing
try/catch and error message) → `return fitDataToParsed(data, filename)`.
No behaviour change yet.

**Verify**: `bun typecheck` → exit 0; `bun run test` → all pass.

### Step 2: Parse lengths in metres and convert distance explicitly

- Change `lengthUnit: "km"` to `lengthUnit: "m"`.
- In `fitDataToParsed`, set
  `sessionDistanceKm: session?.total_distance === undefined ? undefined : session.total_distance / 1000`.
- Leave `elevation: r.altitude` and `sessionElevationM: session?.total_ascent` as they are — they are now metres.
- Add a short comment above the parser options explaining that
  `lengthUnit` applies to altitude/ascent too, which is why we parse in metres.
- Optional, same step: add `enhanced_altitude: z.optional(z.number())` to
  `FitRecordSchema` and use `r.enhanced_altitude ?? r.altitude` for elevation
  (newer devices only write `enhanced_altitude`).

**Verify**: `bun typecheck` → exit 0; `grep -n 'lengthUnit' lib/parse-fit.ts` → shows `"m"`.

### Step 3: Add `lib/parse-fit.test.ts`

Model it on `lib/parse-gpx.test.ts`. Feed `fitDataToParsed` a hand-built
object shaped like fit-file-parser's `mode: "list"` output **in metres**:

```ts
const data = {
  activity: {
    sessions: [
      {
        sport: "cycling",
        start_time: "2026-05-18T07:00:00Z",
        total_distance: 42_195, // metres
        total_elapsed_time: 3600,
        total_ascent: 450, // metres
        avg_speed: 30, // km/h (speedUnit)
      },
    ],
  },
  records: [
    {
      position_lat: 47.0,
      position_long: 11.0,
      altitude: 500,
      timestamp: "2026-05-18T07:00:00Z",
    },
    {
      position_lat: 47.001,
      position_long: 11.0,
      altitude: 620,
      timestamp: "2026-05-18T07:30:00Z",
    },
    {
      position_lat: 47.002,
      position_long: 11.0,
      altitude: 950,
      timestamp: "2026-05-18T08:00:00Z",
    },
  ],
};
```

Cases:

1. `distanceKm` ≈ 42.2 (`toBeCloseTo(42.2, 1)`).
2. `elevationGainM` is `450`.
3. `elevationProfile` contains values ≥ 500 (not 0/1) — e.g. `Math.max(...profile)` is `950`.
4. Without `total_ascent`, `elevationGainM` is derived from records and is > 0.
5. Garbage input (`fitDataToParsed({}, "x.fit")`) does not throw a TypeError (it may return an activity with no points — assert whatever the current behaviour is after reading `finalise`).

**Verify**: `bun test lib/parse-fit.test.ts` → all pass, 5 tests.

## Test plan

Covered by Step 3. Full suite: `bun run test` → all pass including the new file.

## Done criteria

- [ ] `bun typecheck` exits 0
- [ ] `bun lint` exits 0
- [ ] `bun run test` exits 0; `lib/parse-fit.test.ts` exists with ≥ 4 passing tests
- [ ] `grep -n 'lengthUnit: "km"' lib/parse-fit.ts` returns no matches
- [ ] Only `lib/parse-fit.ts` and `lib/parse-fit.test.ts` modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `node_modules/fit-file-parser/dist/binary.js` no longer lists `altitude`/`total_ascent` under the `lengthUnits` conversion (library changed — the premise is gone).
- `ParsedActivity.distanceKm` for the test fixture comes out as ~42 195 or ~0.042 after Step 2 (unit assumption wrong).
- Any other module reads the FIT parser's raw output (search `grep -rn "parse-fit" lib app components theme`); if something besides `parse-activity.ts` imports it, stop.

## Maintenance notes

- If multisport FIT splitting is added later, it builds on `fitDataToParsed`; keep lengths in metres.
- Reviewer: check that `avg_speed`/`max_speed` still read as km/h (speedUnit untouched).
- Deferred: a real binary `.fit` fixture + an e2e FIT upload (no fixture exists in the repo yet).
