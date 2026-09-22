import { describe, expect, test } from "bun:test";

import { mergeProbes } from "./photo-composite";

/** Minimal stand-in for ImageData — bun's test runner has no DOM. */
function imageData(pixels: number[][]): ImageData {
  const data = Uint8ClampedArray.from(pixels.flat());
  return { data, width: pixels.length, height: 1 } as ImageData;
}

/** What the browser would paint: `src` composited over `backdrop`. */
function over(src: number[], backdrop: number[]): number[] {
  const a = src[3] / 255;
  return [0, 1, 2, 3].map((c) =>
    c === 3
      ? Math.round(255 * (a + (backdrop[3] / 255) * (1 - a)))
      : Math.round(src[c] * a + backdrop[c] * (1 - a))
  );
}

const BLACK = [0, 0, 0, 255];
const WHITE = [255, 255, 255, 255];
const PHOTO = [220, 40, 160, 255];

describe("mergeProbes", () => {
  test("reconstructs content composited over the photo", () => {
    // A 60%-opaque orange scrim, exactly what a theme lays over its photo.
    const scrim = [240, 120, 20, 153];
    const merged = mergeProbes(
      imageData([over(scrim, BLACK)]),
      imageData([over(scrim, WHITE)]),
      imageData([PHOTO])
    );
    // Within a unit of the true composite — the probes only carry 8-bit values.
    for (const [c, expected] of over(scrim, PHOTO).entries()) {
      expect(Math.abs(merged.data[c] - expected)).toBeLessThanOrEqual(1);
    }
  });

  test("an opaque overlay hides the photo, as it does on screen", () => {
    const merged = mergeProbes(
      imageData([[10, 20, 30, 255]]),
      imageData([[10, 20, 30, 255]]),
      imageData([PHOTO])
    );
    expect([...merged.data]).toEqual([10, 20, 30, 255]);
  });

  test("shows the photo untouched where nothing covers it", () => {
    const merged = mergeProbes(
      imageData([BLACK]),
      imageData([WHITE]),
      imageData([PHOTO])
    );
    expect([...merged.data]).toEqual(PHOTO);
  });

  test("keeps the probe pixel where the photo plane is empty", () => {
    // Outside every photo layer both probes agree, so there is nothing to undo.
    const merged = mergeProbes(
      imageData([[7, 8, 9, 255]]),
      imageData([[7, 8, 9, 255]]),
      imageData([[0, 0, 0, 0]])
    );
    expect([...merged.data]).toEqual([7, 8, 9, 255]);
  });

  test("fades across a partially covering photo edge", () => {
    // Half-covered pixel: half the photo's contribution, half the probe's.
    const merged = mergeProbes(
      imageData([BLACK]),
      imageData([WHITE]),
      imageData([[200, 100, 50, 128]])
    );
    expect(merged.data[0]).toBeCloseTo(200 * (128 / 255), 0);
    expect(merged.data[1]).toBeCloseTo(100 * (128 / 255), 0);
  });
});
