/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import {
  parseStravaTokenResponse,
  readStravaTokenResponse,
} from "@/lib/strava-token-response";

const VALID = {
  access_token: "access-placeholder",
  athlete: {
    firstname: "Alex",
    id: 42,
    lastname: "Tester",
    profile_medium: "https://example.com/a.png",
  },
  expires_at: 1_900_000_000,
  expires_in: 21_600,
  refresh_token: "refresh-placeholder",
  token_type: "Bearer",
};

/** `VALID` with `key` genuinely absent (not present-but-undefined). */
const validWithout = (key: keyof typeof VALID) =>
  Object.fromEntries(Object.entries(VALID).filter(([k]) => k !== key));

describe("parseStravaTokenResponse", () => {
  test("accepts a full exchange payload and strips unknown fields", () => {
    expect(parseStravaTokenResponse(VALID)).toEqual({
      access_token: "access-placeholder",
      athlete: {
        firstname: "Alex",
        id: 42,
        profile_medium: "https://example.com/a.png",
      },
      expires_at: 1_900_000_000,
      refresh_token: "refresh-placeholder",
    });
  });

  test("accepts a refresh payload without an athlete", () => {
    expect(
      parseStravaTokenResponse(validWithout("athlete"))?.athlete
    ).toBeUndefined();
  });

  test("normalises null athlete fields to undefined", () => {
    const parsed = parseStravaTokenResponse({
      ...VALID,
      athlete: { firstname: null, id: 7, profile_medium: null },
    });
    // null fields come back absent/undefined (`toEqual` ignores undefined keys).
    expect(parsed?.athlete).toEqual({ id: 7 });
  });

  test("rejects missing or empty tokens", () => {
    expect(parseStravaTokenResponse(validWithout("access_token"))).toBeNull();
    expect(
      parseStravaTokenResponse({ ...VALID, refresh_token: "" })
    ).toBeNull();
    expect(
      parseStravaTokenResponse({ ...VALID, access_token: 123 })
    ).toBeNull();
  });

  test("rejects a missing, non-integer or non-positive expiry", () => {
    expect(parseStravaTokenResponse(validWithout("expires_at"))).toBeNull();
    expect(
      parseStravaTokenResponse({ ...VALID, expires_at: "1900000000" })
    ).toBeNull();
    expect(parseStravaTokenResponse({ ...VALID, expires_at: 1.5 })).toBeNull();
    expect(parseStravaTokenResponse({ ...VALID, expires_at: 0 })).toBeNull();
  });

  test("rejects a malformed athlete id and non-object bodies", () => {
    expect(
      parseStravaTokenResponse({ ...VALID, athlete: { id: "42" } })
    ).toBeNull();
    expect(parseStravaTokenResponse(null)).toBeNull();
    expect(parseStravaTokenResponse("token")).toBeNull();
    expect(parseStravaTokenResponse([])).toBeNull();
  });
});

describe("readStravaTokenResponse", () => {
  test("parses a JSON response body", async () => {
    const parsed = await readStravaTokenResponse(Response.json(VALID));
    expect(parsed?.access_token).toBe("access-placeholder");
  });

  test("returns null for a non-JSON body", async () => {
    const parsed = await readStravaTokenResponse(
      new Response("<html>oops</html>", { status: 200 })
    );
    expect(parsed).toBeNull();
  });
});
