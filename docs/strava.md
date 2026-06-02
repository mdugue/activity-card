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
branch on source.

Visible differences when an activity comes from Strava (`data.source === 'strava'`):

- The edit-state **Swap** button reopens the picker instead of a file dialog.
- The connection-status row renders one or more **"View on Strava"** links
  (orange `#FC5200`, bold, underlined per §3 of the brand guidelines).
  Single Strava activity → one link. Combined triathlon → one link per
  Strava-sourced segment, labelled by sport (`SWIM · BIKE · RUN`).
  `stravaActivityIds` on `ActivityData` is segment-aligned, with `null`
  slots for file-sourced parts in mixed-source triathlons.

App-wide attribution sits in the footer (`components/app/strava-footer.tsx`)
as plain text "Compatible with Strava" — Strava's guidelines (§1.2, §4)
treat the API logos as optional and accept text references using one of
the approved phrases. No in-card mark; the downloaded PNG stays clean.

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
60s left; `stravaFetch()` additionally force-refreshes and retries once
if Strava rejects a token it believed was fresh (revoked grant / clock
skew), so the picker and detail handlers don't need refresh logic.

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
| `lib/strava-cookies.ts` | `readTokens`, `writeTokens`, `clearTokens`, `ensureFreshToken`, `forceRefreshToken`, OAuth state. Single source of truth for the cookie flow. |
| `lib/strava-client.ts` | `stravaFetch` / `stravaFetchOptional` — the only way handlers talk to Strava. Handles 401-retry, 429, and upstream errors; `stravaErrorResponse` maps thrown errors to HTTP responses. |
| `lib/strava-types.ts` | Strava model types. Base shapes derive from the generated spec; the `ActivityExtras` layer adds fields the spec omits. |
| `lib/strava-api.generated.ts` | Auto-generated from Strava's OpenAPI spec via `bun run strava:types`. Do not edit — regenerate. Lint/format/eslint skip it. |
| `lib/strava-to-parsed.ts` | Maps Strava streams + detail into the same `TrackPoint`/`ParsedActivity` shape the GPX/.fit parsers produce. Reuses `finalise()` and `detectSport()` from `lib/parse-shared.ts`. |
| `components/app/strava-picker.tsx` | Activity-list screen (`AppState === "picking-strava"`) — shadcn `Item`/`Pagination`/`Switch`/`Checkbox`. Owns single-pick, multi-select, pagination, and the per-error-kind `<StravaErrorAlert>` rendering. |
| `components/app/strava-connect-button.tsx` | Official 237×48 "Connect with Strava" SVG (per §1.1) wrapped in an anchor → `/api/strava/authorize`. The asset is at `public/strava/btn-connect-with-strava-orange.svg` and must not be modified. |
| `components/app/strava-footer.tsx` | App-wide footer with the plain-text "Compatible with Strava" reference. Mounted in `app/layout.tsx`. |
| `hooks/use-strava-connection.ts` | `useStravaConnection()` — wraps `/api/strava/me`. Exposes `{ connected, athlete, loading, error }` so the empty state can distinguish "you're not signed in" (`connected:false`) from "the server is broken" (`error:'fetch_failed'`). |
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

## Preview deploys: the production-bounce mechanism

Strava only accepts a single Authorization Callback Domain per app, so
Vercel preview deploys can't each register their own URL. We solve this
by sending Strava the stable production `redirect_uri` regardless of
which deploy initiated the flow, and stuffing the actual initiating
origin into a structured `state` payload:

```
state = base64url(JSON.stringify({
  r: random_nonce,         // CSRF — must match the strava_oauth_state cookie
  b?: initiator_origin,    // set only when current origin ≠ registered host
  p?: same_origin_path     // optional landing path after success
}))
```

The flow:

1. **Preview-XYZ.vercel.app** sets a `strava_oauth_state` cookie on its
   own origin, builds `state.b = "https://preview-XYZ.vercel.app"`, and
   redirects to Strava with `redirect_uri = production_url`.
2. **Strava** redirects to the production callback (which it has on
   file).
3. **Production callback** decodes `state`, sees `b !== own origin`,
   validates `b` is in the bounce allowlist (production host **or**
   `*.vercel.app`), and 302s to
   `${b}/api/strava/callback?code=...&state=...`. Production does NOT
   exchange the code or read the state cookie — it has neither.
4. **Preview's callback** reads its own `strava_oauth_state` cookie,
   matches it against `state.r`, exchanges the code, sets the four
   token cookies on the preview origin, and redirects to `state.p`
   (or `/?strava=connected`).

Open-redirect defence: the bounce allowlist is **explicit and
env-driven**. Set `STRAVA_BOUNCE_ALLOWED_HOST_SUFFIX` to your project's
Vercel namespace — only hosts ending with that suffix (or matching the
registered callback host) get the relay. Anything else short-circuits
to `/?strava=bounce_rejected`, surfacing a toast. With no suffix set,
*no* cross-origin bounce is permitted, which is the safe default for
single-deploy or non-Vercel setups.

Example:

```bash
# Vercel project URL pattern: effort-git-*-manuel-dugues-projects.vercel.app
STRAVA_BOUNCE_ALLOWED_HOST_SUFFIX=manuel-dugues-projects.vercel.app
```

Why this matters: anyone can deploy `evil.vercel.app` and craft a state
payload directly with Strava (`?state=base64({b:"https://evil.vercel.app",…})`).
Without `client_secret` they can't exchange the leaked code for tokens,
but the code is still confidential data — the suffix-based allowlist
keeps the relay scoped to *your* previews.

For local dev / E2E where preview-style origins run over `http://`
(localhost), set `STRAVA_ALLOW_HTTP_BOUNCE=1` to relax the protocol
check. Never set in production.

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

How we satisfy each clause of Strava's brand guidelines
(https://developers.strava.com/guidelines/):

1. **§1.1 Connect with Strava button.** We use the official 237×48
   orange SVG (`public/strava/btn-connect-with-strava-orange.svg`)
   unmodified, wrapped in `<StravaConnectButton>`. The anchor points
   at `/api/strava/authorize` which 302s to
   `https://www.strava.com/oauth/authorize` as required.
2. **§1.2 API Logos.** Optional. We don't use a logo; the footer
   carries the approved phrase as plain text instead.
3. **§2 Rules around logo use.** N/A — we don't use Strava logos
   anywhere except the official Connect button.
4. **§3 Linking to Strava data.** "View on Strava" anchors render in
   the edit-state connection row when `source === 'strava'`. Styled
   per the guideline (font-weight 700, underline, brand orange
   `#FC5200`), point at `https://www.strava.com/activities/{id}`, open
   in a new tab. Combined triathlons render one per Strava-sourced
   segment.
5. **§4 Use of the Strava name + interoperability.** Footer carries
   "Compatible with Strava" verbatim. "Effort" is the app name
   throughout; no derivation from "Strava".
6. **Working Disconnect.** Edit-state row exposes one; it POSTs to
   `/api/strava/disconnect` which clears all four cookies.

Strava revokes API access for violations — treat compliance as
load-bearing, not decorative. If you add a new surface that talks
about Strava, run it past §4 first.

## Adding a new endpoint

If you need to expose another Strava endpoint (e.g. `/athletes/{id}` for
profile data), the pattern is:

1. Create `app/api/strava/<name>/route.ts`.
2. Call `stravaFetch<T>(path)` from `lib/strava-client.ts` and wrap the
   handler body in `try { … } catch (err) { return stravaErrorResponse(err); }`.
   `stravaFetch` mints/refreshes the token, retries once on a `401`
   (force-refresh, then clear + `not_connected` if it still fails),
   raises `StravaRateLimitError` on `429`, and `StravaUpstreamError`
   otherwise — `stravaErrorResponse` maps all three to the right status
   (401 / 429 / 502). For optional data that may legitimately be missing,
   use `stravaFetchOptional<T>` (returns `null` instead of throwing).
3. Firing several calls in parallel? Mint once with `ensureFreshToken()`
   and pass `{ token }` to each `stravaFetch` so they don't each refresh
   (see `app/api/strava/activity/[id]/route.ts`).
4. Add the response shape to `lib/strava-types.ts` — derive it from the
   generated `components["schemas"][…]`, layering on any field the spec
   omits (see `ActivityExtras`). Run `bun run strava:types` to refresh
   the generated file if you touch a new schema.
5. Paths are relative to `STRAVA_API_BASE`, so the mock override still
   works in tests. Add a mock handler in `e2e/strava-mock.ts` for the
   same URL pattern if you want E2E coverage.

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

**"Your Strava sign-in expired" alert in the picker.**
The access token was rejected (and refresh also failed) — usually
because the user revoked the app's access from their Strava settings,
or because Strava's clock disagrees with yours. The Alert offers a
"Reconnect Strava" button that walks the OAuth flow again.

**"Strava is rate-limiting us" alert with a countdown.**
We hit Strava's 15-minute / 200-request quota. The Retry button is
disabled until the countdown finishes; the countdown comes from the
server-computed `retryAfter` (seconds-until-next-quarter-hour) which
the route handler returns via `stravaErrorResponse`.

**"Strava had a hiccup" alert with an HTTP status.**
Any non-2xx from Strava that isn't 401 or 429 surfaces as a generic
upstream error with the actual status code. Usually transient.

**"We can't reach the Effort server" alert in the empty state.**
The connection probe `/api/strava/me` itself failed — distinct from
"you haven't OAuthed yet". Means the app's API route is down or
unreachable, not a Strava issue.

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
