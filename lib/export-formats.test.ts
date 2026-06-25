/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  contentBox,
  DEFAULT_FORMAT_ID,
  EXPORT_FORMATS,
  type ExportFormatId,
  FORMAT_ORDER,
  getFormat,
  isDefaultFormat,
  isExportFormatId,
  mergeSafe,
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
    // strava: 1080×1920, insets t160 r64 b220 l64
    expect(box.x).toBe(64);
    expect(box.y).toBe(160);
    expect(box.w).toBe(1080 - 64 - 64);
    expect(box.h).toBe(1920 - 160 - 220);
  });
});

describe("mergeSafe", () => {
  test("a theme's own margin wins when it exceeds the safe inset", () => {
    // Feed: 48 px safe. A theme authored with wider chrome keeps its margins —
    // this is what keeps the 4:5 master pixel-identical to the legacy output.
    const feed = getFormat(DEFAULT_FORMAT_ID);
    const i = mergeSafe(feed.safe, {
      top: 110,
      right: 90,
      bottom: 80,
      left: 90,
    });
    expect(i).toEqual({ top: 110, right: 90, bottom: 80, left: 90 });
  });

  test("the platform safe inset floors a smaller theme margin", () => {
    // Story: tall top/bottom keep-out floors the theme's smaller vertical
    // margin, while the wider side margin (80 > 64) still wins per-side.
    const story = getFormat("instagram-story"); // t220 r64 b220 l64
    const i = mergeSafe(story.safe, {
      top: 70,
      right: 80,
      bottom: 70,
      left: 80,
    });
    expect(i).toEqual({ top: 220, right: 80, bottom: 220, left: 80 });
  });

  test("missing natural sides default to 0 (safe inset wins)", () => {
    const story = getFormat("instagram-story");
    expect(mergeSafe(story.safe)).toEqual(story.safe);
  });
});
