/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  contentBox,
  DEFAULT_FORMAT_ID,
  EXPORT_FORMATS,
  type ExportFormatId,
  FORMAT_ORDER,
  frameFit,
  getFormat,
  isDefaultFormat,
  isExportFormatId,
} from "@/lib/export-formats";

const ALL_IDS = Object.keys(EXPORT_FORMATS) as ExportFormatId[];

describe("registry", () => {
  test("ids are self-consistent and dimensions positive", () => {
    for (const id of ALL_IDS) {
      const f = EXPORT_FORMATS[id];
      expect(f.id).toBe(id);
      expect(f.width).toBeGreaterThan(0);
      expect(f.height).toBeGreaterThan(0);
    }
  });

  test("FORMAT_ORDER lists every format exactly once", () => {
    expect([...FORMAT_ORDER].sort()).toEqual([...ALL_IDS].sort());
  });

  test("default format is the 4:5 master at 1080×1350", () => {
    const f = getFormat(DEFAULT_FORMAT_ID);
    expect(f.width).toBe(1080);
    expect(f.height).toBe(1350);
    expect(isDefaultFormat(DEFAULT_FORMAT_ID)).toBe(true);
    expect(isDefaultFormat("instagram-story")).toBe(false);
  });

  test("safe insets never exceed the canvas", () => {
    for (const id of ALL_IDS) {
      const f = EXPORT_FORMATS[id];
      expect(f.safe.left + f.safe.right).toBeLessThan(f.width);
      expect(f.safe.top + f.safe.bottom).toBeLessThan(f.height);
    }
  });

  test("isExportFormatId guards unknown ids", () => {
    expect(isExportFormatId("strava")).toBe(true);
    expect(isExportFormatId("nope")).toBe(false);
  });
});

describe("contentBox", () => {
  test("subtracts the insets from the canvas", () => {
    const box = contentBox(getFormat("strava"));
    // strava: 1080×1920, insets t300 r88 b230 l88
    expect(box.x).toBe(88);
    expect(box.y).toBe(300);
    expect(box.w).toBe(1080 - 88 - 88);
    expect(box.h).toBe(1920 - 300 - 230);
  });
});

describe("frameFit", () => {
  test("9:16 keeps the intact 4:5 card at full width (scale 1), centred", () => {
    // 1080-wide target → the 1080×1350 master fills the width unscaled and the
    // photo extends top/bottom. This is the exact Feed composition preserved.
    // (whatsapp-status uses 'center' placement.)
    const f = getFormat("whatsapp-status");
    const p = frameFit(f);
    expect(p.scale).toBeCloseTo(1, 6);
    expect(p.w).toBeCloseTo(1080, 3);
    expect(p.x).toBeCloseTo(0, 3);
    expect(p.y).toBeCloseTo((1920 - 1350) / 2, 3);
  });

  test("16:9 fits by height; the card never overflows, leaving side bands", () => {
    const f = getFormat("x-landscape");
    const p = frameFit(f);
    expect(p.scale).toBeCloseTo(900 / 1350, 6);
    expect(p.h).toBeCloseTo(900, 3);
    expect(p.x).toBeGreaterThan(0); // photo bleeds the horizontal leftover
    expect(p.y).toBeCloseTo(0, 3);
  });

  test("placement anchors on the leftover axis (upper/lower/center)", () => {
    const lower = frameFit(getFormat("instagram-story")); // 'lower'
    expect(lower.y).toBeCloseTo(1920 - 1350, 3);
    const upper = frameFit(getFormat("tiktok")); // 'upper'
    expect(upper.y).toBeCloseTo(0, 3);
  });

  test("contains the full frame without cropping for every format", () => {
    for (const id of ALL_IDS) {
      const f = getFormat(id);
      const p = frameFit(f);
      expect(p.w).toBeLessThanOrEqual(f.width + 0.01);
      expect(p.h).toBeLessThanOrEqual(f.height + 0.01);
      expect(p.scale).toBeGreaterThan(0);
    }
  });
});
