/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { detectSport, finalise, type TrackPoint } from "@/lib/parse-shared";

describe("detectSport", () => {
  test("maps cycling keywords from the raw type", () => {
    expect(detectSport("Ride", "x.gpx")).toBe("ride");
    expect(detectSport("VirtualRide", "x.gpx")).toBe("ride");
    expect(detectSport("cycling", "x.gpx")).toBe("ride");
    expect(detectSport("mountain bike", "x.gpx")).toBe("ride");
  });

  test("maps run and swim keywords", () => {
    expect(detectSport("Run", "x.gpx")).toBe("run");
    expect(detectSport("TrailRun", "x.gpx")).toBe("run");
    expect(detectSport("Swim", "x.gpx")).toBe("swim");
  });

  test("maps multisport keywords to triathlon", () => {
    expect(detectSport("Triathlon", "x.gpx")).toBe("triathlon");
    expect(detectSport("Multisport", "x.gpx")).toBe("triathlon");
  });

  test("falls back to the filename when the raw type is absent", () => {
    expect(detectSport(undefined, "morning-run.gpx")).toBe("run");
    expect(detectSport("", "weekend_bike_ride.fit")).toBe("ride");
  });

  test("defaults to ride for unrecognised input", () => {
    expect(detectSport("Yoga", "session.gpx")).toBe("ride");
    expect(detectSport(undefined, "activity.gpx")).toBe("ride");
  });
});

describe("finalise", () => {
  // A short straight eastward run, one point per minute, ~1.85 km total.
  function linePoints(): TrackPoint[] {
    const start = Date.parse("2026-05-18T07:00:00Z");
    return Array.from(
      { length: 11 },
      (_, i): TrackPoint => ({
        lat: 0,
        lng: i * 0.001, // ~111 m per 0.001° at the equator
        elevation: 100 + i,
        heartRate: 140 + i,
        time: start + i * 60_000,
      })
    );
  }

  test("derives distance and duration from track points", () => {
    const a = finalise({
      points: linePoints(),
      sport: "run",
      name: "test",
      isoDate: "2026-05-18T07:00:00Z",
    });
    // 10 hops × ~111 m ≈ 1.11 km; duration is exactly 10 minutes.
    expect(a.distanceKm).toBeGreaterThan(1);
    expect(a.distanceKm).toBeLessThan(1.3);
    expect(a.durationSec).toBe(600);
  });

  test("prefers session-level totals over derived values", () => {
    const a = finalise({
      points: linePoints(),
      sport: "ride",
      name: "test",
      sessionDistanceKm: 42.195,
      sessionDurationSec: 3600,
      sessionAvgSpeedKmh: 42.195,
    });
    expect(a.distanceKm).toBe(42.2);
    expect(a.durationSec).toBe(3600);
    expect(a.avgSpeedKmh).toBe(42.2);
  });

  test("derives pace for runs and speed for rides from the same data", () => {
    const run = finalise({ points: linePoints(), sport: "run", name: "r" });
    const ride = finalise({ points: linePoints(), sport: "ride", name: "b" });
    expect(run.avgPaceMinPerKm).toBeGreaterThan(0);
    expect(run.avgSpeedKmh).toBeUndefined();
    expect(ride.avgSpeedKmh).toBeGreaterThan(0);
    expect(ride.avgPaceMinPerKm).toBeUndefined();
  });

  test("rounds heart rate and builds an elevation profile", () => {
    const a = finalise({ points: linePoints(), sport: "run", name: "r" });
    expect(a.avgHeartRate).toBe(145);
    expect(a.elevationProfile?.length).toBeGreaterThan(0);
    expect(a.elevationGainM).toBe(10);
  });

  test("prettifies the activity name", () => {
    const a = finalise({
      points: linePoints(),
      sport: "run",
      name: "morning_trail-run  ",
    });
    expect(a.title).toBe("Morning Trail Run");
  });

  test("uses the declared ISO date, ignoring junk metadata", () => {
    const valid = finalise({
      points: linePoints(),
      sport: "run",
      name: "r",
      isoDate: "2026-05-18T07:00:00Z",
    });
    expect(valid.date).toBe("2026-05-18");
  });

  test("omits splits for swims", () => {
    const a = finalise({ points: linePoints(), sport: "swim", name: "s" });
    expect(a.splits).toBeUndefined();
  });
});
