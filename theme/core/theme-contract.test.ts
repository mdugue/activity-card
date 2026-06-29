/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { SAMPLE_RIDE, SAMPLE_RUN } from "@/components/app/sample-data";
import {
  type CapabilityKey,
  defineTheme,
  GOVERNED_FIELDS,
  pickThemeData,
  type ThemeProps,
} from "@/theme/core/theme-contract";
import { themeControls } from "@/theme/core/visibility";

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
  test("strips every undeclared governed field, keeps the declared ones", () => {
    const out = pickThemeData(slim, SAMPLE_RIDE);
    // declared
    expect(out.routeCoordinates).toBe(SAMPLE_RIDE.routeCoordinates);
    expect(out.elevationGainM).toBe(SAMPLE_RIDE.elevationGainM);
    // undeclared governed → stripped
    expect(out.avgHeartRate).toBeUndefined();
    expect(out.avgSpeedKmh).toBeUndefined();
    expect(out.elevationProfile).toBeUndefined();
    expect(out.splits).toBeUndefined();
    // text capabilities blank to "" (mirrors applyVisibility); the rest undefine
    expect(out.athleteName).toBe("");
    expect(out.location).toBe("");
    // title / date / distance / time are ordinary capabilities now, so an
    // undeclared theme strips them like anything else.
    expect(out.title).toBe("");
    expect(out.date).toBe("");
    expect(out.distanceKm).toBeUndefined();
    expect(out.durationSec).toBeUndefined();
  });

  test("does not mutate the input", () => {
    const before = { ...SAMPLE_RIDE };
    pickThemeData(slim, SAMPLE_RIDE);
    expect(SAMPLE_RIDE).toEqual(before);
  });
});

describe("themeControls", () => {
  test("undeclared capabilities are hidden even when the data exists", () => {
    const ctl = themeControls(SAMPLE_RIDE, slim);
    expect(ctl.route).toBe("enabled");
    expect(ctl.heartRate).toBe("hidden"); // data present, capability undeclared
    expect(ctl.speed).toBe("hidden");
    expect(ctl.splits).toBe("hidden");
  });

  test("usesWhen refines a declared capability per activity", () => {
    expect(themeControls(SAMPLE_RIDE, slim).elevation).toBe("enabled");
    expect(themeControls(SAMPLE_RUN, slim).elevation).toBe("disabled");
  });

  test("every overlay element is a capability — undeclared ones hide", () => {
    const ctl = themeControls(SAMPLE_RIDE, slim);
    expect(ctl.title).toBe("hidden");
    expect(ctl.date).toBe("hidden");
    expect(ctl.distance).toBe("hidden");
    expect(ctl.photo).toBe("hidden");
  });

  test("declared capability without data is disabled", () => {
    const noRoute = { ...SAMPLE_RIDE, routeCoordinates: undefined };
    expect(themeControls(noRoute, slim).route).toBe("disabled");
  });
});

describe("GOVERNED_FIELDS", () => {
  test("every capability except photo governs ≥1 unique field", () => {
    const seen = new Set<string>();
    for (const [cap, fields] of Object.entries(GOVERNED_FIELDS)) {
      if (cap === "photo") {
        // photo gates the photoUrl prop, not an ActivityData field
        expect(fields.length).toBe(0);
        continue;
      }
      expect(fields.length).toBeGreaterThan(0);
      for (const f of fields) {
        expect(seen.has(f)).toBe(false);
        seen.add(f);
      }
    }
  });

  test("capability keys match the visibility toggles they gate", () => {
    const caps = Object.keys(GOVERNED_FIELDS) as CapabilityKey[];
    const ctl = themeControls(SAMPLE_RIDE, slim);
    for (const cap of caps) {
      expect(cap in ctl).toBe(true);
    }
  });
});
