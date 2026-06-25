/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import type { ActivityData } from "@/lib/activity";
import {
  applyVisibility,
  DEFAULT_VISIBILITY,
  themeAvailability,
  type Visibility,
} from "@/theme/core/visibility";

const FULL: ActivityData = {
  sport: "ride",
  title: "Morning Ride",
  date: "2026-05-18",
  location: "Innsbruck",
  athleteName: "Jo Rider",
  distanceKm: 42.5,
  durationSec: 5400,
  elevationGainM: 800,
  elevationProfile: [500, 600, 700],
  avgSpeedKmh: 28.3,
  maxSpeedKmh: 61.2,
  speedProfile: [25, 30, 28],
  avgHeartRate: 148,
  avgCadence: 88,
  normalizedPowerW: 220,
  powerProfile: [200, 240, 220],
  routeCoordinates: [
    [0, 0],
    [1, 1],
    [2, 0],
  ],
  splits: [{ km: 1, durationSec: 120 }],
};

const ALL_ON: Visibility = {
  ...DEFAULT_VISIBILITY,
  athleteName: true,
};

describe("applyVisibility", () => {
  test("all switches on leaves the data untouched", () => {
    expect(applyVisibility(FULL, ALL_ON)).toEqual(FULL);
  });

  test("text switches blank their strings", () => {
    const out = applyVisibility(FULL, {
      ...ALL_ON,
      title: false,
      date: false,
      location: false,
      athleteName: false,
    });
    expect(out.title).toBe("");
    expect(out.date).toBe("");
    expect(out.location).toBe("");
    expect(out.athleteName).toBe("");
  });

  test("speed off strips avg, max and the profile together", () => {
    const out = applyVisibility(FULL, { ...ALL_ON, speed: false });
    expect(out.avgSpeedKmh).toBeUndefined();
    expect(out.maxSpeedKmh).toBeUndefined();
    expect(out.speedProfile).toBeUndefined();
  });

  test("power off strips the number and the profile", () => {
    const out = applyVisibility(FULL, { ...ALL_ON, power: false });
    expect(out.normalizedPowerW).toBeUndefined();
    expect(out.powerProfile).toBeUndefined();
  });

  test("elevation number and elevation viz toggle independently", () => {
    const noNumber = applyVisibility(FULL, { ...ALL_ON, elevation: false });
    expect(noNumber.elevationGainM).toBeUndefined();
    expect(noNumber.elevationProfile).toEqual([500, 600, 700]);

    const noViz = applyVisibility(FULL, { ...ALL_ON, elevationViz: false });
    expect(noViz.elevationGainM).toBe(800);
    expect(noViz.elevationProfile).toBeUndefined();
  });

  test("route and splits switches strip their collections", () => {
    const out = applyVisibility(FULL, {
      ...ALL_ON,
      route: false,
      splits: false,
    });
    expect(out.routeCoordinates).toBeUndefined();
    expect(out.splits).toBeUndefined();
  });

  test("distance and time are never stripped", () => {
    const out = applyVisibility(FULL, {
      ...ALL_ON,
      distance: false,
      time: false,
    });
    expect(out.distanceKm).toBe(42.5);
    expect(out.durationSec).toBe(5400);
  });
});

describe("themeAvailability", () => {
  test("a theme that declares nothing gets every governed switch off", () => {
    const avail = themeAvailability(FULL, { uses: [] });
    expect(avail.heartRate).toBe(false);
    expect(avail.route).toBe(false);
    expect(avail.speed).toBe(false);
    expect(avail.splits).toBe(false);
    // Non-capability switches are never theme-gated.
    expect(avail.title).toBe(true);
    expect(avail.distance).toBe(true);
    expect(avail.photoBackdrop).toBe(true);
  });

  test("declared capability + present data = available", () => {
    const avail = themeAvailability(FULL, { uses: ["heartRate", "route"] });
    expect(avail.heartRate).toBe(true);
    expect(avail.route).toBe(true);
    expect(avail.cadence).toBe(false); // present in data, not declared
  });

  test("declared capability without data stays unavailable", () => {
    const noHr: ActivityData = { ...FULL, avgHeartRate: undefined };
    const avail = themeAvailability(noHr, { uses: ["heartRate"] });
    expect(avail.heartRate).toBe(false);
  });

  test("usesWhen refinement can veto a declared capability", () => {
    const avail = themeAvailability(FULL, {
      uses: ["route"],
      usesWhen: { route: (d) => d.sport === "swim" },
    });
    expect(avail.route).toBe(false);
  });
});
