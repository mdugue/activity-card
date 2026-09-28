/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import type { ActivityData } from "@/lib/activity";
import {
  claimOptions,
  layoutClaim,
  resolveClaim,
  supportingStats,
} from "@/lib/altitude";

const CONTENT_W = 912;

const make = (partial: Partial<ActivityData>): ActivityData => ({
  athleteName: "",
  date: "2026-05-18",
  distanceKm: 87.3,
  durationSec: 12_251,
  location: "Elbsandstein",
  sport: "ride",
  title: "Saturday ride",
  ...partial,
});

describe("resolveClaim", () => {
  test("returns null when no claim is selected", () => {
    expect(resolveClaim("none", make({}))).toBeNull();
  });

  test("formats the requested metric with its unit", () => {
    const c = resolveClaim("elevation", make({ elevationGainM: 1240 }));
    expect(c).toMatchObject({ key: "elevation", unit: "m", value: "1240" });
  });

  test("renders the activity name as text", () => {
    const c = resolveClaim("name", make({ title: "Föhrer Westwind" }));
    expect(c).toMatchObject({
      isText: true,
      key: "name",
      value: "Föhrer Westwind",
    });
  });

  test("falls back when the requested metric is missing", () => {
    // No elevation recorded (the fixture omits it) → falls back to the first
    // available metric.
    const c = resolveClaim("elevation", make({}));
    expect(c?.key).not.toBe("elevation");
    expect(c?.value).toBeTruthy();
  });

  test("falls back from an empty name to a real metric", () => {
    const c = resolveClaim("name", make({ elevationGainM: 980, title: "  " }));
    expect(c?.isText).toBe(false);
    expect(c?.key).toBe("elevation");
  });

  test("uses metres for swim distance", () => {
    const c = resolveClaim(
      "distance",
      make({ distanceKm: 2.4, sport: "swim" })
    );
    expect(c).toMatchObject({ unit: "m", value: "2400" });
  });
});

describe("supportingStats", () => {
  test("returns at most two stats", () => {
    const stats = supportingStats(make({ elevationGainM: 1240 }), null);
    expect(stats).toHaveLength(2);
  });

  test("excludes the claim's own metric", () => {
    const data = make({ avgSpeedKmh: 23.6, elevationGainM: 1240 });
    const stats = supportingStats(data, "distance");
    expect(stats.some((s) => s.label === "DISTANCE")).toBe(false);
  });

  test("skips metrics the activity doesn't have", () => {
    // A ride with only distance present: elevation/speed/vam all absent
    // (the base fixture never sets them).
    const data = make({});
    const stats = supportingStats(data, null);
    // distance + duration remain.
    expect(stats.map((s) => s.label)).toEqual(["DISTANCE", "TIME"]);
  });

  test("uses sport-specific priorities for runs", () => {
    const data = make({
      avgHeartRate: 152,
      avgPaceMinPerKm: 4.95,
      sport: "run",
    });
    const stats = supportingStats(data, "distance");
    expect(stats.map((s) => s.label)).toEqual(["PACE", "TIME"]);
  });
});

describe("claimOptions", () => {
  test("offers only metrics the activity has", () => {
    const opts = claimOptions(
      make({
        avgSpeedKmh: 23.6,
        elevationGainM: 1240,
        maxSpeedKmh: 58.2,
      })
    );
    expect(opts).toContain("elevation");
    expect(opts).toContain("distance");
    expect(opts).toContain("name");
    expect(opts).toContain("avgSpeed");
    // No run/swim pace on this ride fixture.
    expect(opts).not.toContain("pace");
  });

  test("drops name when the title is blank", () => {
    expect(claimOptions(make({ title: "   " }))).not.toContain("name");
  });
});

describe("layoutClaim", () => {
  test("sizes a short number bigger than a long one", () => {
    const short = layoutClaim("857", "modern", false, CONTENT_W);
    const long = layoutClaim("1423", "modern", false, CONTENT_W);
    expect(short.fontSize).toBeGreaterThan(long.fontSize);
    expect(short.lines).toEqual(["857"]);
  });

  test("caps the size so 1–2 chars can't fill the card", () => {
    const tiny = layoutClaim("5", "modern", false, CONTENT_W);
    expect(tiny.fontSize).toBeLessThanOrEqual(560);
    // Too short to justify to the full width.
    expect(tiny.fill).toBe(false);
  });

  test("a number that ~fills the width is marked fill", () => {
    expect(layoutClaim("857", "modern", false, CONTENT_W).fill).toBe(true);
  });

  test("keeps a medium name on one line", () => {
    const l = layoutClaim("Running Test", "modern", true, CONTENT_W);
    expect(l.lines).toHaveLength(1);
  });

  test("wraps a long name across multiple lines", () => {
    const l = layoutClaim(
      "Saturday in the Elbsandstein",
      "modern",
      true,
      CONTENT_W
    );
    expect(l.lines.length).toBeGreaterThan(1);
    // Wrapping must restore a hero-scale size.
    expect(l.fontSize).toBeGreaterThan(100);
    // No word is dropped.
    expect(l.lines.join(" ")).toBe("Saturday in the Elbsandstein");
  });

  test("never exceeds the line cap", () => {
    const l = layoutClaim(
      "one two three four five six seven eight nine ten",
      "serif",
      true,
      CONTENT_W
    );
    expect(l.lines.length).toBeLessThanOrEqual(3);
  });
});
