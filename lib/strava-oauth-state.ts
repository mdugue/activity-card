import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod/mini";

import { lenient } from "./strava-schemas";
import { hasText } from "./text";

/**
 * Structured `state` payload for the Strava OAuth round-trip. The plain
 * random nonce that older code stuffed into `state` is now the `r` field
 * — the extras (`b`, `p`) let preview deployments survive Strava's
 * single-callback-URL constraint via a production bounce.
 *
 *   r — random nonce; must match the `strava_oauth_state` cookie set on
 *       the origin that initiated the flow (CSRF protection).
 *   b — bounce origin: present when the initiating deploy isn't the
 *       Strava-registered callback host. The production callback uses
 *       this to relay `code` + `state` back to the preview deploy that
 *       started the flow.
 *   p — optional same-origin path the user should land on post-success
 *       (e.g. `/?strava=connected`). Validated against the request
 *       origin in the callback; cross-origin values are dropped.
 *   s — signature over the bounce target: HMAC-SHA256 of `b` bound to the
 *       nonce `r`, keyed with the server-only `STRAVA_CLIENT_SECRET` (see
 *       `signBounce` / `verifyBounce`). Present whenever `b` is.
 */
export interface OAuthStatePayload {
  b?: string;
  p?: string;
  r: string;
  /** HMAC over the bounce target `b`, bound to the nonce `r`. */
  s?: string;
}

export const encodeOAuthState = (payload: OAuthStatePayload): string =>
  Buffer.from(JSON.stringify(payload)).toString("base64url");

/**
 * The decoded state: `r` must be a string or the whole state is rejected;
 * `b` / `p` / `s` are kept only when they are strings.
 */
const OAuthStateSchema = z.object({
  b: lenient(z.string()),
  p: lenient(z.string()),
  r: z.string(),
  s: lenient(z.string()),
});

export const decodeOAuthState = (raw: string): OAuthStatePayload | null => {
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
  const result = OAuthStateSchema.safeParse(json);
  if (!result.success) {
    return null;
  }
  const { b, p, r, s } = result.data;
  return {
    b: b ?? undefined,
    p: p ?? undefined,
    r,
    s: s ?? undefined,
  };
};

/**
 * Sign a bounce target. HMAC-SHA256 over `${b}\n${r}` (base64url), keyed
 * with a secret every deployment of this app shares and an attacker does
 * not have. Binding the nonce `r` stops one signature being replayed with
 * a different state.
 */
export const signBounce = (b: string, r: string, secret: string): string =>
  createHmac("sha256", secret).update(`${b}\n${r}`).digest("base64url");

/** Constant-time check that `s` is `signBounce(b, r, secret)`. A missing
 * or wrong-length signature is rejected before the comparison. */
export const verifyBounce = (
  b: string,
  r: string,
  s: string | undefined,
  secret: string
): boolean => {
  if (!hasText(s)) {
    return false;
  }
  const expected = Buffer.from(signBounce(b, r, secret));
  const actual = Buffer.from(s);
  if (actual.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(actual, expected);
};

/**
 * Domains accepted as bounce targets when the production callback relays
 * a code back to a preview deployment.
 *
 * Threat model: anyone can deploy `evil.vercel.app` and craft a state
 * directly with Strava (`?state=base64({b:"https://evil.vercel.app",…})`),
 * tricking the production callback into relaying the user's OAuth code
 * to their domain. Without `client_secret` they can't exchange the code,
 * but leaking it is still a confidentiality break.
 *
 * Defence: the actual authorization is the HMAC on the bounce target
 * (`verifyBounce`) — only a deployment holding the shared secret can mint
 * a `b` the callback will relay to. This allowlist is a coarse second
 * filter, not a security boundary on its own: on a shared domain like
 * `vercel.app` hostnames are user-chosen, so anyone can register a host
 * ending in `-<suffix>`. Operators set `STRAVA_BOUNCE_ALLOWED_HOST_SUFFIX`
 * to the project-specific Vercel pattern (e.g.
 * `manuel-dugues-projects.vercel.app`); a host matches when it equals an
 * entry or ends with `.entry` / `-entry` (the latter is how Vercel names
 * previews: `effort-git-branch-<team>.vercel.app`). The registered
 * callback host is always accepted. With no suffix configured, *no*
 * cross-origin bounce is permitted (single-deploy mode).
 *
 * Allows http only when `STRAVA_ALLOW_HTTP_BOUNCE=1` (E2E / dev where
 * preview-style origins run over plain http on `localhost`).
 */
export const isAllowedBounceOrigin = (
  origin: string,
  registeredCallbackHost: string
): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  const allowHttp = process.env.STRAVA_ALLOW_HTTP_BOUNCE === "1";
  if (
    parsed.protocol !== "https:" &&
    !(allowHttp && parsed.protocol === "http:")
  ) {
    return false;
  }
  const host = parsed.hostname;
  if (host === registeredCallbackHost) {
    return true;
  }
  // Operator-supplied allowlist: comma-separated host suffixes. A host
  // matches when it equals an entry exactly or ends with `.entry` or `-entry`.
  const suffixes = (process.env.STRAVA_BOUNCE_ALLOWED_HOST_SUFFIX ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const suffix of suffixes) {
    if (
      host === suffix ||
      host.endsWith(`.${suffix}`) ||
      host.endsWith(`-${suffix}`)
    ) {
      return true;
    }
  }
  if (allowHttp && (host === "localhost" || host === "127.0.0.1")) {
    return true;
  }
  return false;
};

const DEL_CHARCODE = 0x7f;
const SPACE_CHARCODE = 0x20;

/** Accept only path-relative URLs anchored at `/`. Rejects absolute
 * (`https://evil.example`), protocol-relative (`//evil.example`), and
 * any value containing CR/LF/null/other control characters
 * (defence-in-depth against `Location:`-header injection on hosts that
 * fail to encode redirect targets). Used by both the authorize route
 * (before stuffing into state) and the callback route. */
export const safeRelativePath = (value: string | null): string | null => {
  if (value === null || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  // Reject any C0 control byte (0x00–0x1F) or DEL (0x7F). CR/LF in
  // particular would allow header smuggling if a downstream redirect
  // handler ever forwarded the raw value without re-encoding.
  // Code points, not UTF-16 units: a surrogate pair is one code point
  // (>= 0x10000) and a lone surrogate stays itself, so neither can hit the
  // control range — the verdict is the same as a per-unit scan.
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < SPACE_CHARCODE || code === DEL_CHARCODE) {
      return null;
    }
  }
  return value;
};
