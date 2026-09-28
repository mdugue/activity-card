/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import { SAMPLE_RIDE } from "@/components/app/sample-data";
import type { ActivityData } from "@/lib/activity";
import { bandModeFor, pickProfile } from "@/theme/carousel/profile";

// The selection rule itself is covered table-driven in
// `lib/profile-signal.test.ts`; these assert the carousel adapter's shape.

const withProfiles = (
  elevationProfile?: number[],
  paceProfile?: number[],
  lapPacesPer100m?: number[]
): ActivityData => ({
  ...SAMPLE_RIDE,
  elevationProfile,
  lapPacesPer100m,
  paceProfile,
});

describe("pickProfile", () => {
  test("prefers a usable elevation profile", () => {
    const r = pickProfile(withProfiles([1, 2, 3], [9, 9, 9]));
    expect(r.mode).toBe("elevation");
    expect(r.profile).toEqual([1, 2, 3]);
  });

  test("falls back to pace when elevation is degenerate (≤1 point)", () => {
    // Regression: a present-but-degenerate elevation array must NOT shadow a
    // usable pace profile — a bare `??` did, blanking the hero band.
    const degenerateProfiles: number[][] = [[], [100]];
    for (const degenerate of degenerateProfiles) {
      const r = pickProfile(withProfiles(degenerate, [4, 5, 6, 7]));
      expect(r.mode).toBe("pace");
      expect(r.profile).toEqual([4, 5, 6, 7]);
    }
  });

  test("falls back to pace when elevation is absent", () => {
    const r = pickProfile(withProfiles(undefined, [4, 5, 6]));
    expect(r.mode).toBe("pace");
    expect(r.profile).toEqual([4, 5, 6]);
  });

  test("a lap-only pool swim draws its laps, oriented as pace", () => {
    const r = pickProfile(withProfiles(undefined, undefined, [110, 112, 108]));
    expect(r.signal).toBe("laps");
    expect(r.mode).toBe("pace");
    expect(r.profile).toEqual([110, 112, 108]);
  });

  test("returns pace mode with no profile when neither is usable", () => {
    const r = pickProfile(withProfiles());
    expect(r.mode).toBe("pace");
    expect(r.signal).toBe("none");
    expect(r.profile).toBeUndefined();
  });

  test("a degenerate pace profile is not returned", () => {
    const r = pickProfile(withProfiles(undefined, [5]));
    expect(r.signal).toBe("none");
    expect(r.profile).toBeUndefined();
  });
});

describe("bandModeFor", () => {
  test("a project uses its segments' shared metric", () => {
    expect(bandModeFor({ useElevation: true }, "pace")).toBe("elevation");
    expect(bandModeFor({ useElevation: false }, "elevation")).toBe("pace");
  });

  test("a single activity uses the picked mode", () => {
    expect(bandModeFor(null, "elevation")).toBe("elevation");
  });
});
