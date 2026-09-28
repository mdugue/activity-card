# Plan 003: Only this app's own deployments can receive a relayed Strava code

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat d67a92b..HEAD -- lib/strava-oauth-state.ts lib/strava-oauth-state.test.ts app/api/strava/authorize/route.ts app/api/strava/callback/route.ts docs/strava.md .env.example`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `d67a92b`, 2026-09-28

## Why this matters

Strava allows one callback domain, so preview deployments start OAuth with
the **production** `redirect_uri` and put their own origin into the
OAuth `state` as field `b`. Production's callback then 302s the user —
with the authorization `code` — to `b`, after checking `b` against a host
allowlist (`STRAVA_BOUNCE_ALLOWED_HOST_SUFFIX`).

That allowlist accepts any host that **ends with `-<suffix>`**. On
`*.vercel.app` hostnames are user-chosen: anyone can create a project or
team whose hostname ends in `-<your-team>.vercel.app`, craft a `state` with
`b` pointing at it, and have production hand them a victim's authorization
code. `docs/strava.md` calls that code confidential and describes the
allowlist as the defence — it does not hold. No hostname pattern on a
shared domain can fix this robustly; the fix is to make `b` **unforgeable**:
the initiating deployment signs it with a server secret that all of this
app's deployments share and an attacker does not have.

## Current state

- `app/api/strava/authorize/route.ts` — builds the state; sets `payload.b = currentOrigin` when the current origin differs from `STRAVA_REDIRECT_URI`'s origin, then `encodeOAuthState(payload)`.
- `lib/strava-oauth-state.ts` — `OAuthStatePayload { b?, p?, r }`, `encodeOAuthState`, `decodeOAuthState`, `isAllowedBounceOrigin`, `safeRelativePath`.
- `app/api/strava/callback/route.ts:45-58` — the relay:

```ts
if (payload.b && payload.b !== url.origin) {
  const registeredHost = new URL(redirectUri).hostname;
  if (!isAllowedBounceOrigin(payload.b, registeredHost)) {
    return NextResponse.redirect(new URL("/?strava=bounce_rejected", url));
  }
  const bounce = new URL("/api/strava/callback", payload.b);
  bounce.searchParams.set("code", code);
  bounce.searchParams.set("state", stateParam);
  return NextResponse.redirect(bounce);
}
```

- `lib/strava-oauth-state.ts:98-103` — the suffix match:

```ts
    if (
      host === suffix ||
      host.endsWith(`.${suffix}`) ||
      host.endsWith(`-${suffix}`)
    ) {
```

- `decodeOAuthState` (same file) whitelists fields: it returns only `r`, `b`, `p` and drops non-string values. A new field must be added there too.
- Every deployment that exchanges codes already has `STRAVA_CLIENT_SECRET` (server-only env; values are never to be written into code, tests or docs). Tests use the placeholder value from `playwright.config.ts`'s env block, or set `process.env` inside the test.
- Tests: `lib/strava-oauth-state.test.ts` — `describe("isAllowedBounceOrigin")` saves/restores env vars in `beforeEach`/`afterEach` (lines 60-73). Copy that pattern for any env you set.
- E2E: `e2e/strava.spec.ts:303-322` "callback rejects a crafted bounce origin" must keep passing.
- Server-only Node APIs are fine here (the file already imports `node:buffer`; the authorize route uses `node:crypto`).

## Commands you will need

| Purpose      | Command                                   | Expected on success                                      |
| ------------ | ----------------------------------------- | -------------------------------------------------------- |
| Typecheck    | `bun typecheck`                           | exit 0                                                   |
| Unit         | `bun test lib/strava-oauth-state.test.ts` | all pass                                                 |
| All unit     | `bun run test`                            | all pass                                                 |
| Lint         | `bun lint`                                | exit 0                                                   |
| E2E (Strava) | `bun run test:e2e e2e/strava.spec.ts`     | all pass (needs `bunx playwright install chromium` once) |

## Suggested executor toolkit

- Read `docs/strava.md` ("production bounce" section) before starting.
- Skill `next-best-practices` for Route Handler conventions, if available.

## Scope

**In scope**:

- `lib/strava-oauth-state.ts`
- `lib/strava-oauth-state.test.ts`
- `app/api/strava/authorize/route.ts`
- `app/api/strava/callback/route.ts` (the relay block only)
- `docs/strava.md` (bounce section), `.env.example` (comment only)

**Out of scope**:

- Token cookies, refresh logic, the photo proxy.
- Removing the suffix allowlist — keep it as a second factor.

## Git workflow

- Branch: `advisor/003-sign-oauth-bounce-target`
- Conventional Commits, e.g. `fix(strava): sign the OAuth bounce origin so only our deployments receive codes`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add a signature field and helpers

In `lib/strava-oauth-state.ts`:

- Add optional `s?: string` to `OAuthStatePayload` (doc comment: HMAC over the bounce target).
- `decodeOAuthState`: return `s` when it is a string (mirror how `b` is handled).
- Add `signBounce(b: string, r: string, secret: string): string` —
  HMAC-SHA256 (`createHmac` from `node:crypto`) over `` `${b}\n${r}` ``, base64url.
  Binding `r` (the nonce) prevents replaying one signature with another state.
- Add `verifyBounce(b: string, r: string, s: string | undefined, secret: string): boolean`
  using `timingSafeEqual` on equal-length buffers (return `false` on missing `s` or length mismatch).

**Verify**: `bun typecheck` → exit 0.

### Step 2: Sign in `authorize`, verify in `callback`

- `authorize/route.ts`: when setting `payload.b`, also set
  `payload.s = signBounce(payload.b, nonce, secret)` where `secret` is
  `process.env.STRAVA_CLIENT_SECRET`. If the secret is missing, keep the
  existing 500 "not configured" response path (extend its condition).
- `callback/route.ts`: inside the `payload.b && payload.b !== url.origin`
  branch, before `isAllowedBounceOrigin`, reject with the same
  `/?strava=bounce_rejected` redirect when
  `!verifyBounce(payload.b, payload.r, payload.s, secret)`. Keep the
  existing allowlist check after it.

**Verify**: `bun typecheck` → exit 0; `bun run test` → all pass.

### Step 3: Tighten the suffix match (defence in depth)

Remove the `host.endsWith(`-${suffix}`)` clause? **No** — real Vercel
previews look like `effort-git-branch-<team>.vercel.app` and need it.
Instead leave the match as is and update the doc comment above
`isAllowedBounceOrigin` to say the suffix is a coarse filter and the HMAC
(`verifyBounce`) is the actual authorization.

**Verify**: `bun test lib/strava-oauth-state.test.ts` → all pass (existing tests unchanged).

### Step 4: Tests

In `lib/strava-oauth-state.test.ts` add `describe("bounce signature")`:

1. `verifyBounce(b, r, signBounce(b, r, "k"), "k")` → `true`.
2. Different `b` (attacker host) with the same signature → `false`.
3. Different `r` → `false`.
4. Different secret → `false`.
5. Missing `s` → `false`.
6. Round-trip: `decodeOAuthState(encodeOAuthState({ r, b, s }))` keeps `s`; a non-string `s` is dropped.

**Verify**: `bun test lib/strava-oauth-state.test.ts` → all pass, 6 new tests.

### Step 5: Docs

- `docs/strava.md` bounce section: explain the signed `b` (field `s`,
  HMAC with the client secret, bound to the nonce), note that every
  deployment must share the same `STRAVA_CLIENT_SECRET` (they already must,
  to exchange codes), and correct the sentence "only hosts ending with that
  suffix" to mention the `-suffix` form. Do not paste any secret values.
- `.env.example`: extend the `STRAVA_BOUNCE_ALLOWED_HOST_SUFFIX` comment by
  one line: "Codes are only relayed when the bounce target is also signed
  (see docs/strava.md)."

**Verify**: `bun lint` → exit 0 (oxfmt checks markdown formatting too).

### Step 6: E2E

**Verify**: `bun run test:e2e e2e/strava.spec.ts` → all pass, including
"callback rejects a crafted bounce origin".

## Test plan

Step 4 (unit) + Step 6 (existing e2e). Pattern: `lib/strava-oauth-state.test.ts`.

## Done criteria

- [ ] `bun typecheck`, `bun lint`, `bun run test` exit 0
- [ ] `grep -n "verifyBounce" app/api/strava/callback/route.ts` → 1+ match
- [ ] `grep -n "signBounce" app/api/strava/authorize/route.ts` → 1+ match
- [ ] `bun run test:e2e e2e/strava.spec.ts` passes
- [ ] No secret value appears in any changed file (`git diff | grep -i secret` shows only env var _names_)
- [ ] `plans/README.md` row updated

## STOP conditions

- Preview and production deployments do **not** share `STRAVA_CLIENT_SECRET` in the operator's setup (ask the operator; if they use different secrets, a dedicated shared `STRAVA_STATE_SECRET` is needed — report back instead of inventing it).
- The e2e Strava flow depends on unsigned bounces in a way that can't be satisfied by signing in `authorize`.
- Any change appears to require touching token-cookie code.

## Maintenance notes

- Deploy order: ship to production first. In-flight OAuth attempts started before the deploy will be rejected once (user retries) — acceptable.
- Rotating `STRAVA_CLIENT_SECRET` invalidates in-flight states only (10-minute window).
- Reviewer: check `timingSafeEqual` is guarded for length and that `s` is verified **before** any redirect to `b`.
