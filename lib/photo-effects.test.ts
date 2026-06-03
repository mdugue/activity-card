/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  FILTER_PRESETS,
  filterCss,
  isQuarterTurn,
  nextRotation,
} from "@/lib/photo-effects";

describe("nextRotation", () => {
  test("cycles 0 → 90 → 180 → 270 → 0", () => {
    expect(nextRotation(0)).toBe(90);
    expect(nextRotation(90)).toBe(180);
    expect(nextRotation(180)).toBe(270);
    expect(nextRotation(270)).toBe(0);
  });
});

describe("isQuarterTurn", () => {
  test("is true only for 90 and 270 (the width/height swaps)", () => {
    expect(isQuarterTurn(0)).toBe(false);
    expect(isQuarterTurn(90)).toBe(true);
    expect(isQuarterTurn(180)).toBe(false);
    expect(isQuarterTurn(270)).toBe(true);
  });
});

describe("filterCss", () => {
  test("resolves every preset id to its css", () => {
    expect(FILTER_PRESETS.length).toBeGreaterThan(0);
    for (const preset of FILTER_PRESETS) {
      expect(filterCss(preset.id)).toBe(preset.css);
    }
  });

  test("returns empty string for an unknown id", () => {
    expect(filterCss("does-not-exist")).toBe("");
  });
});
