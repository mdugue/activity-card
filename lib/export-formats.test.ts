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
  placeContent,
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

describe("placeContent", () => {
  test("default 4:5 fills the canvas (scale ~1, no offset of note)", () => {
    // Feed has small symmetric insets → content scaled to the inset box.
    const f = getFormat("instagram-feed");
    const p = placeContent(f);
    // box is 984×1254; content 1080×1350 fits by width (scale 984/1080),
    // leaving a little vertical slack → x sits at the inset, y is centred.
    expect(p.scale).toBeCloseTo((1080 - 96) / 1080, 5);
    expect(p.w).toBeCloseTo(984, 3);
    expect(p.x).toBeCloseTo(48, 3);
    expect(p.y).toBeGreaterThan(48);
  });

  test("story 'lower' anchors the block toward the bottom of the safe box", () => {
    const f = getFormat("instagram-story");
    const p = placeContent(f);
    const box = contentBox(f);
    // bottom edge of the content sits at the bottom of the safe box
    expect(p.y + p.h).toBeCloseTo(box.y + box.h, 3);
  });

  test("tiktok 'upper' anchors the block to the top of the safe box", () => {
    const f = getFormat("tiktok");
    const p = placeContent(f);
    expect(p.y).toBeCloseTo(f.safe.top, 3);
  });

  test("strava centres the block vertically and keeps it off the side edges", () => {
    const f = getFormat("strava");
    const p = placeContent(f);
    const box = contentBox(f);
    expect(p.y - box.y).toBeCloseTo(box.y + box.h - (p.y + p.h), 1);
    // never touches the literal canvas edge
    expect(p.x).toBeGreaterThanOrEqual(f.safe.left);
    expect(p.x + p.w).toBeLessThanOrEqual(f.width - f.safe.right + 0.01);
  });

  test("content never overflows the safe box", () => {
    for (const id of ALL_IDS) {
      const f = getFormat(id);
      const p = placeContent(f);
      const box = contentBox(f);
      expect(p.w).toBeLessThanOrEqual(box.w + 0.01);
      expect(p.h).toBeLessThanOrEqual(box.h + 0.01);
      expect(p.scale).toBeGreaterThan(0);
    }
  });
});
