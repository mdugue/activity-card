import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

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
 *   s — HMAC over `b` + `r` (see `signBounce`). Proves the bounce target
 *       was chosen by one of this app's deployments, not by whoever
 *       crafted the `state`.
 */
export interface OAuthStatePayload {
  b?: string;
  p?: string;
  r: string;
  s?: string;
}

export function encodeOAuthState(payload: OAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function decodeOAuthState(raw: string): OAuthStatePayload | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as { r?: unknown }).r !== "string"
  ) {
    return null;
  }
  const p = parsed as { b?: unknown; p?: unknown; r: string; s?: unknown };
  return {
    r: p.r,
    b: typeof p.b === "string" ? p.b : undefined,
    p: typeof p.p === "string" ? p.p : undefined,
    s: typeof p.s === "string" ? p.s : undefined,
  };
}

/**
 * Sign a bounce target. HMAC-SHA256 keyed with a server secret every one of
 * this app's deployments shares (`STRAVA_CLIENT_SECRET` — each of them needs
 * it to exchange codes anyway), over the bounce origin AND the nonce, so a
 * signature can't be lifted onto another state.
 */
export function signBounce(b: string, r: string, secret: string): string {
  return createHmac("sha256", secret).update(`${b}\n${r}`).digest("base64url");
}

/** Constant-time check of a `signBounce` signature. */
export function verifyBounce(
  b: string,
  r: string,
  s: string | undefined,
  secret: string
): boolean {
  if (!s) {
    return false;
  }
  const expected = Buffer.from(signBounce(b, r, secret));
  const actual = Buffer.from(s);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Domains accepted as bounce targets when the production callback relays
 * a code back to a preview deployment.
 *
 * Threat model: anyone can deploy `evil.vercel.app` and craft a state
 * directly with Strava (`?state=base64({b:"https://evil.vercel.app",…})`),
 * tricking the production callback into relaying the user's OAuth code
 * to their domain. With their own nonce in `r` they could then replay the
 * code through our callback in their own browser and be logged in as the
 * victim.
 *
 * This allowlist is only a coarse filter: on a shared domain like
 * `vercel.app` hostnames are user-chosen, so anyone can register a host
 * ending in `-<suffix>`. The actual authorization is the signature
 * (`verifyBounce`), which only this app's deployments can produce. The
 * callback checks both.
 *
 * The allowlist is **explicit, env-driven** — operators set
 * `STRAVA_BOUNCE_ALLOWED_HOST_SUFFIX` to the project-specific Vercel
 * pattern (e.g. `manuel-dugues-projects.vercel.app`) and only hosts
 * matching that suffix are accepted. The registered callback host is
 * always accepted. With no suffix configured, *no* cross-origin bounce
 * is permitted (single-deploy mode).
 *
 * Allows http only when `STRAVA_ALLOW_HTTP_BOUNCE=1` (E2E / dev where
 * preview-style origins run over plain http on `localhost`).
 */
export function isAllowedBounceOrigin(
  origin: string,
  registeredCallbackHost: string
): boolean {
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
}

const DEL_CHARCODE = 0x7f;
const SPACE_CHARCODE = 0x20;

/** Accept only path-relative URLs anchored at `/`. Rejects absolute
 * (`https://evil.example`), protocol-relative (`//evil.example`), and
 * any value containing CR/LF/null/other control characters
 * (defence-in-depth against `Location:`-header injection on hosts that
 * fail to encode redirect targets). Used by both the authorize route
 * (before stuffing into state) and the callback route. */
export function safeRelativePath(value: string | null): string | null {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  // Reject any C0 control byte (0x00–0x1F) or DEL (0x7F). CR/LF in
  // particular would allow header smuggling if a downstream redirect
  // handler ever forwarded the raw value without re-encoding.
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < SPACE_CHARCODE || code === DEL_CHARCODE) {
      return null;
    }
  }
  return value;
}
