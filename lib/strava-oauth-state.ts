import { Buffer } from "node:buffer";

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
 */
export interface OAuthStatePayload {
  b?: string;
  p?: string;
  r: string;
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
  const p = parsed as { b?: unknown; p?: unknown; r: string };
  return {
    r: p.r,
    b: typeof p.b === "string" ? p.b : undefined,
    p: typeof p.p === "string" ? p.p : undefined,
  };
}

/**
 * Domains accepted as bounce targets when the production callback relays
 * a code back to a preview deployment. Without this allowlist a crafted
 * `state.b` could exfiltrate the code to an attacker's domain.
 *
 *   - same host as `registeredCallbackHost` (production bouncing to itself
 *     would be a no-op, but accept it for completeness)
 *   - any `*.vercel.app` subdomain (Vercel preview deploys)
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
  if (host === "vercel.app" || host.endsWith(".vercel.app")) {
    return true;
  }
  if (allowHttp && (host === "localhost" || host === "127.0.0.1")) {
    return true;
  }
  return false;
}

/** Accept only path-relative URLs anchored at `/`. Rejects absolute
 * (`https://evil.example`) and protocol-relative (`//evil.example`)
 * forms — used both in the authorize route (before stuffing into state)
 * and the callback route (defense-in-depth). */
export function safeRelativePath(value: string | null): string | null {
  if (!value?.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}
