/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import type { ParamDef } from "@/theme/core/params/kinds";
import { coerceConfig } from "@/theme/core/params/resolve";

interface Cfg extends Record<string, unknown> {
  density: number;
  legend: boolean;
  mood: string;
}

const DEFAULTS: Cfg = { mood: "dusk", density: 24, legend: true };

const PARAMS: ParamDef[] = [
  {
    id: "mood",
    group: "style",
    label: "Atmosphere",
    kind: "segmented",
    default: "dusk",
    options: [
      { id: "dawn", label: "Dawn" },
      { id: "dusk", label: "Dusk" },
    ],
  },
  {
    id: "density",
    group: "layout",
    label: "Density",
    kind: "slider",
    default: 24,
    min: 10,
    max: 40,
  },
  {
    id: "legend",
    group: "marks",
    label: "Legend",
    kind: "toggle",
    default: true,
  },
];

describe("coerceConfig", () => {
  test("returns defaults for non-object / null / array / garbage input", () => {
    for (const raw of [null, undefined, 42, "x", [1, 2], true]) {
      expect(coerceConfig(DEFAULTS, PARAMS, raw)).toEqual(DEFAULTS);
    }
  });

  test("accepts a valid partial and merges over defaults", () => {
    expect(coerceConfig(DEFAULTS, PARAMS, { mood: "dawn" })).toEqual({
      mood: "dawn",
      density: 24,
      legend: true,
    });
  });

  test("drops unknown keys", () => {
    const out = coerceConfig(DEFAULTS, PARAMS, { mood: "dawn", bogus: 1 });
    expect(out).toEqual({ mood: "dawn", density: 24, legend: true });
    expect("bogus" in out).toBe(false);
  });

  test("falls back to default on an unknown option id", () => {
    expect(coerceConfig(DEFAULTS, PARAMS, { mood: "neon" }).mood).toBe("dusk");
  });

  test("clamps a slider to its range and rejects non-finite", () => {
    expect(coerceConfig(DEFAULTS, PARAMS, { density: 999 }).density).toBe(40);
    expect(coerceConfig(DEFAULTS, PARAMS, { density: 0 }).density).toBe(10);
    expect(
      coerceConfig(DEFAULTS, PARAMS, { density: Number.NaN }).density
    ).toBe(24);
  });

  test("rejects a mistyped value (string for a toggle)", () => {
    expect(coerceConfig(DEFAULTS, PARAMS, { legend: "yes" }).legend).toBe(true);
    expect(coerceConfig(DEFAULTS, PARAMS, { legend: false }).legend).toBe(
      false
    );
  });

  test("accepts any string for a dynamic choice with no optionIds", () => {
    const dyn: ParamDef[] = [
      {
        id: "mood",
        group: "style",
        label: "Atmosphere",
        kind: "select",
        default: "dusk",
        options: () => [{ id: "dusk", label: "Dusk" }],
      },
    ];
    expect(coerceConfig(DEFAULTS, dyn, { mood: "anything" }).mood).toBe(
      "anything"
    );
  });

  test("does not mutate the defaults object", () => {
    const before = { ...DEFAULTS };
    coerceConfig(DEFAULTS, PARAMS, { mood: "dawn" });
    expect(DEFAULTS).toEqual(before);
  });
});
