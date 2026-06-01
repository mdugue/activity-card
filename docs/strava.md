# Strava integration

How the Strava OAuth + activity-picker flow works, and how to develop
locally against the real Strava API or the bundled mock.

## What it does

**Connect Strava** is the primary CTA on the empty state. Clicking it
sends the user to Strava's consent screen, then back to the app's
picker — a paginated, shadcn-based list of recent activities. The user
either:

- **Single-picks** one activity (one click → one card), or
- Flips the **Multi-select** switch, checks 2+ activities, and clicks
  **Combine N activities** — the parts run through the same
  `assembleTriathlon()` path GPX/.fit uploads use, producing a
  multi-sport card.

In either case the chosen activity (or assembled triathlon) flows
through the same parsing pipeline as a GPX/.fit upload
(`lib/parse-shared.ts` → `ParsedActivity` → `app/page.tsx` `adoptParsed`
→ `ActivityData`), so themes, controls, and the PNG exporter do not
branch on source. The only visible difference: `data.source === 'strava'`
triggers a "Powered by Strava" mark on the card per Strava's brand
terms, and the edit-state **Swap** button reopens the picker (instead
of a file dialog) when the loaded activity came from Strava.

## Architecture in one diagram

```
┌─ browser ─────────────────────────────────────────────────────────────┐
│                                                                       │
│  EmptyState ───click Connect───▶  /api/strava/authorize  (302) ──▶ Strava
│                                                                       │
│  Strava consent  ──user approves──▶  /api/strava/callback?code=...    │
│                                       │                               │
│                                       ▼ POST code to /oauth/token     │
│                                  ┌─ Strava ─┐                         │
│                                  │ tokens + │                         │
│                                  │ athlete  │                         │
│                                  └────┬─────┘                         │
│                                       ▼                               │
│                              httpOnly cookies set                     │
│                              302 → /?strava=connected                 │
│                                       │                               │
│  toast.success + setState("picking-strava")                           │
│                                       │                               │
│  StravaPicker ─GET /api/strava/activities─▶ ensureFreshToken          │
│                                              │                        │
│                                              ▼ GET /athlete/activities│
│                                         ┌─ Strava ─┐                  │
│                                         │ 30 items │                  │
│                                         └────┬─────┘                  │
│                                              ▼                        │
│                                   trimmed JSON to browser             │
│                                                                       │
│  user clicks one ─GET /api/strava/activity/[id]─▶ ensureFreshToken    │
│                                              │                        │
│                                              ▼ parallel:              │
│                                       GET /activities/{id}            │
│                                       GET /activities/{id}/streams    │
│                                              │                        │
│                                              ▼                        │
│                                  stravaToParsed() → ParsedActivity    │
│                                                                       │
│  handleStravaActivityLoaded → adoptParsed(source: 'strava')           │
│  setState("edit") → existing flow takes over                          │
└───────────────────────────────────────────────────────────────────────┘
```

All Strava traffic is server→server; the browser never holds tokens.
`ensureFreshToken()` refreshes silently when the access token has under
60s left, so the picker and detail handlers don't need refresh logic.

## File map

| File | Responsibility |
| ---- | -------------- |
| `app/api/strava/authorize/route.ts` | Builds the Strava authorize URL + state cookie, 302 redirect. |
| `app/api/strava/callback/route.ts` | Validates `state`, exchanges `code` for tokens, sets cookies, redirects back. |
| `app/api/strava/me/route.ts` | Reads the athlete cookie. The only endpoint the client polls. |
| `app/api/strava/activities/route.ts` | Lists activities for the requested `?page=N&per_page=M` (defaults: 30, 1). |
| `app/api/strava/stats/route.ts` | Returns `{ totalCount, totalPages }` from Strava's `/athletes/{id}/stats`. Only counts ride / run / swim — the picker treats it as a hint and still trusts `canGoNext` (full page) for the actual end of the list. |
| `app/api/strava/activity/[id]/route.ts` | Detail + streams → `ParsedActivity[]`. |
| `app/api/strava/disconnect/route.ts` | Clears all four cookies. |
| `lib/strava-cookies.ts` | `readTokens`, `writeTokens`, `clearTokens`, `ensureFreshToken`, OAuth state. Single source of truth for the cookie flow. |
| `lib/strava-to-parsed.ts` | Maps Strava streams + detail into the same `TrackPoint`/`ParsedActivity` shape the GPX/.fit parsers produce. Reuses `finalise()` and `detectSport()` from `lib/parse-shared.ts`. |
| `components/app/strava-picker.tsx` | Activity-list screen (`AppState === "picking-strava"`) — shadcn `Item`/`Pagination`/`Switch`/`Checkbox`. Owns single-pick, multi-select, and pagination state. |
| `components/app/strava-attribution.tsx` | "Powered by Strava" SVG mark, rendered by themes when `data.source === 'strava'`. |
| `hooks/use-strava-connection.ts` | `useStravaConnection()` — wraps `/api/strava/me`. Only way the client UI knows whether it's connected. |
| `e2e/strava-mock.ts` | Bun.serve mock server used by Playwright tests. |
| `e2e/strava.spec.ts` | End-to-end coverage of the full flow. |

## Local dev against the real Strava API

1. **Register an app** at https://www.strava.com/settings/api.
   - **Category**: "Visualizer".
   - **Authorization Callback Domain**: `localhost` (bare host — Strava
     does not accept paths here; the path is in `STRAVA_REDIRECT_URI`).

2. **Copy `.env.example` → `.env.local`** and fill in:
   ```
   STRAVA_CLIENT_ID=...
   STRAVA_CLIENT_SECRET=...
   STRAVA_REDIRECT_URI=http://localhost:3000/api/strava/callback
   ```
   Leave `STRAVA_OAUTH_URL`, `STRAVA_TOKEN_URL`, `STRAVA_API_BASE`, and
   `STRAVA_INSECURE_COOKIES` unset — the code falls back to the real
   Strava endpoints and uses `Secure` cookies (which work over `http`
   for `localhost` in all major browsers).

3. **`bun dev`**, open http://localhost:3000.

4. Click **Connect Strava** → land on the real Strava consent screen →
   approve → bounce back to `/?strava=connected` → picker opens.

**Per-environment app**: Strava's `Authorization Callback Domain` is a
single host (e.g. `localhost`). For preview deploys (Vercel) you either
need a separate Strava app per environment, or you can route all preview
URLs through the production callback domain via a small redirect — pick
whichever you prefer; the SPEC doesn't bind this.

## Local dev against the mocked Strava service

For offline work, fast iteration on the UI, or when you don't want to
burn Strava's rate budget, run the mock from `e2e/strava-mock.ts`:

```bash
# Terminal 1 — start the mock
bun e2e/strava-mock.ts                # default port 3101

# Terminal 2 — run the app pointed at the mock
STRAVA_CLIENT_ID=dev \
STRAVA_CLIENT_SECRET=dev \
STRAVA_REDIRECT_URI=http://localhost:3000/api/strava/callback \
STRAVA_OAUTH_URL=http://localhost:3101/oauth/authorize \
STRAVA_TOKEN_URL=http://localhost:3101/oauth/token \
STRAVA_API_BASE=http://localhost:3101/api/v3 \
bun dev
```

(Or stash those four env lines in `.env.local`.)

The mock auto-approves OAuth (the `/oauth/authorize` endpoint
immediately 302s back to `redirect_uri` with `code=mock-auth-code`),
returns three fixed activities — Ride / Run / Swim — and synthesises
60-point streams for any activity id. There is no per-test state to
reset; the mock is pure.

**Where the mock lives**: `e2e/strava-mock.ts`. To add a new fixture
activity, append to `ACTIVITIES` there.

**Triggering the mock from Playwright**: it's already wired in
`playwright.config.ts` as the first entry in `webServer[]`. Tests don't
need any extra setup.

## Tokens and cookies

The browser never sees Strava tokens. All four cookies are `httpOnly`,
`SameSite=Lax`, `Path=/`, and `Secure` in production:

| Cookie | Contents | Lifetime |
| ------ | -------- | -------- |
| `strava_access` | Access token | Until expiry (refreshed silently) |
| `strava_refresh` | Refresh token | Strava's lifetime (long-lived) |
| `strava_expires_at` | UNIX seconds when access expires | Tracks the access token |
| `strava_athlete` | Trimmed athlete JSON (`id`, `firstname`, `avatar`) | Until disconnect |
| `strava_oauth_state` | Per-request CSRF token | 10 minutes |

`ensureFreshToken()` is the only path that talks to `/oauth/token`. Any
route handler that needs an access token calls it; if there's no token
(or refresh fails) it throws `StravaNotConnectedError`, the handler
returns 401, and the client treats that as "disconnected" and prompts
to reconnect.

## Strava brand requirements

These are non-negotiable per Strava's developer agreement:

1. **Display the "Powered by Strava" mark** on any surface that shows
   data fetched from their API. The card itself shows it via
   `<StravaAttribution>` when `data.source === 'strava'`; uploaded
   files (GPX/.fit) stay unmarked.
2. **Don't derive product names from "Strava"** or imply endorsement.
3. **Provide a working Disconnect**. The edit-state corner exposes one;
   it POSTs to `/api/strava/disconnect` which clears all four cookies.
4. **Replace the placeholder SVG** at `public/strava/powered-by-strava.svg`
   with the official asset from
   https://developers.strava.com/guidelines/ before going public. The
   current file is a working approximation marked with a TODO comment.

Strava revokes API access for violations — this is the most common
cause of integrations being shut down, so treat the attribution as
load-bearing, not decorative.

## Adding a new endpoint

If you need to expose another Strava endpoint (e.g. `/athletes/{id}` for
profile data), the pattern is:

1. Create `app/api/strava/<name>/route.ts`.
2. Call `ensureFreshToken()` from `lib/strava-cookies.ts` — it handles
   the "no token" and "needs refresh" cases.
3. `fetch` against `STRAVA_API_BASE` (imported from
   `lib/strava-cookies.ts`) so the mock override still works in tests.
4. On a `401` from Strava, treat tokens as invalid — call
   `clearTokens()` and return 401 to the client.
5. Add a mock handler in `e2e/strava-mock.ts` for the same URL pattern
   if you want E2E coverage.

## Troubleshooting

**"Connect Strava" returns 500.**
You haven't set `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` — the
authorize route refuses to start the flow without them. Check
`.env.local`.

**Strava sends you back to `/?strava=state_mismatch`.**
The `strava_oauth_state` cookie wasn't found on callback. Usually
caused by a browser blocking cookies or by the redirect crossing a
different origin than expected. Confirm `STRAVA_REDIRECT_URI` points
at the same origin the app is running on.

**"Couldn't reach Strava (401)" in the picker.**
The access token was rejected — usually because the user revoked the
app's access from their Strava settings, or because Strava's clock
disagrees with yours. The picker offers a "Reconnect Strava" button
that walks the OAuth flow again.

**Cookies don't stick in dev.**
You're running over `http` against an origin that browsers don't treat
as a secure context. `localhost` is fine. For LAN testing
(`http://192.168.x.x:3000`), either use `https` or temporarily set
`STRAVA_INSECURE_COOKIES=1`. Never set that in production.

**Card doesn't show "Powered by Strava".**
The data has `source !== 'strava'`. Check `app/page.tsx`
`handleStravaActivityLoaded` is being called (not `handleFilesLoaded`)
— samples and uploads omit the field by design.

**Mock returns 404 for a real endpoint.**
The mock only implements the four endpoints the app uses today. If
you've added a new Strava endpoint, add a matching handler in
`e2e/strava-mock.ts`.

## What's deferred

Out of scope for this PR (see `SPEC.md` Step 2):

- **Saved cards / accounts.** Would need a database. Once that lands,
  `source === 'strava'` plus the activity id is enough to support
  "update Strava activity description" via the `activity:write` scope
  and a permanent hosted URL.
- **Komoot.** No public OAuth; partner-only API. Realistic path is
  GPX import (already supported) plus a deeplink.
- **Multi-sport split.** Strava triathlon activities currently come
  back as a single `ParsedActivity`. Splitting needs the
  `/activities/{id}/laps` endpoint and per-sport summary munging.
