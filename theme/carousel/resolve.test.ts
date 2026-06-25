/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { readableOn } from "./resolve";

describe("readableOn", () => {
  test("picks white text on dark fills, dark text on light fills", () => {
    expect(readableOn("#000000")).toBe("#ffffff");
    expect(readableOn("#ffffff")).toBe("#0a0a0a");
    expect(readableOn("#1a1714")).toBe("#ffffff");
    expect(readableOn("#e8c39e")).toBe("#0a0a0a");
  });

  test("expands 3-digit shorthand before measuring luminance", () => {
    // Regression: "#000" must read as black (white text), not fall through the
    // "too short" guard and wrongly return a dark colour.
    expect(readableOn("#000")).toBe("#ffffff");
    expect(readableOn("#fff")).toBe("#0a0a0a");
    expect(readableOn("#000")).toBe(readableOn("#000000"));
    expect(readableOn("#fff")).toBe(readableOn("#ffffff"));
  });

  test("reads the rgb channels of an 8-digit (alpha) hex, ignoring alpha", () => {
    expect(readableOn("#000000ff")).toBe("#ffffff");
    expect(readableOn("#ffffff00")).toBe("#0a0a0a");
  });
});
