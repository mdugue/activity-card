# Plan 004: The declared sport wins, and real-world GPX files parse

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat d67a92b..HEAD -- lib/parse-shared.ts lib/parse-shared.test.ts lib/parse-gpx.ts lib/parse-gpx.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (can run in parallel with 001/002; if 001 already landed, `parse-fit.ts` still calls `detectSport` the same way)
- **Category**: bug
- **Planned at**: commit `d67a92b`, 2026-09-28

## Why this matters

1. **Sport detection** ORs the declared type with substrings of the
   filename (for Strava: the activity _name_), checking ride first. A
   Strava `Run` named "Bike commute home" becomes a ride; a `Swim` named
   "Swim before brunch" becomes a run ("br**un**ch"); a GPX file called
   `strides.gpx` becomes a ride ("st**ride**s"). The wrong sport means
   km/h instead of pace, no pace profile, and the wrong triathlon leg.
2. **GPX schema** rejects valid files: fast-xml-parser turns
   `<type>9</type>` or `<name>2024</name>` into numbers, but the schema
   requires strings; a file with two `<trk>` elements yields an array but
   the schema expects one object. Such files fail with "does not look like a
   valid GPX file". Garmin files using the `ns3:` prefix instead of
   `gpxtpx:` silently lose heart rate and cadence.

## Current state

`lib/parse-shared.ts:177-206`:

```ts
export function detectSport(
  raw: string | undefined,
  filename: string
): ParsedSport {
  const s = (raw || "").toLowerCase();
  const f = filename.toLowerCase();
  if (
    s.includes("cycl") ||
    s.includes("bike") ||
    s.includes("ride") ||
    f.includes("ride") ||
    f.includes("bike")
  ) {
    return "ride";
  }
  if (s.includes("run") || f.includes("run")) {
    return "run";
  }
  if (s.includes("swim") || f.includes("swim")) {
    return "swim";
  }
  if (
    s.includes("triathlon") ||
    s.includes("multisport") ||
    f.includes("triathlon")
  ) {
    return "triathlon";
  }
  return "ride";
}
```

Callers: `lib/parse-gpx.ts:124` (`detectSport(trk?.type, filename)`),
`lib/parse-fit.ts:90` (`detectSport(session?.sport, filename)`),
`lib/strava-to-parsed.ts:26` (`detectSport(sportRaw, name)` where
`sportRaw = detail.sport_type || detail.type`, e.g. `"TrailRun"`, `"VirtualRide"`).

Existing tests `lib/parse-shared.test.ts:7-35` must keep passing — they
cover `"Ride"`, `"VirtualRide"`, `"cycling"`, `"mountain bike"`, `"Run"`,
`"TrailRun"`, `"Swim"`, `"Triathlon"`, `"Multisport"`, filename fallbacks
(`"morning-run.gpx"`, `"weekend_bike_ride.fit"`), and default-to-ride
(`"Yoga"`, `"session.gpx"`).

`lib/parse-gpx.ts:15-58` — schema (abridged):

```ts
const Numeric = z.union([z.string(), z.number()]);
const TrkPtSchema = z.object({
  "@_lat": Numeric, "@_lon": Numeric,
  ele: z.optional(Numeric), time: z.optional(z.string()),
  extensions: z.optional(z.object({
    "gpxtpx:TrackPointExtension": z.optional(z.object({
      "gpxtpx:hr": z.optional(Numeric), "gpxtpx:cad": z.optional(Numeric),
    })),
  })),
});
...
      metadata: z.optional(z.object({
          name: z.optional(z.string()),
          time: z.optional(z.string()),
      })),
      trk: z.optional(z.object({
          name: z.optional(z.string()),
          type: z.optional(z.string()),
          trkseg: z.optional(z.union([TrkSegSchema, z.array(TrkSegSchema)])),
      })),
```

`lib/parse-gpx.ts:95-120` flattens `trk.trkseg` → points and reads
`p.extensions?.["gpxtpx:TrackPointExtension"]`. Note: `zod/mini`'s
`z.object` strips unknown keys, so an `ns3:` extension disappears at
`safeParse` — the schema must allow it (e.g. `z.looseObject` or a
`z.record`) for the mapping to see it.

Test pattern: `lib/parse-gpx.test.ts` builds GPX strings with the local
helpers `gpx(body)` and `trkpt(lat, lon, ele, time)` and asserts on
`parseGpx(text, filename)`.

## Commands you will need

| Purpose   | Command                                                   | Expected on success |
| --------- | --------------------------------------------------------- | ------------------- |
| Typecheck | `bun typecheck`                                           | exit 0              |
| Tests     | `bun run test`                                            | all pass            |
| Focused   | `bun test lib/parse-shared.test.ts lib/parse-gpx.test.ts` | all pass            |
| Lint      | `bun lint`                                                | exit 0              |

## Scope

**In scope**: `lib/parse-shared.ts` (`detectSport` only), `lib/parse-shared.test.ts`,
`lib/parse-gpx.ts`, `lib/parse-gpx.test.ts`.

**Out of scope**: FIT parsing (plan 001), date handling (plan 002),
re-deriving stats when the user overrides the sport in the editor (a
separate design question — see "Maintenance notes"), `lib/strava-to-parsed.ts`.

## Git workflow

- Branch: `advisor/004-sport-detection-and-gpx`
- Conventional Commits, e.g. `fix(parse): prefer the declared sport over name hints; accept numeric and multi-track GPX`

## Steps

### Step 1: Failing tests first

Add to `lib/parse-shared.test.ts` → `describe("detectSport")`:

- `detectSport("Run", "Bike commute home")` → `"run"`
- `detectSport("Swim", "Swim before brunch")` → `"swim"`
- `detectSport(undefined, "tempo-strides-run.gpx")` → `"run"` (today: `"ride"`, because "st**ride**s" matches first)
- `detectSport(undefined, "brunch-ride.gpx")` → `"ride"`

**Verify**: `bun test lib/parse-shared.test.ts` → the first three new tests FAIL.

### Step 2: Rewrite `detectSport`

1. Classify the declared type alone (same keyword sets as today:
   ride = cycl|bike|ride, run = run, swim = swim, triathlon = triathlon|multisport).
   If it matches, return that — the filename is ignored.
2. Only if the declared type is empty or unrecognised, classify the
   filename/name by **whole words**: split on `/[^a-z]+/u` and look for the
   tokens `ride`, `bike`, `cycling`, `run`, `running`, `swim`, `swimming`,
   `triathlon`. First match in the order run → swim → ride → triathlon is
   fine; document the order in a comment.
3. Otherwise return `"ride"` (unchanged default).

Keep the signature and export unchanged.

**Verify**: `bun test lib/parse-shared.test.ts` → all pass (old and new).

### Step 3: GPX schema

In `lib/parse-gpx.ts`:

- `metadata.name`, `trk.name`, `trk.type`: accept `Numeric` and coerce with
  `String(...)` where they are used (`name:` and `detectSport(...)` calls).
- `trk`: accept `z.union([TrkSchema, z.array(TrkSchema)])`. When it is an
  array, concatenate the segments of all tracks (in order) and take
  `name`/`type` from the first track that has them.
- Extensions: accept any key ending in `:TrackPointExtension` and, inside
  it, keys ending in `:hr` / `:cad`. Use a loose schema for `extensions`
  and pick the keys in the mapping with a small helper.

**Verify**: `bun typecheck` → exit 0; `bun test lib/parse-gpx.test.ts` → existing tests pass.

### Step 4: GPX tests

Add to `lib/parse-gpx.test.ts`:

1. `<trk><name>2024</name><type>9</type>…` parses (does not throw) and the title contains `2024`.
2. Two `<trk>` elements, each with 2 points → 4 points' worth of route (assert `routeCoordinates.length > 0` and `distanceKm` > the single-track distance).
3. `ns3:TrackPointExtension` with `<ns3:hr>150</ns3:hr>` → `avgHeartRate` is `150`.

**Verify**: `bun test lib/parse-gpx.test.ts` → all pass, 3 new tests.

## Done criteria

- [ ] `bun typecheck`, `bun lint`, `bun run test` exit 0
- [ ] New tests from Steps 1 and 4 exist and pass
- [ ] Only in-scope files modified; `plans/README.md` row updated

## STOP conditions

- An existing `detectSport` test would need its expectation changed (behaviour contract conflict — report which one).
- `bun run test:e2e e2e/upload.spec.ts` (optional check) fails on sport-dependent assertions after the change.
- `zod/mini` in the installed version lacks a loose-object API and a `z.record` alternative doesn't typecheck.

## Maintenance notes

- Related, deliberately deferred: the editor's sport override only swaps
  `sport` and leaves pace/speed stats computed for the parsed sport. Fixing
  that means keeping raw points or re-running derivations — see the
  architecture review's "activity ingestion" candidate.
- Reviewer: check the word-split handles `_`, `-`, spaces and digits.
