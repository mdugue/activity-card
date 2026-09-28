/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import type { ParamDef } from "@/theme/core/params/kinds";
import { coerceConfig } from "@/theme/core/params/resolve";

interface Cfg extends Record<string, unknown> {
  density: number;
  legend: boolean;
  mood: string;
}

const DEFAULTS: Cfg = { density: 24, legend: true, mood: "dusk" };

const PARAMS: ParamDef[] = [
  {
    default: "dusk",
    group: "style",
    id: "mood",
    kind: "segmented",
    label: "Atmosphere",
    options: [
      { id: "dawn", label: "Dawn" },
      { id: "dusk", label: "Dusk" },
    ],
  },
  {
    default: 24,
    group: "layout",
    id: "density",
    kind: "slider",
    label: "Density",
    max: 40,
    min: 10,
  },
  {
    default: true,
    group: "marks",
    id: "legend",
    kind: "toggle",
    label: "Legend",
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
      density: 24,
      legend: true,
      mood: "dawn",
    });
  });

  test("drops unknown keys", () => {
    const out = coerceConfig(DEFAULTS, PARAMS, { bogus: 1, mood: "dawn" });
    expect(out).toEqual({ density: 24, legend: true, mood: "dawn" });
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
        default: "dusk",
        group: "style",
        id: "mood",
        kind: "select",
        label: "Atmosphere",
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
