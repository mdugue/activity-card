/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import {
  isDrawableSeries,
  legSeries,
  MIN_PROFILE_POINTS,
  NO_PROFILE_SIGNAL,
  profileSignal,
  segmentProfileMetric,
} from "@/lib/profile-signal";
import type {
  ProfileSignal,
  ProfileSource,
  SegmentProfileSource,
} from "@/lib/profile-signal";

describe("isDrawableSeries", () => {
  test.each([
    [undefined, false],
    [null, false],
    [[], false],
    [[1], false],
    [[1, 2], true],
    [[1, 2, 3], true],
  ] as const)("%p → %p", (series, expected) => {
    expect(isDrawableSeries(series)).toBe(expected);
  });

  test("the threshold is two points", () => {
    expect(MIN_PROFILE_POINTS).toBe(2);
  });
});

describe("profileSignal (single activity)", () => {
  const cases: [string, ProfileSource, ProfileSignal][] = [
    [
      "elevation wins when drawable",
      {
        elevationProfile: [1, 2, 3],
        lapPacesPer100m: [1, 2],
        paceProfile: [9, 9],
      },
      { label: "ELEVATION", mode: "elevation", series: [1, 2, 3] },
    ],
    [
      "pace when elevation is absent",
      { paceProfile: [4, 5, 6] },
      { label: "PACE", mode: "pace", series: [4, 5, 6] },
    ],
    [
      "degenerate elevation (1 point) does not shadow pace",
      { elevationProfile: [100], paceProfile: [4, 5, 6, 7] },
      { label: "PACE", mode: "pace", series: [4, 5, 6, 7] },
    ],
    [
      "empty elevation does not shadow pace",
      { elevationProfile: [], paceProfile: [4, 5] },
      { label: "PACE", mode: "pace", series: [4, 5] },
    ],
    [
      "lap-only pool swim → laps",
      { lapPacesPer100m: [110, 112, 108] },
      { label: "LAPS", mode: "laps", series: [110, 112, 108] },
    ],
    [
      "degenerate elevation + degenerate pace fall through to laps",
      { elevationProfile: [5], lapPacesPer100m: [1, 2], paceProfile: [7] },
      { label: "LAPS", mode: "laps", series: [1, 2] },
    ],
    ["nothing at all → none", {}, NO_PROFILE_SIGNAL],
    [
      "only degenerate series → none",
      { elevationProfile: [1], lapPacesPer100m: [3], paceProfile: [] },
      NO_PROFILE_SIGNAL,
    ],
  ];
  test.each(cases)("%s", (_name, input, expected) => {
    expect(profileSignal(input)).toEqual(expected);
  });
});

describe("segmentProfileMetric + legSeries (multi-activity)", () => {
  const swim: SegmentProfileSource = { paceProfile: [120, 118] };
  const bike: SegmentProfileSource = {
    elevationProfile: [10, 30, 20],
    paceProfile: [100, 90],
  };
  const flatRun: SegmentProfileSource = {
    elevationProfile: [5],
    paceProfile: [300, 310],
  };

  const cases: [
    string,
    SegmentProfileSource[],
    "elevation" | "pace",
    (number[] | null)[],
  ][] = [
    [
      "any leg with drawable elevation → elevation; legs without it are skipped",
      [swim, bike, flatRun],
      "elevation",
      [null, [10, 30, 20], null],
    ],
    [
      "degenerate elevation on every leg → pace",
      [swim, flatRun],
      "pace",
      [
        [120, 118],
        [300, 310],
      ],
    ],
    ["no legs → pace, nothing drawable", [], "pace", []],
    [
      "legs with nothing drawable → pace, all skipped",
      [{ paceProfile: [1] }, {}],
      "pace",
      [null, null],
    ],
  ];
  test.each(cases)("%s", (_name, segs, metric, series) => {
    expect(segmentProfileMetric(segs)).toBe(metric);
    expect(segs.map((s) => legSeries(s, metric))).toEqual(series);
  });
});
