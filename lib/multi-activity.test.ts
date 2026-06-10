/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import type { ActivityData } from "@/lib/activity";
import {
  isMultiActivity,
  segmentProfiles,
  segmentRoutes,
  segmentSeries,
} from "@/lib/multi-activity";

const base: ActivityData = {
  sport: "triathlon",
  title: "Tri",
  date: "2026-01-01",
  location: "",
  athleteName: "",
  distanceKm: 10,
  durationSec: 1000,
};

describe("isMultiActivity", () => {
  test("true only with two or more segments", () => {
    expect(isMultiActivity(base)).toBe(false);
    expect(
      isMultiActivity({
        ...base,
        segments: [{ sport: "run", distanceKm: 1, durationSec: 1 }],
      })
    ).toBe(false);
    expect(
      isMultiActivity({
        ...base,
        segments: [
          { sport: "swim", distanceKm: 1, durationSec: 1 },
          { sport: "run", distanceKm: 2, durationSec: 2 },
        ],
      })
    ).toBe(true);
  });
});

describe("segmentRoutes", () => {
  test("returns only segments with a usable route, in order", () => {
    const routes = segmentRoutes({
      ...base,
      segments: [
        { sport: "swim", distanceKm: 1, durationSec: 1 },
        {
          sport: "bike",
          distanceKm: 5,
          durationSec: 5,
          routeCoordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        {
          sport: "run",
          distanceKm: 2,
          durationSec: 2,
          routeCoordinates: [[0, 0]],
        },
      ],
    });
    expect(routes).toHaveLength(1);
    expect(routes[0].sport).toBe("bike");
    expect(routes[0].distanceKm).toBe(5);
  });
});

describe("segmentProfiles", () => {
  test("prefers elevation and skips legs lacking it", () => {
    const out = segmentProfiles({
      ...base,
      segments: [
        { sport: "swim", distanceKm: 1, durationSec: 1 },
        {
          sport: "bike",
          distanceKm: 5,
          durationSec: 5,
          elevationProfile: [0, 10, 20],
          paceProfile: [300, 290, 280],
        },
        {
          sport: "run",
          distanceKm: 2,
          durationSec: 2,
          elevationProfile: [1, 2, 3],
        },
      ],
    });
    expect(out.useElevation).toBe(true);
    expect(out.profiles).toHaveLength(2);
    expect(out.distances).toEqual([5, 2]);
    expect(out.sports).toEqual(["bike", "run"]);
  });

  test("falls back to pace when no leg has elevation", () => {
    const out = segmentProfiles({
      ...base,
      segments: [
        {
          sport: "run",
          distanceKm: 2,
          durationSec: 2,
          paceProfile: [300, 290, 280],
        },
        {
          sport: "bike",
          distanceKm: 5,
          durationSec: 5,
          paceProfile: [200, 210],
        },
      ],
    });
    expect(out.useElevation).toBe(false);
    expect(out.profiles).toHaveLength(2);
  });
});

describe("segmentSeries", () => {
  const data: ActivityData = {
    ...base,
    segments: [
      {
        sport: "bike",
        distanceKm: 5,
        durationSec: 5,
        elevationProfile: [0, 10, 20],
      },
      {
        sport: "run",
        distanceKm: 2,
        durationSec: 2,
        elevationProfile: [1, 2, 3],
        paceProfile: [300, 290, 280],
      },
    ],
  };

  test("collects the requested field across legs, with distances", () => {
    const elev = segmentSeries(data, "elevationProfile");
    expect(elev.profiles).toHaveLength(2);
    expect(elev.distances).toEqual([5, 2]);
  });

  test("includes only legs that carry the field", () => {
    // Only the run has a pace profile.
    const pace = segmentSeries(data, "paceProfile");
    expect(pace.profiles).toHaveLength(1);
    expect(pace.distances).toEqual([2]);
  });
});
