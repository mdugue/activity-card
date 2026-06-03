/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  type Coord,
  resampleTo,
  simplifyRDP,
  simplifyToCount,
  smooth,
} from "@/lib/simplify";

describe("simplifyRDP", () => {
  test("returns a copy unchanged for fewer than three points", () => {
    const pts: Coord[] = [
      [0, 0],
      [1, 1],
    ];
    const out = simplifyRDP(pts, 0.5);
    expect(out).toEqual(pts);
    expect(out).not.toBe(pts);
  });

  test("drops collinear interior points", () => {
    const pts: Coord[] = [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ];
    expect(simplifyRDP(pts, 0.1)).toEqual([
      [0, 0],
      [3, 0],
    ]);
  });

  test("keeps a point that deviates beyond tolerance", () => {
    const pts: Coord[] = [
      [0, 0],
      [1, 5],
      [2, 0],
    ];
    // The spike at (1, 5) is far from the 0→2 baseline, so it survives.
    expect(simplifyRDP(pts, 1)).toEqual(pts);
  });

  test("always preserves the first and last points", () => {
    const pts: Coord[] = [
      [0, 0],
      [1, 0.001],
      [2, 0],
    ];
    const out = simplifyRDP(pts, 10);
    expect(out[0]).toEqual([0, 0]);
    expect(out.at(-1)).toEqual([2, 0]);
  });
});

describe("simplifyToCount", () => {
  test("returns a copy when already within the target", () => {
    const pts: Coord[] = [
      [0, 0],
      [1, 1],
    ];
    const out = simplifyToCount(pts, 10);
    expect(out).toEqual(pts);
    expect(out).not.toBe(pts);
  });

  test("reduces a dense polyline to at or below the target", () => {
    // A jagged saw-tooth of 500 points — no tolerance leaves it collinear.
    const pts: Coord[] = Array.from(
      { length: 500 },
      (_, i): Coord => [i, i % 2]
    );
    const out = simplifyToCount(pts, 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.length).toBeGreaterThan(1);
    expect(out[0]).toEqual([0, 0]);
    expect(out.at(-1)).toEqual([499, 1]);
  });
});

describe("resampleTo", () => {
  test("returns an empty array for empty input or non-positive count", () => {
    expect(resampleTo([], 5)).toEqual([]);
    expect(resampleTo([1, 2, 3], 0)).toEqual([]);
  });

  test("returns a copy when the count matches the length", () => {
    const vals = [1, 2, 3];
    const out = resampleTo(vals, 3);
    expect(out).toEqual(vals);
    expect(out).not.toBe(vals);
  });

  test("downsamples to the requested length", () => {
    expect(resampleTo([0, 1, 2, 3, 4], 3)).toEqual([0, 2, 4]);
  });

  test("upsamples with linear interpolation", () => {
    expect(resampleTo([0, 10], 5)).toEqual([0, 2.5, 5, 7.5, 10]);
  });

  test("collapses to the first value when count is one", () => {
    expect(resampleTo([7, 8, 9], 1)).toEqual([7]);
  });
});

describe("smooth", () => {
  test("returns a copy unchanged for tiny windows or series", () => {
    expect(smooth([1, 2, 3], 1)).toEqual([1, 2, 3]);
    expect(smooth([5], 5)).toEqual([5]);
  });

  test("applies a centered rolling mean, clamping at the edges", () => {
    // window 3 over [0,3,6,9]: edges average 2, interior 3 neighbours.
    expect(smooth([0, 3, 6, 9], 3)).toEqual([1.5, 3, 6, 7.5]);
  });

  test("leaves a constant series untouched", () => {
    expect(smooth([4, 4, 4, 4, 4], 3)).toEqual([4, 4, 4, 4, 4]);
  });
});
