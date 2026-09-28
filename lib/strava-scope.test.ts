import { describe, expect, test } from "bun:test";

import { grantsActivityRead, STRAVA_SCOPE } from "./strava-scope";

describe("grantsActivityRead", () => {
  test("accepts the scope Effort requests", () => {
    expect(grantsActivityRead(STRAVA_SCOPE)).toBe(true);
  });

  test("accepts activity:read_all, in any position", () => {
    expect(grantsActivityRead("activity:read_all,read")).toBe(true);
  });

  test("rejects a grant with the activities box unticked", () => {
    expect(grantsActivityRead("read")).toBe(false);
  });

  test("rejects a missing or empty scope", () => {
    expect(grantsActivityRead(null)).toBe(false);
    expect(grantsActivityRead("")).toBe(false);
  });

  test("does not match on a prefix", () => {
    expect(grantsActivityRead("activity:write")).toBe(false);
  });
});
