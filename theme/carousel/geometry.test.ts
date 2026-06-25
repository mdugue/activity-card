/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { EXPORT_FORMATS, mergeSafe } from "@/theme/core/export-formats";
import {
  CAROUSEL_NATURAL_MARGIN,
  carouselFormat,
  stripFormat,
  stripGeometry,
} from "./geometry";

const PAD = {
  top: CAROUSEL_NATURAL_MARGIN,
  right: CAROUSEL_NATURAL_MARGIN,
  bottom: CAROUSEL_NATURAL_MARGIN,
  left: CAROUSEL_NATURAL_MARGIN,
};

describe("stripGeometry", () => {
  test("slide dims = the format; strip = count × slideW", () => {
    expect(stripGeometry(EXPORT_FORMATS["instagram-feed"], 3)).toEqual({
      slideW: 1080,
      slideH: 1350,
      stripW: 3240,
    });
    expect(stripGeometry(EXPORT_FORMATS["x-landscape"], 3)).toEqual({
      slideW: 1600,
      slideH: 900,
      stripW: 4800,
    });
  });

  test("stripFormat widens the frame to the whole strip", () => {
    expect(stripFormat(EXPORT_FORMATS["instagram-feed"], 4).width).toBe(4320);
  });
});

test("carouselFormat passes offered buckets, clamps others to feed", () => {
  expect(carouselFormat(EXPORT_FORMATS["instagram-story"]).id).toBe(
    "instagram-story"
  );
  expect(carouselFormat(EXPORT_FORMATS.tiktok).id).toBe("instagram-feed");
});

describe("panel safe-floor (mergeSafe with the natural margin)", () => {
  test("feed floors to 90 — its 48 platform inset loses", () => {
    expect(mergeSafe(EXPORT_FORMATS["instagram-feed"].safe, PAD)).toEqual({
      top: 90,
      right: 90,
      bottom: 90,
      left: 90,
    });
  });

  test("a tall Story floors top/bottom to its 220 chrome, sides to 90", () => {
    const m = mergeSafe(EXPORT_FORMATS["instagram-story"].safe, PAD);
    expect([m.top, m.bottom, m.left, m.right]).toEqual([220, 220, 90, 90]);
  });
});
