/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import { stravaToParsed } from "@/lib/strava-to-parsed";
import type { StravaActivityDetail, StravaStreams } from "@/lib/strava-types";

const START = "2026-05-18T07:00:00Z";

/** The detail fixture minus `sport_type` / `start_date`, which some tests omit. */
const DETAIL_CORE = {
  // metres
  distance: 25_000,
  id: 1234,
  moving_time: 3600,
  name: "Morning Ride",
  total_elevation_gain: 300,
} satisfies StravaActivityDetail;

const makeDetail = (
  overrides: Partial<StravaActivityDetail> = {}
): StravaActivityDetail => ({
  ...DETAIL_CORE,
  sport_type: "Ride",
  start_date: START,
  ...overrides,
});

const makeStreams = (points: number): StravaStreams => ({
  altitude: {
    data: Array.from({ length: points }, (_, i) => 500 + i),
    type: "altitude",
  },
  latlng: {
    data: Array.from({ length: points }, (_, i) => [47 + i * 0.001, 11]),
    type: "latlng",
  },
  time: {
    data: Array.from({ length: points }, (_, i) => i * 60),
    type: "time",
  },
});

describe("stravaToParsed", () => {
  test("maps detail + aligned streams to one parsed ride", () => {
    const [parsed, ...rest] = stravaToParsed(makeDetail(), makeStreams(4));
    expect(rest).toHaveLength(0);
    expect(parsed.sport).toBe("ride");
    expect(parsed.title).toBe("Morning Ride");
    expect(parsed.distanceKm).toBe(25);
    expect(parsed.durationSec).toBe(3600);
    expect(parsed.routeCoordinates?.length).toBe(4);
    expect(parsed.stravaActivityIds).toEqual([1234]);
    // Strava time offsets become absolute epoch ms anchored on start_date.
    expect(parsed.startTimeMs).toBe(Date.parse(START));
  });

  test("truncates to the shortest non-empty stream", () => {
    const streams = makeStreams(5);
    streams.heartrate = { data: [140, 141, 142], type: "heartrate" };
    const [parsed] = stravaToParsed(makeDetail(), streams);
    expect(parsed.routeCoordinates?.length).toBe(3);
  });

  test("missing start_date still parses; summary fields survive", () => {
    const [parsed] = stravaToParsed(
      { ...DETAIL_CORE, sport_type: "Ride" },
      makeStreams(3)
    );
    expect(parsed.distanceKm).toBe(25);
    expect(parsed.date).toBeString();
  });

  test("empty streams produce a summary-only activity", () => {
    const [parsed] = stravaToParsed(makeDetail(), {});
    expect(parsed.distanceKm).toBe(25);
    expect(parsed.durationSec).toBe(3600);
    expect(parsed.routeCoordinates ?? []).toEqual([]);
  });

  test("multisport activities stay a single triathlon part (no /laps split yet)", () => {
    const parts = stravaToParsed(
      { ...DETAIL_CORE, name: "Sunday Triathlon", start_date: START },
      {}
    );
    expect(parts).toHaveLength(1);
    expect(parts[0].sport).toBe("triathlon");
  });

  test("athlete name and location overlay the parsed result", () => {
    const [parsed] = stravaToParsed(
      makeDetail({
        athlete: { firstname: "Jo", lastname: "Rider" },
        location_city: "Innsbruck",
        location_country: "Austria",
      }),
      {}
    );
    expect(parsed.athleteName).toBe("Jo Rider");
    expect(parsed.location).toBe("Innsbruck, Austria");
  });
});
