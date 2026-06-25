/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { EXPORT_FORMATS } from "@/theme/core/export-formats";
import { FEED_MASTER, stripGeometry } from "./geometry";
import { SLIDE_H, SLIDE_W } from "./types";

describe("carousel feed master", () => {
  test("SLIDE_W/SLIDE_H are the 1080×1350 feed master (single source of truth)", () => {
    expect(SLIDE_W).toBe(1080);
    expect(SLIDE_H).toBe(1350);
    expect(SLIDE_W).toBe(EXPORT_FORMATS["instagram-feed"].width);
    expect(SLIDE_H).toBe(EXPORT_FORMATS["instagram-feed"].height);
    expect(FEED_MASTER).toBe(EXPORT_FORMATS["instagram-feed"]);
  });
});

describe("stripGeometry", () => {
  test("derives slide + strip dims from the feed format and count", () => {
    const g = stripGeometry(EXPORT_FORMATS["instagram-feed"], 3);
    expect(g.slideW).toBe(1080);
    expect(g.slideH).toBe(1350);
    expect(g.stripW).toBe(3240);
    expect(g.bucket).toBe("feed");
    expect(g.safe).toEqual(EXPORT_FORMATS["instagram-feed"].safe);
    expect(g.format).toBe(EXPORT_FORMATS["instagram-feed"]);
  });

  test("a taller/cover format keeps slideW but grows slideH; strip = count × slideW", () => {
    const g = stripGeometry(EXPORT_FORMATS["instagram-story"], 4);
    expect(g.slideW).toBe(1080);
    expect(g.slideH).toBe(1920);
    expect(g.stripW).toBe(4320);
    expect(g.bucket).toBe("story");
  });

  test("a landscape format widens each slide (strip scales with slideW)", () => {
    const g = stripGeometry(EXPORT_FORMATS["x-landscape"], 3);
    expect(g.slideW).toBe(1600);
    expect(g.slideH).toBe(900);
    expect(g.stripW).toBe(4800);
    expect(g.bucket).toBe("landscape");
  });
});
