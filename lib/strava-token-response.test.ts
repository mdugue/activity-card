/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import {
  parseStravaTokenResponse,
  readStravaTokenResponse,
} from "@/lib/strava-token-response";

const VALID = {
  token_type: "Bearer",
  access_token: "access-placeholder",
  refresh_token: "refresh-placeholder",
  expires_at: 1_900_000_000,
  expires_in: 21_600,
  athlete: {
    id: 42,
    firstname: "Alex",
    lastname: "Tester",
    profile_medium: "https://example.com/a.png",
  },
};

describe("parseStravaTokenResponse", () => {
  test("accepts a full exchange payload and strips unknown fields", () => {
    expect(parseStravaTokenResponse(VALID)).toEqual({
      access_token: "access-placeholder",
      refresh_token: "refresh-placeholder",
      expires_at: 1_900_000_000,
      athlete: {
        id: 42,
        firstname: "Alex",
        profile_medium: "https://example.com/a.png",
      },
    });
  });

  test("accepts a refresh payload without an athlete", () => {
    const { athlete: _athlete, ...rest } = VALID;
    expect(parseStravaTokenResponse(rest)?.athlete).toBeUndefined();
  });

  test("normalises null athlete fields to undefined", () => {
    const parsed = parseStravaTokenResponse({
      ...VALID,
      athlete: { id: 7, firstname: null, profile_medium: null },
    });
    expect(parsed?.athlete).toEqual({
      id: 7,
      firstname: undefined,
      profile_medium: undefined,
    });
  });

  test("rejects missing or empty tokens", () => {
    expect(
      parseStravaTokenResponse({ ...VALID, access_token: undefined })
    ).toBeNull();
    expect(
      parseStravaTokenResponse({ ...VALID, refresh_token: "" })
    ).toBeNull();
    expect(
      parseStravaTokenResponse({ ...VALID, access_token: 123 })
    ).toBeNull();
  });

  test("rejects a missing, non-integer or non-positive expiry", () => {
    expect(
      parseStravaTokenResponse({ ...VALID, expires_at: undefined })
    ).toBeNull();
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
