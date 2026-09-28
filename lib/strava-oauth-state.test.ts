/// <reference types="bun" />
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  decodeOAuthState,
  encodeOAuthState,
  isAllowedBounceOrigin,
  safeRelativePath,
  signBounce,
  verifyBounce,
} from "@/lib/strava-oauth-state";
import type { OAuthStatePayload } from "@/lib/strava-oauth-state";

describe("encode/decode OAuth state", () => {
  test("round-trips a full payload", () => {
    const payload: OAuthStatePayload = {
      b: "https://preview.example.app",
      p: "/?strava=connected",
      r: "nonce-123",
    };
    expect(decodeOAuthState(encodeOAuthState(payload))).toEqual(payload);
  });

  test("round-trips a minimal payload, omitting absent fields", () => {
    const encoded = encodeOAuthState({ r: "only-nonce" });
    // `toEqual` treats a missing key and an `undefined` one alike, so this
    // pins b/p as absent.
    expect(decodeOAuthState(encoded)).toEqual({ r: "only-nonce" });
  });

  test("produces URL-safe base64 (no +, /, or = padding)", () => {
    const encoded = encodeOAuthState({ r: "a".repeat(40) });
    expect(encoded).not.toMatch(/[+/=]/u);
  });

  test("returns null for malformed base64 / non-JSON", () => {
    expect(decodeOAuthState("!!!not base64!!!")).toBeNull();
    expect(decodeOAuthState("")).toBeNull();
  });

  test("returns null when the required nonce is missing", () => {
    const encoded = Buffer.from(JSON.stringify({ b: "x" })).toString(
      "base64url"
    );
    expect(decodeOAuthState(encoded)).toBeNull();
  });

  test("drops non-string b/p fields rather than trusting them", () => {
    const encoded = Buffer.from(
      JSON.stringify({ b: 42, p: { evil: true }, r: "n" })
    ).toString("base64url");
    // b/p must come back absent (`toEqual` ignores undefined keys).
    expect(decodeOAuthState(encoded)).toEqual({ r: "n" });
  });
});

describe("isAllowedBounceOrigin", () => {
  const REGISTERED = "effort.example.com";
  const originalSuffix = process.env.STRAVA_BOUNCE_ALLOWED_HOST_SUFFIX;
  const originalHttp = process.env.STRAVA_ALLOW_HTTP_BOUNCE;

  beforeEach(() => {
    delete process.env.STRAVA_BOUNCE_ALLOWED_HOST_SUFFIX;
    delete process.env.STRAVA_ALLOW_HTTP_BOUNCE;
  });

  afterEach(() => {
    process.env.STRAVA_BOUNCE_ALLOWED_HOST_SUFFIX = originalSuffix;
    process.env.STRAVA_ALLOW_HTTP_BOUNCE = originalHttp;
  });

  test("always accepts the registered callback host over https", () => {
    expect(isAllowedBounceOrigin(`https://${REGISTERED}`, REGISTERED)).toBe(
      true
    );
  });

  test("rejects everything else when no suffix is configured", () => {
    expect(
      isAllowedBounceOrigin("https://preview.vercel.app", REGISTERED)
    ).toBe(false);
  });

  test("accepts hosts matching a configured suffix", () => {
    process.env.STRAVA_BOUNCE_ALLOWED_HOST_SUFFIX = "myproject.vercel.app";
    // A dot-delimited subdomain of the suffix is accepted...
    expect(
      isAllowedBounceOrigin(
        "https://feature-x.myproject.vercel.app",
        REGISTERED
      )
    ).toBe(true);
    // ...as is a hyphen-delimited preview hostname
    expect(
      isAllowedBounceOrigin(
        "https://feature-x-myproject.vercel.app",
        REGISTERED
      )
    ).toBe(true);
    // ...as is an exact match on the suffix itself.
    expect(
      isAllowedBounceOrigin("https://myproject.vercel.app", REGISTERED)
    ).toBe(true);
  });

  test("a suffix entry does not match a lookalike host that merely contains it", () => {
    process.env.STRAVA_BOUNCE_ALLOWED_HOST_SUFFIX = "myproject.vercel.app";
    // endsWith(".myproject.vercel.app") guards against `evilmyproject...`.
    expect(
      isAllowedBounceOrigin(
        "https://evil-myproject.vercel.app.attacker.com",
        REGISTERED
      )
    ).toBe(false);
  });

  test("rejects http by default, accepts it only with the opt-in flag", () => {
    expect(isAllowedBounceOrigin(`http://${REGISTERED}`, REGISTERED)).toBe(
      false
    );
    process.env.STRAVA_ALLOW_HTTP_BOUNCE = "1";
    expect(isAllowedBounceOrigin("http://localhost", REGISTERED)).toBe(true);
    expect(isAllowedBounceOrigin("http://127.0.0.1", REGISTERED)).toBe(true);
  });

  test("returns false for an unparseable origin", () => {
    expect(isAllowedBounceOrigin("not a url", REGISTERED)).toBe(false);
  });
});

describe("safeRelativePath", () => {
  test("accepts a plain root-anchored path", () => {
    expect(safeRelativePath("/?strava=connected")).toBe("/?strava=connected");
    expect(safeRelativePath("/dashboard")).toBe("/dashboard");
  });

  test("rejects null, non-root, and protocol-relative values", () => {
    expect(safeRelativePath(null)).toBeNull();
    expect(safeRelativePath("https://evil.example")).toBeNull();
    expect(safeRelativePath("//evil.example")).toBeNull();
    expect(safeRelativePath("relative/path")).toBeNull();
  });

  test("rejects control characters to block header smuggling", () => {
    expect(safeRelativePath("/foo\r\nLocation: https://evil")).toBeNull();
    expect(safeRelativePath("/foo\u0000bar")).toBeNull();
    expect(safeRelativePath("/foo\u007Fbar")).toBeNull();
  });
});

describe("bounce signature", () => {
  const B = "https://effort-git-feature-team.vercel.app";
  const R = "nonce-abc";
  const KEY = "test-signing-key";

  test("verifies a signature minted for the same b, r and secret", () => {
    expect(verifyBounce(B, R, signBounce(B, R, KEY), KEY)).toBe(true);
  });

  test("rejects the signature when b is swapped for an attacker host", () => {
    const s = signBounce(B, R, KEY);
    expect(verifyBounce("https://evil-team.vercel.app", R, s, KEY)).toBe(false);
  });

  test("rejects the signature when replayed with another nonce", () => {
    const s = signBounce(B, R, KEY);
    expect(verifyBounce(B, "other-nonce", s, KEY)).toBe(false);
  });

  test("rejects a signature made with a different secret", () => {
    const s = signBounce(B, R, "some-other-key");
    expect(verifyBounce(B, R, s, KEY)).toBe(false);
  });

  test("rejects a missing or wrong-length signature", () => {
    expect(verifyBounce(B, R, undefined, KEY)).toBe(false);
    expect(verifyBounce(B, R, "", KEY)).toBe(false);
    expect(verifyBounce(B, R, "short", KEY)).toBe(false);
  });

  test("s survives the state round-trip; a non-string s is dropped", () => {
    const s = signBounce(B, R, KEY);
    // p stays absent (`toEqual` ignores undefined keys).
    expect(decodeOAuthState(encodeOAuthState({ b: B, r: R, s }))).toEqual({
      b: B,
      r: R,
      s,
    });
    const encoded = Buffer.from(
      JSON.stringify({ b: B, r: R, s: 123 })
    ).toString("base64url");
    expect(decodeOAuthState(encoded)?.s).toBeUndefined();
  });
});
