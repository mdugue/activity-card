/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  formatClock,
  formatDate,
  formatDateUpper,
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";

const DASH = "—";

describe("formatDuration", () => {
  test("renders hours and minutes, dropping seconds", () => {
    expect(formatDuration(3600)).toBe("1h 0m");
    expect(formatDuration(3661)).toBe("1h 1m");
    expect(formatDuration(7384)).toBe("2h 3m");
  });

  test("renders minutes and seconds when under an hour", () => {
    expect(formatDuration(65)).toBe("1m 5s");
    expect(formatDuration(599)).toBe("9m 59s");
  });

  test("renders bare seconds when under a minute", () => {
    expect(formatDuration(5)).toBe("5s");
    expect(formatDuration(59)).toBe("59s");
  });

  test("returns a dash for missing, zero, or non-finite input", () => {
    expect(formatDuration(undefined)).toBe(DASH);
    expect(formatDuration(0)).toBe(DASH);
    expect(formatDuration(-10)).toBe(DASH);
    expect(formatDuration(Number.NaN)).toBe(DASH);
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe(DASH);
  });
});

describe("formatClock", () => {
  test("pads minutes and seconds when hours are present", () => {
    expect(formatClock(5025)).toBe("1:23:45");
    expect(formatClock(3661)).toBe("1:01:01");
  });

  test("omits the hour segment under an hour", () => {
    expect(formatClock(318)).toBe("5:18");
    expect(formatClock(9)).toBe("0:09");
  });

  test("returns a dash for invalid input", () => {
    expect(formatClock(undefined)).toBe(DASH);
    expect(formatClock(0)).toBe(DASH);
    expect(formatClock(Number.NaN)).toBe(DASH);
  });
});

describe("formatPaceMin", () => {
  test("converts float minutes to m:ss", () => {
    expect(formatPaceMin(4.95)).toBe("4:57");
    expect(formatPaceMin(5)).toBe("5:00");
    expect(formatPaceMin(3.5)).toBe("3:30");
  });

  test("rounds to the nearest second and carries into the minute", () => {
    // 4.999 min → 299.94s → rounds to 300s → 5:00, not 4:60
    expect(formatPaceMin(4.999)).toBe("5:00");
  });

  test("returns a dash for invalid input", () => {
    expect(formatPaceMin(undefined)).toBe(DASH);
    expect(formatPaceMin(0)).toBe(DASH);
  });
});

describe("formatPaceSec", () => {
  test("converts seconds-per-100m to m:ss", () => {
    expect(formatPaceSec(118)).toBe("1:58");
    expect(formatPaceSec(90)).toBe("1:30");
    expect(formatPaceSec(60)).toBe("1:00");
  });

  test("returns a dash for invalid input", () => {
    expect(formatPaceSec(undefined)).toBe(DASH);
    expect(formatPaceSec(0)).toBe(DASH);
  });
});

describe("formatNumber", () => {
  test("respects the digits argument", () => {
    expect(formatNumber(1.234_56, 2)).toBe("1.23");
    expect(formatNumber(42)).toBe("42");
    expect(formatNumber(42.6)).toBe("43");
  });

  test("returns a dash for missing or non-finite input", () => {
    expect(formatNumber(undefined)).toBe(DASH);
    expect(formatNumber(Number.NaN)).toBe(DASH);
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe(DASH);
  });
});

describe("formatDate", () => {
  test("formats an ISO date as a long US date", () => {
    expect(formatDate("2026-05-18")).toBe("May 18, 2026");
  });

  test("returns an empty string for missing input", () => {
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });

  test("echoes unparseable input verbatim", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  test("formatDateUpper uppercases the formatted date", () => {
    expect(formatDateUpper("2026-05-18")).toBe("MAY 18, 2026");
  });
});
