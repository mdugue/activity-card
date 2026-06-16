/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { assembleTriathlon } from "@/lib/assemble-triathlon";
import type { ParsedActivity } from "@/lib/parse-shared";

const T0 = Date.parse("2026-05-18T07:00:00Z");
const MIN = 60_000;

function makePart(
  sport: ParsedActivity["sport"],
  opts: Partial<ParsedActivity> = {}
): ParsedActivity {
  return {
    athleteName: "",
    date: "2026-05-18T07:00:00.000Z",
    distanceKm: 10,
    durationSec: 1800,
    location: "",
    sport,
    title: `${sport} leg`,
    ...opts,
  };
}

describe("assembleTriathlon", () => {
  test("rejects fewer than two parts", () => {
    expect(() => assembleTriathlon([makePart("ride")])).toThrow(
      /at least two activities/
    );
  });

  test("orders segments by start time and derives T1/T2 from the gaps", () => {
    const swim = makePart("swim", {
      distanceKm: 1.5,
      durationSec: 1800,
      startTimeMs: T0,
      endTimeMs: T0 + 30 * MIN,
    });
    const ride = makePart("ride", {
      distanceKm: 40,
      durationSec: 4200,
      startTimeMs: T0 + 32.5 * MIN, // 150 s after the swim ends
      endTimeMs: T0 + 102.5 * MIN,
    });
    const run = makePart("run", {
      distanceKm: 10,
      durationSec: 3000,
      startTimeMs: T0 + 104 * MIN, // 90 s after the ride ends
      endTimeMs: T0 + 154 * MIN,
    });

    // Shuffled input — sorting must restore swim → ride → run.
    const tri = assembleTriathlon([run, swim, ride]);
    expect(tri.sport).toBe("triathlon");
    expect(tri.title).toBe("Triathlon");
    expect(tri.segments?.map((s) => s.sport)).toEqual(["swim", "bike", "run"]);
    expect(tri.transitions).toEqual([
      { name: "T1", durationSec: 150 },
      { name: "T2", durationSec: 90 },
    ]);
    expect(tri.distanceKm).toBe(51.5);
    expect(tri.durationSec).toBe(1800 + 4200 + 3000);
  });

  test("missing timestamps keep input order and omit transitions", () => {
    const tri = assembleTriathlon([makePart("ride"), makePart("run")]);
    expect(tri.segments?.map((s) => s.sport)).toEqual(["bike", "run"]);
    expect(tri.transitions).toBeUndefined();
    expect(tri.title).toBe("Brick session");
  });

  test("overlapping or zero gaps never yield negative transitions", () => {
    const ride = makePart("ride", {
      startTimeMs: T0,
      endTimeMs: T0 + 60 * MIN,
    });
    const run = makePart("run", {
      startTimeMs: T0 + 55 * MIN, // overlaps the ride end
      endTimeMs: T0 + 100 * MIN,
    });
    const tri = assembleTriathlon([ride, run]);
    expect(tri.transitions).toBeUndefined();
  });

  test("averages heart rate across the parts that have one", () => {
    const tri = assembleTriathlon([
      makePart("ride", { avgHeartRate: 150 }),
      makePart("run", { avgHeartRate: 160 }),
      makePart("swim"),
    ]);
    expect(tri.avgHeartRate).toBe(155);
  });

  test("aligns Strava ids with segments, null for file parts", () => {
    const tri = assembleTriathlon([
      makePart("swim", { startTimeMs: T0, stravaActivityIds: [11] }),
      makePart("ride", { startTimeMs: T0 + MIN }),
    ]);
    expect(tri.stravaActivityIds).toEqual([11, null]);
  });
});
