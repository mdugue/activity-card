/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { SAMPLE_RIDE, SAMPLE_RUN } from "@/components/app/sample-data";
import { buildStats, heroStat } from "@/lib/carousel/stats";

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
});
