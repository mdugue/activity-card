/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { stravaToParsed } from "@/lib/strava-to-parsed";
import type { StravaActivityDetail, StravaStreams } from "@/lib/strava-types";

const START = "2026-05-18T07:00:00Z";

function makeDetail(
  overrides: Partial<StravaActivityDetail> = {}
): StravaActivityDetail {
  return {
    id: 1234,
    name: "Morning Ride",
    sport_type: "Ride",
    start_date: START,
    distance: 25_000, // metres
    moving_time: 3600,
    total_elevation_gain: 300,
    ...overrides,
  };
}

function makeStreams(points: number): StravaStreams {
  return {
    latlng: {
      type: "latlng",
      data: Array.from({ length: points }, (_, i) => [47 + i * 0.001, 11]),
    },
    altitude: {
      type: "altitude",
      data: Array.from({ length: points }, (_, i) => 500 + i),
    },
    time: {
      type: "time",
      data: Array.from({ length: points }, (_, i) => i * 60),
    },
  };
}

describe("stravaToParsed", () => {
  test("maps detail + aligned streams to one parsed ride", () => {
    const [parsed, ...rest] = stravaToParsed(makeDetail(), makeStreams(4));
    expect(rest.length).toBe(0);
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
    streams.heartrate = { type: "heartrate", data: [140, 141, 142] };
    const [parsed] = stravaToParsed(makeDetail(), streams);
    expect(parsed.routeCoordinates?.length).toBe(3);
  });

  test("missing start_date still parses; summary fields survive", () => {
    const [parsed] = stravaToParsed(
      makeDetail({ start_date: undefined }),
      makeStreams(3)
    );
    expect(parsed.distanceKm).toBe(25);
    expect(typeof parsed.date).toBe("string");
  });

  test("empty streams produce a summary-only activity", () => {
    const [parsed] = stravaToParsed(makeDetail(), {});
    expect(parsed.distanceKm).toBe(25);
    expect(parsed.durationSec).toBe(3600);
    expect(parsed.routeCoordinates ?? []).toEqual([]);
  });

  test("multisport activities stay a single triathlon part (no /laps split yet)", () => {
    const parts = stravaToParsed(
      makeDetail({ name: "Sunday Triathlon", sport_type: undefined }),
      {}
    );
    expect(parts.length).toBe(1);
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
