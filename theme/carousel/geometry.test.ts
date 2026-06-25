/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { EXPORT_FORMATS, mergeSafe } from "@/theme/core/export-formats";
import {
  CAROUSEL_NATURAL_MARGIN,
  FEED_MASTER,
  slideFormat,
  slideSafe,
  stripFormat,
  stripGeometry,
} from "./geometry";
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

describe("strip / slide frames", () => {
  test("stripFormat widens the frame to the whole strip; slideFormat keeps one slide", () => {
    const feed = EXPORT_FORMATS["instagram-feed"];
    expect(stripFormat(feed, 4).width).toBe(4320);
    expect(stripFormat(feed, 4).height).toBe(1350);
    expect(slideFormat(feed).width).toBe(1080);
    expect(slideFormat(feed).height).toBe(1350);
  });

  test("slideSafe is the format's per-slide keep-out", () => {
    expect(slideSafe(EXPORT_FORMATS["instagram-feed"])).toEqual(
      EXPORT_FORMATS["instagram-feed"].safe
    );
    expect(slideSafe(EXPORT_FORMATS["instagram-story"])).toEqual(
      EXPORT_FORMATS["instagram-story"].safe
    );
  });

  test("feed floors the panel to its natural 90 margin (unchanged from SLIDE_PAD)", () => {
    // The panel pads by max(platform safe, natural) — at the feed master the
    // 48px platform inset loses to the 90px natural margin, so it stays 90.
    const merged = mergeSafe(slideSafe(EXPORT_FORMATS["instagram-feed"]), {
      top: CAROUSEL_NATURAL_MARGIN,
      right: CAROUSEL_NATURAL_MARGIN,
      bottom: CAROUSEL_NATURAL_MARGIN,
      left: CAROUSEL_NATURAL_MARGIN,
    });
    expect(merged).toEqual({ top: 90, right: 90, bottom: 90, left: 90 });
  });

  test("a tall Story pushes content past the 90 margin (chrome wins)", () => {
    const merged = mergeSafe(slideSafe(EXPORT_FORMATS["instagram-story"]), {
      top: CAROUSEL_NATURAL_MARGIN,
      right: CAROUSEL_NATURAL_MARGIN,
      bottom: CAROUSEL_NATURAL_MARGIN,
      left: CAROUSEL_NATURAL_MARGIN,
    });
    // Story top/bottom keep-out (220) exceeds 90; the sides (64) lose to 90.
    expect(merged.top).toBe(220);
    expect(merged.bottom).toBe(220);
    expect(merged.left).toBe(90);
    expect(merged.right).toBe(90);
  });
});
