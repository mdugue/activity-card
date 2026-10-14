import { describe, expect, test } from "bun:test";

import {
  cutAt,
  foregroundAlpha,
  foregroundMask,
  skyCut,
} from "./horizon-depth";
import type { DepthMap } from "./horizon-depth";

/** A 10×20 map: sky (depth 20) in the top half, a ridge row, then near ground. */
const scene = (): DepthMap => {
  const w = 10;
  const h = 20;
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    let value = 200;
    if (y < 10) {
      value = 20;
    } else if (y === 10) {
      value = 90;
    }
    data.fill(value, y * w, (y + 1) * w);
  }
  return { data, h, w };
};

describe("skyCut", () => {
  test("cuts just in front of the sky, so the ridge comes forward", () => {
    const map = scene();
    const cut = skyCut(map);
    expect(cut).toBeCloseTo(20 / 255 + 0.04, 5);
    expect(foregroundAlpha(20, cut)).toBe(0);
    expect(foregroundAlpha(90, cut)).toBe(255);
  });

  test("never cuts beyond 0.6, even when the top rows are near", () => {
    const map: DepthMap = { data: new Uint8Array(100).fill(250), h: 10, w: 10 };
    expect(skyCut(map)).toBe(0.6);
  });
});

describe("cutAt", () => {
  test("puts the tapped point and everything nearer in front", () => {
    const map = scene();
    // Tap the ridge row (y = 10 of 0…19).
    const cut = cutAt(map, 0.5, 10 / 19);
    expect(foregroundAlpha(90, cut)).toBe(255);
    expect(foregroundAlpha(200, cut)).toBe(255);
    expect(foregroundAlpha(20, cut)).toBe(0);
  });

  test("reads the neighbourhood median, not a single noisy pixel", () => {
    const map = scene();
    map.data[15 * 10 + 5] = 0;
    const cut = cutAt(map, 5 / 9, 15 / 19);
    expect(foregroundAlpha(200, cut)).toBe(255);
    expect(foregroundAlpha(90, cut)).toBe(0);
  });

  test("clamps taps outside the image to its edge", () => {
    const map = scene();
    expect(cutAt(map, -1, -1)).toBe(cutAt(map, 0, 0));
    expect(cutAt(map, 2, 2)).toBe(cutAt(map, 1, 1));
  });
});

describe("foregroundMask", () => {
  test("is white with the foreground coverage in alpha", () => {
    const map = scene();
    const mask = foregroundMask(map, skyCut(map));
    expect(mask.length).toBe(10 * 20 * 4);
    // sky pixel
    expect([...mask.subarray(0, 4)]).toEqual([255, 255, 255, 0]);
    // ground pixel
    const o = (15 * 10 + 3) * 4;
    expect([...mask.subarray(o, o + 4)]).toEqual([255, 255, 255, 255]);
  });

  test("softens the edge around the cut", () => {
    const cut = 100 / 255;
    expect(foregroundAlpha(100, cut)).toBe(128);
    expect(foregroundAlpha(97, cut)).toBeGreaterThan(0);
    expect(foregroundAlpha(97, cut)).toBeLessThan(128);
  });
});
