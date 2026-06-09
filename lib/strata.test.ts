/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import type { ActivityData, Coord } from "@/components/app/sample-data";
import {
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_SWIM,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import {
  buildStrata,
  resolveStrataSource,
  smoothPath,
  strataDirectionArrow,
  strataPeakMarker,
} from "@/lib/strata";

function make(partial: Partial<ActivityData>): ActivityData {
  return {
    athleteName: "",
    date: "2026-05-18",
    distanceKm: 42,
    durationSec: 9000,
    location: "Elbsandstein",
    sport: "ride",
    title: "Test effort",
    ...partial,
  };
}

const line: Coord[] = [
  [0, 0],
  [1, 1],
  [2, 0],
  [3, 1],
];

describe("resolveStrataSource", () => {
  test("prefers elevation, and reports its peak for the caption", () => {
    const src = resolveStrataSource(
      make({ routeCoordinates: line, elevationProfile: [10, 40, 25, 70] })
    );
    expect(src?.profileLabel).toBe("ELEVATION");
    expect(src?.elevMax).toBe(70);
  });

  test("falls back to pace, then to swim laps", () => {
    const run = resolveStrataSource(
      make({
        sport: "run",
        routeCoordinates: line,
        paceProfile: [300, 290, 305],
      })
    );
    expect(run?.profileLabel).toBe("PACE");
    expect(run?.elevMax).toBeNull();

    const swim = resolveStrataSource(
      make({
        sport: "swim",
        routeCoordinates: line,
        lapPacesPer100m: [110, 112, 108],
      })
    );
    expect(swim?.profileLabel).toBe("LAPS");
  });

  test("returns null without enough geometry", () => {
    expect(resolveStrataSource(make({ routeCoordinates: line }))).toBeNull();
    expect(
      resolveStrataSource(make({ elevationProfile: [1, 2, 3] }))
    ).toBeNull();
    expect(
      resolveStrataSource(make({ routeCoordinates: [[0, 0]] }))
    ).toBeNull();
  });

  test("concatenates a multi-activity project's legs into one source", () => {
    const src = resolveStrataSource(SAMPLE_TRI);
    expect(src).not.toBeNull();
    // Route + elevation come from the legs that carry both (bike, run); the
    // swim leg has a route but no elevation, so it's dropped, not smeared.
    expect((src?.routeCoords.length ?? 0) > 2).toBe(true);
    expect(src?.profileLabel).toBe("ELEVATION");
  });

  test("pairs each multi-activity leg's route with its OWN profile", () => {
    const bikeRoute: Coord[] = [
      [0, 0],
      [1, 1],
      [2, 0],
      [3, 1],
    ];
    const data = make({
      sport: "triathlon",
      segments: [
        {
          sport: "bike",
          distanceKm: 40,
          durationSec: 3600,
          routeCoordinates: bikeRoute,
          elevationProfile: [10, 40, 25, 70],
        },
        {
          // Route but NO elevation/pace → must be skipped, never concatenated
          // (otherwise this leg's route would morph against the bike's climb).
          sport: "run",
          distanceKm: 10,
          durationSec: 3000,
          routeCoordinates: [
            [5, 5],
            [6, 6],
            [7, 5],
          ],
        },
      ],
    });
    const src = resolveStrataSource(data);
    expect(src?.routeCoords.length).toBe(bikeRoute.length);
    expect(src?.profileLabel).toBe("ELEVATION");
  });

  test("resolves every single-activity sample fixture", () => {
    for (const data of [SAMPLE_RIDE, SAMPLE_RUN, SAMPLE_SWIM]) {
      expect(resolveStrataSource(data)).not.toBeNull();
    }
  });
});

describe("buildStrata", () => {
  const geo = buildStrata({
    routeCoords: line,
    profile: [0, 50, 20, 80],
    W: 920,
    H: 880,
    K: 24,
  });

  test("emits K + 1 curves, route (t=0) → profile (t=1)", () => {
    expect(geo.curves.length).toBe(25);
    expect(geo.curves[0].t).toBe(0);
    expect(geo.curves.at(-1)?.t).toBe(1);
  });

  test("the first/last curves are the route and profile bands", () => {
    expect(geo.curves[0].pts).toEqual(geo.routePts);
    expect(geo.curves.at(-1)?.pts).toEqual(geo.elevPts);
  });

  test("every layer is resampled to N points within the field box", () => {
    for (const c of geo.curves) {
      expect(c.pts.length).toBe(220);
      for (const [x, y] of c.pts) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(920);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(880);
      }
    }
  });

  test("the profile band sits below the route band (vertical morph)", () => {
    const routeMaxY = Math.max(...geo.routePts.map((p) => p[1]));
    const elevMinY = Math.min(...geo.elevPts.map((p) => p[1]));
    expect(elevMinY).toBeGreaterThan(routeMaxY);
  });
});

describe("smoothPath", () => {
  test("returns an empty string for fewer than two points", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([[0, 0]])).toBe("");
  });

  test("opens with a move and threads beziers through the points", () => {
    const d = smoothPath([
      [0, 0],
      [10, 10],
      [20, 0],
    ]);
    expect(d.startsWith("M0.0 0.0")).toBe(true);
    expect(d).toContain("C");
  });
});

describe("strataPeakMarker", () => {
  test("returns null without an elevation max", () => {
    expect(
      strataPeakMarker(
        [
          [0, 0],
          [1, 1],
        ],
        null
      )
    ).toBeNull();
  });

  test("pins the label at the highest (smallest-y) point", () => {
    const pts: Coord[] = [
      [0, 50],
      [10, 10],
      [20, 80],
    ];
    const m = strataPeakMarker(pts, 302);
    expect(m).toMatchObject({ x: 10, y: 10, label: "302 M" });
  });
});

describe("strataDirectionArrow", () => {
  test("returns null for too few points", () => {
    expect(
      strataDirectionArrow(
        [
          [0, 0],
          [1, 1],
          [2, 2],
        ],
        100,
        100,
        10
      )
    ).toBeNull();
  });

  test("sits beside the path, inside the field, pointing along travel", () => {
    // A horizontal route across the middle: the arrow offsets vertically off it.
    const route: Coord[] = Array.from(
      { length: 40 },
      (_, i): Coord => [i * 2, 50]
    );
    const a = strataDirectionArrow(route, 100, 100, 12);
    expect(a).not.toBeNull();
    if (a) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x).toBeLessThanOrEqual(100);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeLessThanOrEqual(100);
      // Off the line (y=50), and heading roughly horizontal.
      expect(Math.abs(a.y - 50)).toBeGreaterThan(1);
      const horiz =
        Math.abs(a.angle) < 1 || Math.abs(Math.abs(a.angle) - 180) < 1;
      expect(horiz).toBe(true);
    }
  });
});
