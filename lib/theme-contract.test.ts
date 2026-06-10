/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { SAMPLE_RIDE, SAMPLE_RUN } from "@/components/app/sample-data";
import {
  type CapabilityKey,
  defineTheme,
  GOVERNED_FIELDS,
  pickThemeData,
  type ThemeProps,
} from "@/lib/theme-contract";
import { themeAvailability } from "@/lib/visibility";

const Noop: (props: ThemeProps<"route" | "elevation">) => null = () => null;

const slim = defineTheme({
  id: "slim",
  label: "SLIM",
  tagline: "test theme",
  uses: ["route", "elevation"],
  usesWhen: { elevation: (d) => d.sport === "ride" },
  colors: { default: { primary: "#c45a2c" }, userAdjustable: false },
  photo: { defaultOn: true },
  Component: Noop,
});

describe("pickThemeData", () => {
  test("strips undeclared governed fields, keeps declared + core", () => {
    const out = pickThemeData(slim, SAMPLE_RIDE);
    // declared
    expect(out.routeCoordinates).toBe(SAMPLE_RIDE.routeCoordinates);
    expect(out.elevationGainM).toBe(SAMPLE_RIDE.elevationGainM);
    // undeclared governed → stripped
    expect(out.avgHeartRate).toBeUndefined();
    expect(out.avgSpeedKmh).toBeUndefined();
    expect(out.elevationProfile).toBeUndefined();
    expect(out.splits).toBeUndefined();
    // required text fields blank, not undefined (mirrors applyVisibility)
    expect(out.athleteName).toBe("");
    expect(out.location).toBe("");
    // core fields untouched
    expect(out.title).toBe(SAMPLE_RIDE.title);
    expect(out.distanceKm).toBe(SAMPLE_RIDE.distanceKm);
  });

  test("does not mutate the input", () => {
    const before = { ...SAMPLE_RIDE };
    pickThemeData(slim, SAMPLE_RIDE);
    expect(SAMPLE_RIDE).toEqual(before);
  });
});

describe("themeAvailability", () => {
  test("undeclared capabilities are unavailable even when the data exists", () => {
    const avail = themeAvailability(SAMPLE_RIDE, slim);
    expect(avail.route).toBe(true);
    expect(avail.heartRate).toBe(false); // data present, capability undeclared
    expect(avail.speed).toBe(false);
    expect(avail.splits).toBe(false);
  });

  test("usesWhen refines a declared capability per activity", () => {
    expect(themeAvailability(SAMPLE_RIDE, slim).elevation).toBe(true);
    expect(themeAvailability(SAMPLE_RUN, slim).elevation).toBe(false);
  });

  test("non-capability switches are never theme-gated", () => {
    const avail = themeAvailability(SAMPLE_RIDE, slim);
    expect(avail.title).toBe(true);
    expect(avail.date).toBe(true);
    expect(avail.distance).toBe(true);
    expect(avail.photoBackdrop).toBe(true);
  });

  test("declared capability still requires the data", () => {
    const noRoute = { ...SAMPLE_RIDE, routeCoordinates: undefined };
    expect(themeAvailability(noRoute, slim).route).toBe(false);
  });
});

describe("GOVERNED_FIELDS", () => {
  test("every capability governs at least one field, fields are unique", () => {
    const seen = new Set<string>();
    for (const fields of Object.values(GOVERNED_FIELDS)) {
      expect(fields.length).toBeGreaterThan(0);
      for (const f of fields) {
        expect(seen.has(f)).toBe(false);
        seen.add(f);
      }
    }
  });

  test("capability keys match the visibility toggles they gate", () => {
    const caps = Object.keys(GOVERNED_FIELDS) as CapabilityKey[];
    const avail = themeAvailability(SAMPLE_RIDE, slim);
    for (const cap of caps) {
      expect(cap in avail).toBe(true);
    }
  });
});
