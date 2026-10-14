import { describe, expect, test } from "bun:test";

import { applyColorMatrix, filterMatrix, IDENTITY_MATRIX } from "./css-filter";

const paint = (css: string, rgba: number[]): number[] => {
  const m = filterMatrix(css);
  if (!m) {
    throw new Error(`unrepresentable: ${css}`);
  }
  const px = new Uint8ClampedArray(rgba);
  applyColorMatrix(px, m);
  return [...px];
};

describe("filterMatrix", () => {
  test("empty and none are the identity", () => {
    expect(filterMatrix("")).toEqual(IDENTITY_MATRIX);
    expect(filterMatrix("none")).toEqual(IDENTITY_MATRIX);
  });

  test("non-colour functions are unrepresentable", () => {
    expect(filterMatrix("blur(4px)")).toBeNull();
    expect(filterMatrix("grayscale(1) drop-shadow(0 0 4px #000)")).toBeNull();
    expect(filterMatrix("url(#f)")).toBeNull();
  });

  test("grayscale(1) maps a colour to its luma on every channel", () => {
    const [r, g, b, a] = paint("grayscale(1)", [255, 0, 0, 255]);
    expect(r).toBe(54);
    expect(g).toBe(54);
    expect(b).toBe(54);
    expect(a).toBe(255);
  });

  test("percentages equal fractions", () => {
    expect(filterMatrix("grayscale(100%)")).toEqual(
      filterMatrix("grayscale(1)")
    );
  });

  test("brightness and contrast are per-channel affine maps", () => {
    expect(paint("brightness(0.5)", [200, 100, 50, 255])).toEqual([
      100, 50, 25, 255,
    ]);
    // contrast(1.5): v·1.5 − 63.75
    expect(paint("contrast(1.5)", [200, 100, 50, 255])).toEqual([
      236, 86, 11, 255,
    ]);
  });

  test("functions apply left to right", () => {
    // brightness then contrast ≠ contrast then brightness
    expect(
      paint("brightness(0.5) contrast(1.5)", [200, 200, 200, 255])[0]
    ).toBe(86);
    expect(
      paint("contrast(1.5) brightness(0.5)", [200, 200, 200, 255])[0]
    ).toBe(118);
  });

  test("hue-rotate(0) and saturate(1) are the identity", () => {
    expect(paint("hue-rotate(0deg) saturate(1)", [12, 140, 230, 255])).toEqual([
      12, 140, 230, 255,
    ]);
  });

  test("opacity scales alpha only", () => {
    expect(paint("opacity(0.5)", [10, 20, 30, 200])).toEqual([10, 20, 30, 100]);
  });
});
