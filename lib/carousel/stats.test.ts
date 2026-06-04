/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { SAMPLE_RIDE, SAMPLE_RUN } from "@/components/app/sample-data";
import {
  buildStats,
  frameStats,
  heroStat,
  planStandardStats,
} from "@/lib/carousel/stats";
import { buildDeck } from "@/lib/carousel/types";

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

describe("planStandardStats", () => {
  test("intro headlines the hero; detail slides never repeat it", () => {
    const slides = buildDeck(["hero", "statRow", "statGrid", "editorial"]);
    const plan = planStandardStats(SAMPLE_RIDE, slides, "distance");
    expect(plan).toHaveLength(slides.length);
    // intro slide → only the hero stat
    expect(plan[0].map((s) => s.key)).toEqual(["distance"]);
    // wrap-up slide → no grid stats (it draws its own summary)
    expect(plan.at(-1)).toEqual([]);
    // no detail slide repeats the hero, and none repeat each other
    const detail = plan.slice(1, -1).flat();
    expect(detail.some((s) => s.key === "distance")).toBe(false);
    const keys = detail.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("a ride's detail slides include power (watts)", () => {
    const slides = buildDeck(["hero", "statRow", "statGrid", "editorial"]);
    const plan = planStandardStats(SAMPLE_RIDE, slides, "distance");
    const keys = plan.flat().map((s) => s.key);
    expect(keys).toContain("power");
  });
});
