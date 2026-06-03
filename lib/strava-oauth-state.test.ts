/// <reference types="bun" />
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  decodeOAuthState,
  encodeOAuthState,
  isAllowedBounceOrigin,
  type OAuthStatePayload,
  safeRelativePath,
} from "@/lib/strava-oauth-state";

describe("encode/decode OAuth state", () => {
  test("round-trips a full payload", () => {
    const payload: OAuthStatePayload = {
      r: "nonce-123",
      b: "https://preview.example.app",
      p: "/?strava=connected",
    };
    expect(decodeOAuthState(encodeOAuthState(payload))).toEqual(payload);
  });

  test("round-trips a minimal payload, omitting absent fields", () => {
    const encoded = encodeOAuthState({ r: "only-nonce" });
    expect(decodeOAuthState(encoded)).toEqual({
      r: "only-nonce",
      b: undefined,
      p: undefined,
    });
  });

  test("produces URL-safe base64 (no +, /, or = padding)", () => {
    const encoded = encodeOAuthState({ r: "a".repeat(40) });
    expect(encoded).not.toMatch(/[+/=]/);
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
      JSON.stringify({ r: "n", b: 42, p: { evil: true } })
    ).toString("base64url");
    expect(decodeOAuthState(encoded)).toEqual({
      r: "n",
      b: undefined,
      p: undefined,
    });
  });
});

describe("isAllowedBounceOrigin", () => {
  const REGISTERED = "effort.example.com";
  const originalSuffix = process.env.STRAVA_BOUNCE_ALLOWED_HOST_SUFFIX;
  const originalHttp = process.env.STRAVA_ALLOW_HTTP_BOUNCE;

  beforeEach(() => {
    process.env.STRAVA_BOUNCE_ALLOWED_HOST_SUFFIX = undefined;
    process.env.STRAVA_ALLOW_HTTP_BOUNCE = undefined;
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
    expect(safeRelativePath("/foo\x00bar")).toBeNull();
    expect(safeRelativePath("/foo\x7fbar")).toBeNull();
  });
});
