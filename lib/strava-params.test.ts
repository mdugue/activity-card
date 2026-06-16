/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { clampedIntParam } from "@/lib/strava-params";

describe("clampedIntParam", () => {
  test("missing or non-numeric input falls back", () => {
    expect(clampedIntParam(null, 30, 1, 100)).toBe(30);
    expect(clampedIntParam("", 30, 1, 100)).toBe(30);
    expect(clampedIntParam("abc", 30, 1, 100)).toBe(30);
  });

  test("in-range integers pass through", () => {
    expect(clampedIntParam("30", 30, 1, 100)).toBe(30);
    expect(clampedIntParam("1", 30, 1, 100)).toBe(1);
    expect(clampedIntParam("100", 30, 1, 100)).toBe(100);
  });

  test("out-of-range input clamps to the bounds", () => {
    expect(clampedIntParam("0", 30, 1, 100)).toBe(1);
    expect(clampedIntParam("-5", 30, 1, 100)).toBe(1);
    expect(clampedIntParam("999999", 30, 1, 100)).toBe(100);
  });

  test("parseInt semantics: decimals truncate, exponents stop at the e", () => {
    expect(clampedIntParam("12.9", 30, 1, 100)).toBe(12);
    expect(clampedIntParam("1e3", 30, 1, 100)).toBe(1);
  });
});
