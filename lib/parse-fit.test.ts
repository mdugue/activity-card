/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import { fitDataToParsed } from "@/lib/parse-fit";

// Shaped like fit-file-parser's `mode: "list"` output with `lengthUnit: "m"`
// and `speedUnit: "km/h"` — the options `parseFit` passes.
function fitData(session: Record<string, unknown> = {}) {
  return {
    activity: {
      sessions: [
        {
          sport: "cycling",
          start_time: "2026-05-18T07:00:00Z",
          total_distance: 42_195,
          total_elapsed_time: 3600,
          total_ascent: 450,
          avg_speed: 30,
          ...session,
        },
      ],
    },
    records: [
      {
        position_lat: 47,
        position_long: 11,
        altitude: 500,
        timestamp: "2026-05-18T07:00:00Z",
      },
      {
        position_lat: 47.001,
        position_long: 11,
        altitude: 620,
        timestamp: "2026-05-18T07:30:00Z",
      },
      {
        position_lat: 47.002,
        position_long: 11,
        altitude: 950,
        timestamp: "2026-05-18T08:00:00Z",
      },
    ],
  };
}

describe("fitDataToParsed", () => {
  test("converts the session distance from metres to km", () => {
    const parsed = fitDataToParsed(fitData(), "ride.fit");
    expect(parsed.distanceKm).toBeCloseTo(42.2, 1);
  });

  test("keeps the session ascent in metres", () => {
    const parsed = fitDataToParsed(fitData(), "ride.fit");
    expect(parsed.elevationGainM).toBe(450);
  });

  test("the elevation profile holds real altitudes, not km fractions", () => {
    const parsed = fitDataToParsed(fitData(), "ride.fit");
    const profile = parsed.elevationProfile ?? [];
    expect(profile.length).toBeGreaterThan(0);
    expect(Math.max(...profile)).toBe(950);
    expect(Math.min(...profile)).toBe(500);
  });

  test("derives the gain from records when the session has no ascent", () => {
    const parsed = fitDataToParsed(
      fitData({ total_ascent: undefined }),
      "ride.fit"
    );
    expect(parsed.elevationGainM).toBeGreaterThan(0);
  });

  test("prefers enhanced_altitude when a device writes it", () => {
    const data = fitData();
    data.records = data.records.map((r) => ({
      ...r,
      enhanced_altitude: r.altitude + 1000,
    }));
    const parsed = fitDataToParsed(data, "ride.fit");
    expect(Math.max(...(parsed.elevationProfile ?? []))).toBe(1950);
  });

  test("an empty parse result degrades to an empty activity", () => {
    const parsed = fitDataToParsed({}, "x.fit");
    expect(parsed.distanceKm).toBe(0);
    expect(parsed.durationSec).toBe(0);
    expect(parsed.routeCoordinates).toBeUndefined();
  });

  test("a structurally wrong result throws the FIT error", () => {
    expect(() => fitDataToParsed({ records: "nope" }, "x.fit")).toThrow(
      /does not look like a valid FIT/u
    );
  });
});
