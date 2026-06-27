/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { SAMPLE_RIDE } from "@/components/app/sample-data";
import type { ActivityData } from "@/lib/activity";
import { pickProfile } from "@/theme/carousel/profile";

function withProfiles(
  elevationProfile: number[] | undefined,
  paceProfile: number[] | undefined
): ActivityData {
  return { ...SAMPLE_RIDE, elevationProfile, paceProfile };
}

describe("pickProfile", () => {
  test("prefers a usable elevation profile", () => {
    const r = pickProfile(withProfiles([1, 2, 3], [9, 9, 9]));
    expect(r.mode).toBe("elevation");
    expect(r.profile).toEqual([1, 2, 3]);
  });

  test("falls back to pace when elevation is degenerate (≤1 point)", () => {
    // Regression: a present-but-degenerate elevation array must NOT shadow a
    // usable pace profile — a bare `??` did, blanking the hero band.
    for (const degenerate of [[] as number[], [100]]) {
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

  test("returns pace mode with no profile when neither is usable", () => {
    const r = pickProfile(withProfiles(undefined, undefined));
    expect(r.mode).toBe("pace");
    expect(r.profile).toBeUndefined();
  });
});
