import { describe, expect, test } from "bun:test";

import {
  ART_PARAMS,
  artConfigFrom,
  artPlacement,
  boundsCentre,
  clampArtPlacement,
  hasArtPlacement,
  placePoints,
} from "./art-placement";

describe("art placement", () => {
  test("defaults place the graphic as designed", () => {
    expect(artPlacement({}, 1080, 1350)).toEqual({ scale: 1, x: 0, y: 0 });
  });

  test("config percentages become canvas px and back", () => {
    const place = artPlacement(
      { artScale: 150, artX: 10, artY: -20 },
      1080,
      1350
    );
    expect(place).toEqual({ scale: 1.5, x: 108, y: -270 });
    expect(artConfigFrom(place, 1080, 1350)).toEqual({
      artScale: 150,
      artX: 10,
      artY: -20,
    });
  });

  test("a placement is clamped to the params' ranges", () => {
    const wild = { scale: 9, x: 5000, y: -5000 };
    expect(clampArtPlacement(wild, 1000, 1000)).toEqual({
      scale: 2.2,
      x: 500,
      y: -500,
    });
    expect(artConfigFrom(wild, 1000, 1000)).toEqual({
      artScale: 220,
      artX: 50,
      artY: -50,
    });
  });

  test("points scale about the origin, then shift", () => {
    const moved = placePoints(
      [
        [0, 0],
        [10, 10],
      ],
      { scale: 2, x: 5, y: -5 },
      [5, 5]
    );
    expect(moved).toEqual([
      [0, -10],
      [20, 10],
    ]);
  });

  test("the bounds centre falls back on an empty set", () => {
    expect(
      boundsCentre(
        [
          [0, 2],
          [10, 8],
        ],
        [0, 0]
      )
    ).toEqual([5, 5]);
    expect(boundsCentre([], [3, 4])).toEqual([3, 4]);
  });

  test("only a theme declaring every art param is movable", () => {
    expect(hasArtPlacement(ART_PARAMS)).toBe(true);
    expect(hasArtPlacement(ART_PARAMS.slice(1))).toBe(false);
  });
});
