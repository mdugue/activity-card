/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import { fitDataToParsed } from "@/lib/parse-fit";

// Shaped like fit-file-parser's `mode: "list"` output with `lengthUnit: "m"`
// and `speedUnit: "km/h"`.
function fitData(session: Record<string, unknown>) {
  return {
    activity: { sessions: [session] },
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

const SESSION = {
  sport: "cycling",
  start_time: "2026-05-18T07:00:00Z",
  total_distance: 42_195, // metres
  total_elapsed_time: 3600,
  total_ascent: 450, // metres
  avg_speed: 30, // km/h
};

describe("fitDataToParsed", () => {
  test("converts the session distance from metres to km", () => {
    const parsed = fitDataToParsed(fitData(SESSION), "ride.fit");
    expect(parsed.distanceKm).toBeCloseTo(42.2, 1);
  });

  test("keeps the session ascent in metres", () => {
    const parsed = fitDataToParsed(fitData(SESSION), "ride.fit");
    expect(parsed.elevationGainM).toBe(450);
  });

  test("keeps record altitudes in metres for the elevation profile", () => {
    const parsed = fitDataToParsed(fitData(SESSION), "ride.fit");
    const profile = parsed.elevationProfile ?? [];
    expect(Math.max(...profile)).toBe(950);
    expect(Math.min(...profile)).toBe(500);
  });

  test("derives elevation gain from records without total_ascent", () => {
    const { total_ascent: _omit, ...withoutAscent } = SESSION;
    const parsed = fitDataToParsed(fitData(withoutAscent), "ride.fit");
    expect(parsed.elevationGainM).toBeGreaterThan(0);
  });

  test("prefers enhanced_altitude when present", () => {
    const data = {
      activity: { sessions: [SESSION] },
      records: [
        {
          position_lat: 47,
          position_long: 11,
          enhanced_altitude: 1200,
          timestamp: "2026-05-18T07:00:00Z",
        },
        {
          position_lat: 47.001,
          position_long: 11,
          enhanced_altitude: 1300,
          timestamp: "2026-05-18T08:00:00Z",
        },
      ],
    };
    const parsed = fitDataToParsed(data, "ride.fit");
    expect(Math.max(...(parsed.elevationProfile ?? []))).toBe(1300);
  });

  test("an empty document degrades to an empty activity, not a crash", () => {
    const parsed = fitDataToParsed({}, "x.fit");
    expect(parsed.distanceKm).toBe(0);
    expect(parsed.durationSec).toBe(0);
    expect(parsed.routeCoordinates).toBeUndefined();
    expect(parsed.elevationProfile).toBeUndefined();
  });
});
