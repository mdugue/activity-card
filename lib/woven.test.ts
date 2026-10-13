import { describe, expect, test } from "bun:test";

import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_TRI,
} from "@/components/app/sample-data";

import {
  distanceMarks,
  metricsLevel,
  polylineLength,
  sampleProfile,
  smoothSeries,
  splitTitle,
  statLine,
  wovenIntensity,
  wovenProfile,
  wovenRoute,
  wovenStats,
} from "./woven";

describe("metricsLevel", () => {
  test("auto drops the numbers for Strava only", () => {
    expect(metricsLevel("auto", "strava")).toBe("off");
    expect(metricsLevel("auto", "instagram-feed")).toBe("subtle");
  });
  test("an explicit pick wins over the format", () => {
    expect(metricsLevel("full", "strava")).toBe("full");
    expect(metricsLevel("off", "instagram-feed")).toBe("off");
  });
});

describe("wovenStats", () => {
  test("a ride shows distance, time and climbing", () => {
    expect(wovenStats(SAMPLE_RIDE).map((s) => s.label)).toEqual([
      "DISTANCE",
      "TIME",
      "CLIMB",
    ]);
    expect(statLine(wovenStats(SAMPLE_RIDE))).toBe("87.3 KM · 3H 42M · 1240 M");
  });
  test("a run shows its pace third", () => {
    expect(wovenStats(SAMPLE_RUN).at(2)?.label).toBe("PACE");
  });
  test("never more than three numbers", () => {
    expect(wovenStats(SAMPLE_TRI).length).toBeLessThanOrEqual(3);
  });
});

describe("geometry", () => {
  test("a multi-activity project joins its legs into one route", () => {
    expect(SAMPLE_TRI.routeCoordinates).toBeUndefined();
    expect(wovenRoute(SAMPLE_TRI)?.length).toBeGreaterThan(1);
  });
  test("the profile spans the unit square", () => {
    const p = wovenProfile(SAMPLE_RIDE);
    expect(p).not.toBeNull();
    const ys = p?.pts.map((pt) => pt[1]) ?? [];
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(1);
    expect(p?.pts.at(-1)?.[0]).toBe(1);
  });
  test("a multi-activity project still yields a profile", () => {
    expect(wovenProfile(SAMPLE_TRI)?.pts.length).toBeGreaterThan(1);
  });
  test("sampleProfile interpolates evenly", () => {
    expect(
      sampleProfile(
        [
          [0, 0],
          [1, 1],
        ],
        3
      )
    ).toEqual([0, 0.5, 1]);
  });
  test("smoothSeries keeps a flat series flat", () => {
    expect(smoothSeries([2, 2, 2, 2], 2)).toEqual([2, 2, 2, 2]);
  });
  test("intensity is normalised", () => {
    const v = wovenIntensity(SAMPLE_RIDE) ?? [];
    expect(Math.min(...v)).toBe(0);
    expect(Math.max(...v)).toBe(1);
  });
  test("polylineLength", () => {
    expect(
      polylineLength([
        [0, 0],
        [3, 4],
      ])
    ).toBe(5);
  });
});

describe("text helpers", () => {
  test("short titles stay on one line", () => {
    expect(splitTitle("Föhrer Westwind", 18)).toEqual(["Föhrer Westwind"]);
  });
  test("long titles break into two balanced lines", () => {
    expect(splitTitle("Saturday in the Elbsandstein", 18)).toEqual([
      "Saturday in the",
      "Elbsandstein",
    ]);
  });
  test("distance marks are round and inside the activity", () => {
    expect(distanceMarks(87.3, 4)).toEqual([20, 40, 60, 80]);
    expect(distanceMarks(5.1, 4)).toEqual([2, 4]);
    expect(distanceMarks(0, 4)).toEqual([]);
  });
});
