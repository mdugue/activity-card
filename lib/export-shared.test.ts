/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { effortDateSlug } from "@/lib/export-shared";

describe("effortDateSlug", () => {
  test("keeps a plain ISO date untouched", () => {
    expect(effortDateSlug("2026-05-18")).toBe("2026-05-18");
  });

  test("strips time-of-day characters from a full timestamp", () => {
    expect(effortDateSlug("2026-05-18T07:00:00Z")).toBe("2026-05-18070000");
  });

  test("falls back to 'undated' for empty or digit-free input", () => {
    expect(effortDateSlug("")).toBe("undated");
    expect(effortDateSlug("no digits here")).toBe("undated");
  });
});
