# Plan 004: Unit-test baseline for parsers, visibility, and export helpers (+ fail loudly on dropped carousel frames)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2315563..HEAD -- lib/`
> If any in-scope lib file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `2315563`, 2026-06-12

## Why this matters

The product's core is "parse a hostile real-world file into clean numbers,
strip what the user toggled off, export pixels". Today the unit suite covers
formatters, colours, geometry, and OAuth state — but NOT the GPX parser, the
Strava-stream mapper, triathlon assembly, the visibility stripper, or the
export filename/slug helpers. These are pure functions (cheap to test) on the
critical path (expensive to break). One adjacent real bug rides along: the
carousel exporter silently drops frames whose `canvas.toBlob` returns `null`,
so a user can receive 4 of 5 slides with a numbering gap and no error.

This plan creates a characterization baseline: encode today's actual behavior
so future refactors (e.g. of `app/page.tsx` or the parsers) have a safety
net, and make the one silent failure loud.

## Current state

All unit tests use **bun:test**, live colocated as `lib/<name>.test.ts`, and
run via `bun run test` (which is `bun test ./lib` — only `lib/` is scanned;
see `bunfig.toml`'s note). The structural exemplar to copy is
`lib/parse-shared.test.ts`:

```ts
/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { detectSport, finalise, type TrackPoint } from "@/lib/parse-shared";

describe("detectSport", () => {
  test("maps cycling keywords from the raw type", () => {
    expect(detectSport("Ride", "x.gpx")).toBe("ride");
    ...
```

Targets (verified at commit `2315563`):

1. **`lib/parse-gpx.ts`** — `export function parseGpx(text: string, filename: string): ParsedActivity`
   (line 79). Throws `` `${filename} could not be read as XML.` `` on parser
   failure (line 89) and `` `${filename} does not look like a valid GPX
   file.` `` on schema mismatch (line 94). Uses `fast-xml-parser`'s
   `XMLParser` with `{ ignoreAttributes: false, attributeNamePrefix: "@_" }`.
   No test file exists.

2. **`lib/strava-to-parsed.ts`** — `export function stravaToParsed(detail:
   StravaActivityDetail, streams: StravaStreams): ParsedActivity[]` (line
   22). Defensive logic worth pinning: takes the smallest non-zero stream
   length (lines 48–55) so a short stream truncates the others; converts the
   Strava `time` stream (seconds offset) to absolute epoch ms only when
   `detail.start_date` exists (lines 40–42, 68–71). No test file exists.
   `StravaActivityDetail` / `StravaStreams` come from `lib/strava-types.ts`
   (plain re-exported API object shapes — construct minimal literals with
   `satisfies`/partial casts as the existing strava types allow; if the types
   demand many required fields, build a small helper `makeDetail(overrides)`
   in the test).

3. **`lib/assemble-triathlon.ts`** — `export function
   assembleTriathlon(parts: ParsedActivity[]): ActivityData` (line 9, 118
   lines total). Sorts parts by `startTimeMs`, maps sports to segments,
   derives T1/T2 transitions from gaps between `endTimeMs`→next
   `startTimeMs`. No test file exists. `ParsedActivity` shape (from
   `lib/parse-shared.ts:14-43`): `{ athleteName: string; date: string;
   distanceKm: number; durationSec: number; location: string; sport:
   "ride"|"run"|"swim"|"triathlon"; title: string; startTimeMs?;
   endTimeMs?; elevationGainM?; routeCoordinates?; ... }`.

4. **`lib/visibility.ts`** — `applyVisibility(data, vis)` (line 107) strips
   toggled-off fields by blanking strings / `undefined`-ing numerics (exact
   mapping at lines 111–131 — e.g. `title: vis.title ? data.title : ""`,
   `avgHeartRate: vis.heartRate ? data.avgHeartRate : undefined`); it never
   strips distance/duration. `themeAvailability(data, theme)` (line 142)
   ANDs three gates: activity has the data, theme declares the capability in
   `uses`, optional `usesWhen[key](data)` refinement. `DEFAULT_VISIBILITY`
   exported at line 43. No test file exists.

5. **`lib/export-shared.ts`** — 30 lines: `isIos()` (reads
   `navigator.userAgent` — environment-coupled, leave untested),
   `waitForFonts()` (DOM-coupled, leave untested), and `effortDateSlug(date:
   string): string` (line 27: `date.replace(/[^0-9-]/g, "") || "undated"`).
   Only `effortDateSlug` gets tests. No test file exists.

6. **The silent-frame bug** — `lib/export-carousel.ts:114-124`:

   ```ts
   const maybeFiles = await Promise.all(
     encodings.map(async ({ index, blob }) => {
       const resolved = await blob;
       return resolved
         ? new File([resolved], `${baseName}_${pad2(index + 1)}.png`, {
             type: "image/png",
           })
         : null;
     })
   );
   await deliver(maybeFiles.filter((f): f is File => f !== null));
   ```

   A `null` blob (canvas OOM / encode failure) is filtered out silently —
   the user gets fewer frames than slides, with a gap in the numbering.
   Note also lines 97–104: a slice whose `getContext("2d")` returns null is
   `continue`-skipped, same silent-drop problem.

Repo conventions that apply: TypeScript strict, no `any` without a
`// reason:` comment, no `console.log` in committed code, kebab-case files,
`@/...` imports (test files use `@/lib/...` like the exemplar).

## Commands you will need

| Purpose    | Command                          | Expected on success |
|------------|----------------------------------|---------------------|
| Unit tests | `bun run test`                   | all pass            |
| One file   | `bun test ./lib/parse-gpx.test.ts` | that file passes  |
| Lint       | `bun lint`                       | exit 0              |
| Typecheck  | `bun typecheck`                  | exit 0              |

## Scope

**In scope**:
- Create: `lib/parse-gpx.test.ts`, `lib/strava-to-parsed.test.ts`,
  `lib/assemble-triathlon.test.ts`, `lib/visibility.test.ts`,
  `lib/export-shared.test.ts`
- Modify: `lib/export-carousel.ts` (the null-frame guard only)
- `plans/README.md` (status row)

**Out of scope**:
- `lib/parse-fit.ts` — testing it needs a real binary FIT fixture;
  deliberately deferred (e2e upload specs cover the happy path)
- `lib/export-card.ts`, `lib/export-carousel.ts` beyond the guard — the
  rasterisation paths need a DOM; they stay e2e-covered
- Changing ANY production behavior of the parsers/visibility — these are
  characterization tests; if you find a behavior that looks wrong, pin it
  with a test + a `// NOTE:` and report it, don't fix it here
- The XMLParser options in `parse-gpx.ts` (entity-hardening was considered
  and rejected — fast-xml-parser v5 doesn't resolve external entities, and
  parsing happens client-side on the user's own file)

## Git workflow

- Work on the current branch unless the operator says otherwise.
- Conventional Commits, e.g. `test(lib): characterize parsers, visibility, export slug`
  and `fix(export): fail loudly when a carousel frame fails to encode`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: `lib/parse-gpx.test.ts`

Build GPX strings inline (template literals). A minimal valid GPX for the
happy path (adapt to whatever `GpxSchema` in `parse-gpx.ts` actually
requires — read the schema first):

```xml
<?xml version="1.0"?>
<gpx><trk><name>Morning Ride</name><trkseg>
  <trkpt lat="47.0" lon="11.0"><ele>500</ele><time>2026-05-18T07:00:00Z</time></trkpt>
  <trkpt lat="47.001" lon="11.0"><ele>505</ele><time>2026-05-18T07:01:00Z</time></trkpt>
  <trkpt lat="47.002" lon="11.0"><ele>510</ele><time>2026-05-18T07:02:00Z</time></trkpt>
</trkseg></trk></gpx>
```

Cases (one `test` each):
1. happy path: returns `sport`/`title`/`distanceKm > 0`/`durationSec ===
   120`/route coordinates present;
2. not XML at all (`"garbage{{{"`): throws `/could not be read as XML/`;
3. valid XML, not GPX (`"<foo/>"`): throws `/does not look like a valid GPX/`;
4. a `trkpt` with a non-numeric `lat` ("abc"): characterize — assert the
   parse either skips the point or yields finite numbers (no `NaN` in
   `routeCoordinates`; assert with `Number.isFinite`);
5. single-point track: characterize distance/duration (expect 0s, no throw);
6. GPX with `<trkseg>` but zero `trkpt`: characterize (no throw, or a
   specific throw — whichever the code does today).

**Verify**: `bun test ./lib/parse-gpx.test.ts` → all pass.

### Step 2: `lib/strava-to-parsed.test.ts`

Build a `makeDetail()` helper returning a minimal `StravaActivityDetail`
(name, sport_type `"Ride"`, start_date `"2026-05-18T07:00:00Z"`, distance,
moving_time…) and stream literals. Cases:
1. happy path: latlng+altitude+time of equal length → one ParsedActivity,
   `routeCoordinates` length matches (post-simplification it equals input
   length for small inputs), times become absolute epoch ms;
2. mismatched lengths (latlng 5 points, heartrate 3) → output truncated to 3
   (pin the min-length behavior);
3. missing `start_date` → no throw; time-derived fields undefined;
4. empty streams object `{}` → length-1 array, summary-only activity (no
   route), `distanceKm` from the detail;
5. triathlon `sport_type: "Triathlon"` → still a length-1 array with sport
   `"triathlon"` (the documented current behavior — see the function's
   doc-comment about deferring `/laps` splitting).

**Verify**: `bun test ./lib/strava-to-parsed.test.ts` → all pass.

### Step 3: `lib/assemble-triathlon.test.ts`

Build three minimal `ParsedActivity` parts (swim/ride/run) with
`startTimeMs`/`endTimeMs` leaving deliberate gaps (e.g. 150s between swim end
and ride start). Cases:
1. ordered input → segments in swim→ride→run order, T1/T2 transition
   durations equal the gaps;
2. shuffled input (run first) → sorted by `startTimeMs` into the same result;
3. missing `startTimeMs` on every part → no throw; characterize ordering
   (input order) and transitions (absent);
4. zero/negative gap (overlapping times) → characterize: no negative
   transition durations in the output;
5. totals: `distanceKm`/`durationSec` are the sums of the parts.

**Verify**: `bun test ./lib/assemble-triathlon.test.ts` → all pass.

### Step 4: `lib/visibility.test.ts`

Use a full-ish `ActivityData` literal (copy field names from
`lib/activity.ts`). Cases:
1. all switches on → object deep-equals input;
2. each strippable switch off → exactly its fields blank (`title` → `""`,
   `avgHeartRate` → `undefined`, `speed` kills all three of
   avg/max/profile, `pace` kills all three pace fields, `route` kills
   `routeCoordinates`, `elevation` vs `elevationViz` are independent);
3. distance/duration survive any combination (never stripped);
4. `themeAvailability`: a theme with `uses: []` → every governed key false;
   a theme declaring `heartRate` but data without `avgHeartRate` → false;
   a theme declaring a key with `usesWhen` refinement returning false →
   false; declared + data present + no refinement → true.

**Verify**: `bun test ./lib/visibility.test.ts` → all pass.

### Step 5: `lib/export-shared.test.ts`

`effortDateSlug` only: `"2026-05-18"` → `"2026-05-18"`;
`"2026-05-18T07:00:00Z"` → digits-and-dashes only (pin the exact output the
regex produces); `""` → `"undated"`; `"no digits"` → `"undated"`.

**Verify**: `bun test ./lib/export-shared.test.ts` → all pass.

### Step 6: Make dropped carousel frames an error

First find the caller(s): `grep -rn "exportCarousel" components/ app/ lib/`.
Confirm the call site already handles a rejected promise (try/catch with a
user-visible error state or toast — the repo rule is "proper error UI", not
console.log). If NO caller handles rejection, STOP and report.

Then in `lib/export-carousel.ts` replace the silent filter (lines 114–124
excerpted above) so a missing frame throws instead of shrinking the set:

```ts
const files = await Promise.all(
  encodings.map(async ({ index, blob }) => {
    const resolved = await blob;
    if (!resolved) {
      throw new Error(`Carousel frame ${index + 1} failed to encode`);
    }
    return new File([resolved], `${baseName}_${pad2(index + 1)}.png`, {
      type: "image/png",
    });
  })
);
await deliver(files);
```

Also cover the earlier silent skip: in the slicing loop (lines 97–104), a
null `getContext("2d")` currently does `continue` — change it to
`throw new Error(\`Carousel frame ${i + 1} could not be drawn\`)`.
Keep `deliver`'s empty-array guard as-is.

**Verify**: `bun typecheck` → exit 0, and
`grep -n "f is File" lib/export-carousel.ts` → no matches.

### Step 7: Full gate

```bash
bun lint && bun typecheck && bun run test
```

**Verify**: exit 0; the test summary shows the five new files running
(expect roughly 25+ new tests).

## Test plan

This plan IS the test plan; the new files and cases are enumerated per step.
Pattern source: `lib/parse-shared.test.ts` (header comment, `describe`/`test`
structure, `@/lib/...` imports, small inline fixture builders).

## Done criteria

- [ ] Five new test files exist: `ls lib/*.test.ts` includes `parse-gpx`,
      `strava-to-parsed`, `assemble-triathlon`, `visibility`, `export-shared`
- [ ] `bun run test` exits 0, total test count strictly greater than before
      this plan (record before/after counts in your report)
- [ ] `grep -n "f is File" lib/export-carousel.ts` → no output (silent filter gone)
- [ ] `bun lint && bun typecheck` exit 0
- [ ] No production file modified except `lib/export-carousel.ts` (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- `GpxSchema` (in `parse-gpx.ts`) rejects the minimal GPX in Step 1 even
  after adding obviously-required attributes — report what the schema
  demands rather than mutating the schema.
- Constructing a `StravaActivityDetail` literal requires casting through
  `any` — the repo forbids bare `any`; report the type friction instead of
  fighting `lib/strava-api.generated.ts`.
- Step 6's caller check finds no rejection handling at the call site.
- Any characterization test reveals a behavior so clearly wrong it must be a
  bug (e.g. NaN reaching `routeCoordinates`): pin the current behavior,
  flag it prominently in your report, do NOT fix it in this plan.

## Maintenance notes

- These are characterization tests: when someone *intentionally* changes
  parser behavior (e.g. implementing Strava `/laps` triathlon splitting —
  see the doc-comment in `strava-to-parsed.ts`), updating these tests is
  part of that change, not a regression.
- Reviewer should scrutinize Step 6: it converts a silent partial export
  into a thrown error — confirm the UI presents that error sanely on mobile
  (the share path) as well as desktop (sequential downloads).
- Deferred: `.fit` parser tests (need a binary fixture — consider committing
  a tiny real file under `e2e/` later and reusing it), `isIos`/`waitForFonts`
  (environment-coupled), and route-handler tests (see plan 005).
