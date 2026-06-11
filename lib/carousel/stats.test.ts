/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { SAMPLE_RIDE, SAMPLE_RUN } from "@/components/app/sample-data";
import {
  buildStats,
  detailStats,
  frameStats,
  heroStat,
  pressSlideStats,
} from "@/lib/carousel/stats";

describe("buildStats", () => {
  test("leads with distance and includes core ride metrics", () => {
    const stats = buildStats(SAMPLE_RIDE);
    expect(stats[0].key).toBe("distance");
    const keys = stats.map((s) => s.key);
    expect(keys).toContain("elevation");
    expect(keys).toContain("avgSpeed");
    expect(keys).toContain("duration");
  });

  test("omits metrics with no underlying data (never renders a dash)", () => {
    const stats = buildStats({
      ...SAMPLE_RIDE,
      avgHeartRate: undefined,
      normalizedPowerW: undefined,
    });
    const keys = stats.map((s) => s.key);
    expect(keys).not.toContain("avgHr");
    expect(keys).not.toContain("power");
    expect(stats.every((s) => s.value.length > 0 && s.value !== "—")).toBe(
      true
    );
  });

  test("swim distance shows a dash, not 'NaN', for a non-finite distance", () => {
    // Regression: the swim branch bypassed formatNumber and printed literal
    // "NaN" for a non-finite distance (heroStat then headlines "NaN"/"N").
    const stats = buildStats({
      ...SAMPLE_RUN,
      sport: "swim",
      distanceKm: Number.NaN,
    });
    const distance = stats.find((s) => s.key === "distance");
    expect(distance?.value).toBe("—");
    expect(distance?.unit).toBe("m");
  });

  test("heroStat is the leading (distance) stat", () => {
    expect(heroStat(SAMPLE_RIDE).key).toBe("distance");
  });

  test("heroStat headlines elevation when the theme asks for it", () => {
    expect(heroStat(SAMPLE_RIDE, "elevation").key).toBe("elevation");
  });

  test("heroStat falls back to distance when elevation is missing", () => {
    const noElevation = { ...SAMPLE_RIDE, elevationGainM: undefined };
    expect(heroStat(noElevation, "elevation").key).toBe("distance");
  });

  test("frameStats surfaces power (watts) for a ride", () => {
    const keys = frameStats(SAMPLE_RIDE).map((s) => s.key);
    expect(keys).toContain("power");
    // and it lands in the first three slots so the default 4-deck shows it
    expect(keys.slice(0, 3)).toContain("power");
  });
});

describe("detailStats", () => {
  test("shows every stat except the hero metric (no repeated big number)", () => {
    const stats = detailStats(SAMPLE_RIDE, "distance");
    const keys = stats.map((s) => s.key);
    expect(keys).not.toContain("distance"); // the hero headline
    expect(keys).toContain("power"); // a ride's deeper metric still appears
    expect(new Set(keys).size).toBe(keys.length); // no repeats
  });

  test("when the hero headlines elevation, elevation drops from the grid", () => {
    const keys = detailStats(SAMPLE_RIDE, "elevation").map((s) => s.key);
    expect(keys).not.toContain("elevation");
    expect(keys).toContain("distance");
  });
});

describe("pressSlideStats", () => {
  const TOTAL = 4; // Press is a 4-slide deck

  test("front page leads with the headline + lede (first three)", () => {
    const front = pressSlideStats(SAMPLE_RIDE, 0, TOTAL);
    expect(front).toHaveLength(3);
    expect(front[0].key).toBe("distance");
  });

  test("byline (last slide) shows no stats", () => {
    expect(pressSlideStats(SAMPLE_RIDE, TOTAL - 1, TOTAL)).toEqual([]);
  });

  test("spreads page the rest without repeating the front page", () => {
    const front = new Set(
      pressSlideStats(SAMPLE_RIDE, 0, TOTAL).map((s) => s.key)
    );
    const spreads = [
      ...pressSlideStats(SAMPLE_RIDE, 1, TOTAL),
      ...pressSlideStats(SAMPLE_RIDE, 2, TOTAL),
    ];
    expect(spreads.length).toBeGreaterThan(0);
    expect(spreads.some((s) => front.has(s.key))).toBe(false);
  });
});
