# Plan 005: Harden the Strava route handlers (validated pagination, same-origin disconnect, honest disconnect UI)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2315563..HEAD -- app/api/strava hooks/use-strava-connection.ts lib/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW (severity of the underlying issues is low-to-medium; the
  changes themselves are small and well-gated)
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `2315563`, 2026-06-12

## Why this matters

Three small gaps, none catastrophic, all cheap to close:

1. `/api/strava/activities` interpolates the raw `per_page` and `page` query
   strings into the upstream Strava URL. An attacker can't change the host,
   but arbitrary extra query params ride through to Strava, and garbage
   values produce opaque upstream errors instead of a clean 400. (The
   activity-detail route already validates: `NUMERIC_ID = /^\d+$/` — this
   plan brings the list route up to the same standard.)
2. `POST /api/strava/disconnect` clears the token cookies with no
   origin/CSRF check. The token cookies are `SameSite=Lax` so a cross-site
   form POST doesn't *carry* them — but the handler doesn't need them: it
   unconditionally returns cookie-deletion headers, and a top-level
   cross-site form POST will apply those deletions. Impact is only a
   forced "logout" (nuisance, no data exposure), and the fix is a two-line
   fetch-metadata check.
3. The client `disconnect()` ignores the response entirely — on a failed
   POST the UI shows "disconnected" while the cookies survive, and the next
   page load shows "connected" again.

## Current state

- `app/api/strava/activities/route.ts` (whole handler, 30 lines):

  ```ts
  export async function GET(request: Request) {
    const url = new URL(request.url);
    const perPage = url.searchParams.get("per_page") || "30";
    const page = url.searchParams.get("page") || "1";

    try {
      const list = await stravaFetch<StravaSummary[]>(
        `/athlete/activities?per_page=${perPage}&page=${page}`
      );
      ...
  ```

- `app/api/strava/disconnect/route.ts` (entire file):

  ```ts
  import { NextResponse } from "next/server";
  import { clearTokens } from "@/lib/strava-cookies";

  export async function POST() {
    await clearTokens();
    return new NextResponse(null, { status: 204 });
  }
  ```

- `hooks/use-strava-connection.ts:74-82`:

  ```ts
  const disconnect = useCallback(async () => {
    await fetch("/api/strava/disconnect", { method: "POST" });
    setState({
      connected: false,
      athlete: null,
      loading: false,
      error: null,
    });
  }, []);
  ```

  The hook also exposes `refresh()` (lines 40–72), which GETs
  `/api/strava/me` and rebuilds the state, with `error: "fetch_failed"` on
  network failure. The state's `error` field is a string-or-null.

- Conventions: route handlers return `NextResponse.json({ error: "snake_code" }, { status })`
  for errors — see `stravaErrorResponse()` in `lib/strava-client.ts:147-164`
  (`not_connected` 401, `rate_limited` 429, `strava_error` 502) and
  `invalid_id` 400 in `app/api/strava/activity/[id]/route.ts`. Match this.
- Unit tests are bun:test files in `lib/` only (`bun run test` runs
  `bun test ./lib`). Route handlers themselves have no unit harness; the
  Playwright suite (`e2e/strava.spec.ts` + `e2e/strava-mock.ts`) covers the
  OAuth flows end-to-end. So: pure logic goes in `lib/` where it's testable;
  handler wiring is verified by e2e + typecheck.
- New shared utilities belong in `lib/<name>.ts` (kebab-case, named exports,
  `interface` over `type`), per AGENTS.md.

## Commands you will need

| Purpose    | Command                                | Expected on success |
|------------|----------------------------------------|---------------------|
| Unit tests | `bun run test`                          | all pass            |
| Lint       | `bun lint`                              | exit 0              |
| Typecheck  | `bun typecheck`                         | exit 0              |
| E2E (strava only) | `bunx playwright test e2e/strava.spec.ts` | all pass (needs browsers installed; if the environment lacks them, run `bunx playwright install chromium` first) |

## Scope

**In scope**:
- `app/api/strava/activities/route.ts`
- `app/api/strava/disconnect/route.ts`
- `hooks/use-strava-connection.ts`
- Create: `lib/strava-params.ts`, `lib/strava-params.test.ts`
- `plans/README.md` (status row)

**Out of scope**:
- `app/api/strava/authorize/route.ts`, `callback/route.ts` — their state/
  redirect validation was audited and is sound; don't touch
- `app/api/strava/activity/[id]/route.ts`, `stats/route.ts`, `me/route.ts` —
  already validated or read-only
- `lib/strava-cookies.ts`, `lib/strava-client.ts` — no changes; the
  SameSite=Lax choice is deliberate (OAuth top-level redirect must carry the
  state cookie)
- Any UI component beyond the hook (how `error` is rendered is existing
  behavior)

## Git workflow

- Work on the current branch unless the operator says otherwise.
- Conventional Commits, e.g. `fix(strava): validate pagination, same-origin disconnect, honest disconnect state`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create `lib/strava-params.ts` + tests

```ts
/** Clamp a raw query value to a bounded positive integer. Non-numeric or
 * missing input falls back; out-of-range input clamps. Keeps user-supplied
 * strings out of upstream Strava URLs. */
export function clampedIntParam(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, n));
}
```

`lib/strava-params.test.ts` (model on `lib/parse-shared.test.ts` — bun:test,
`/// <reference types="bun" />` header): null → fallback; `"abc"` → fallback;
`"30"` → 30; `"0"` → min; `"1e3"` → characterize `parseInt` behavior (1);
`"999999"` → max; `"-5"` → min; `"12.9"` → 12.

**Verify**: `bun test ./lib/strava-params.test.ts` → all pass.

### Step 2: Use it in the activities route

In `app/api/strava/activities/route.ts`, replace the two raw reads and the
template-literal query with:

```ts
import { clampedIntParam } from "@/lib/strava-params";
...
const perPage = clampedIntParam(url.searchParams.get("per_page"), 30, 1, 100);
const page = clampedIntParam(url.searchParams.get("page"), 1, 1, 10_000);
const qs = new URLSearchParams({
  per_page: String(perPage),
  page: String(page),
});
const list = await stravaFetch<StravaSummary[]>(`/athlete/activities?${qs}`);
```

(100 is Strava's per_page maximum; clamping rather than 400-ing keeps the
picker resilient.)

**Verify**: `bun typecheck` → exit 0;
`grep -n 'per_page=\${' app/api/strava/activities/route.ts` → no matches.

### Step 3: Same-origin guard on disconnect

Replace `app/api/strava/disconnect/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { clearTokens } from "@/lib/strava-cookies";

/**
 * Clearing the Strava cookies is state-changing, so reject cross-site
 * callers: a top-level cross-site form POST would otherwise apply our
 * cookie-deletion headers (a forced disconnect — nuisance, not exposure).
 * Same-origin fetches send `Sec-Fetch-Site: same-origin` (all evergreen
 * browsers); the Origin fallback covers anything that omits it.
 */
export async function POST(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") {
    return NextResponse.json({ error: "cross_origin" }, { status: 403 });
  }
  const origin = request.headers.get("origin");
  if (!site && origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "cross_origin" }, { status: 403 });
  }
  await clearTokens();
  return new NextResponse(null, { status: 204 });
}
```

Note `site !== "same-origin"` intentionally also rejects `same-site` (a
sibling subdomain) — nothing legitimate calls this cross-subdomain. `none`
(direct navigation) can't produce a POST from a browser; curl/tests send no
fetch-metadata headers at all and pass through the Origin fallback.

**Verify**: `bun typecheck` → exit 0. Then run the strava e2e suite (it
exercises connect/disconnect against the mock):
`bunx playwright test e2e/strava.spec.ts` → all pass. If e2e cannot run in
this environment, note it and rely on the review; do not skip silently.

### Step 4: Honest disconnect in the hook

In `hooks/use-strava-connection.ts`, replace the `disconnect` callback:

```ts
const disconnect = useCallback(async () => {
  try {
    const res = await fetch("/api/strava/disconnect", { method: "POST" });
    if (!res.ok) {
      // Cookies may still be set — re-sync from the server instead of
      // pretending we disconnected.
      await refresh();
      return;
    }
    setState({
      connected: false,
      athlete: null,
      loading: false,
      error: null,
    });
  } catch {
    await refresh();
  }
}, [refresh]);
```

(`refresh` is defined above it in the same hook and is already a stable
`useCallback`; adding it to the dependency array is correct.)

**Verify**: `bun typecheck && bun lint` → exit 0.

### Step 5: Full gate

```bash
bun lint && bun typecheck && bun run test
```

**Verify**: exit 0, including the new `strava-params` tests. If Playwright
browsers are available: `bun run test:e2e` → all pass.

## Test plan

- New unit tests: `lib/strava-params.test.ts` (8 cases, Step 1).
- Existing e2e: `e2e/strava.spec.ts` against `e2e/strava-mock.ts` must stay
  green — it covers the connect → pick → disconnect journey and will catch a
  fetch-metadata guard that's too strict (Playwright's same-origin fetches
  send `Sec-Fetch-Site: same-origin`).
- Manual check worth doing if a browser is handy: from the running dev app,
  the Strava footer's disconnect still works (204, UI flips to
  disconnected).

## Done criteria

- [ ] `grep -n 'per_page=\${' app/api/strava/activities/route.ts` → no output
- [ ] `lib/strava-params.ts` + `lib/strava-params.test.ts` exist; `bun run test` passes
- [ ] disconnect route contains the `sec-fetch-site` guard and returns 403 with `{ error: "cross_origin" }` on cross-site callers
- [ ] `hooks/use-strava-connection.ts` disconnect handles `!res.ok` and network throw via `refresh()`
- [ ] `bun lint && bun typecheck && bun run test` exit 0
- [ ] `bunx playwright test e2e/strava.spec.ts` passes (or environment limitation reported)
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:

- `e2e/strava.spec.ts` fails after Step 3 because the mock's requests are
  rejected by the origin guard — the guard's interplay with the test
  harness's request origins needs a human decision (loosen vs. test-only
  header), not improvisation.
- The hook's `error` field turns out to be consumed somewhere that breaks
  with the new flow (grep `use-strava-connection` consumers first:
  `components/app/strava-connect-button.tsx`, `strava-footer.tsx`).
- You find the disconnect POST is also called from a non-fetch context
  (e.g. a form action) — the guard assumptions change.

## Maintenance notes

- If a future endpoint becomes state-changing (anything beyond GET +
  disconnect), give it the same fetch-metadata guard — consider extracting
  `assertSameOrigin(request)` into `lib/` at that point (deliberately not
  abstracted while there's exactly one consumer).
- Reviewer should scrutinize: the guard's behavior behind Vercel's proxy
  (Origin vs request URL origin must match in production — `request.url`
  reflects the forwarded host on Vercel; if the deployment sits behind an
  additional proxy that rewrites Host, the Origin fallback could
  false-positive. The `sec-fetch-site` primary check is proxy-immune).
- The clamp ceiling (per_page ≤ 100) mirrors Strava's documented API limit;
  if Strava changes it, update `clampedIntParam` call sites, not the helper.
