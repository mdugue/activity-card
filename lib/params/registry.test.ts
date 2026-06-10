/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { SAMPLE_RIDE } from "@/components/app/sample-data";
import { resolveThemeConfig, THEME_PARAM_SPECS } from "@/lib/params/registry";

describe("theme param specs", () => {
  for (const [key, spec] of Object.entries(THEME_PARAM_SPECS)) {
    test(`${key}: param ids are unique and present in defaults`, () => {
      const ids = spec.params.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(id in spec.defaults).toBe(true);
      }
    });

    test(`${key}: defaults round-trip through resolveThemeConfig`, () => {
      expect(resolveThemeConfig(key, spec.defaults)).toEqual(spec.defaults);
    });

    test(`${key}: each default is a valid option / in range`, () => {
      for (const p of spec.params) {
        if (p.kind === "slider") {
          expect(p.default).toBeGreaterThanOrEqual(p.min);
          expect(p.default).toBeLessThanOrEqual(p.max);
        } else if (p.kind === "segmented" || p.kind === "select") {
          let ids: string[] | null = null;
          if (p.optionIds) {
            ids = [...p.optionIds];
          } else if (Array.isArray(p.options)) {
            ids = p.options.map((o) => o.id);
          }
          if (ids) {
            expect(ids).toContain(p.default);
          }
        }
      }
    });
  }

  test("returns {} for an unknown theme key", () => {
    expect(resolveThemeConfig("nope", { a: 1 })).toEqual({});
  });

  test("altitude headline offers only available metrics + none", () => {
    const p = THEME_PARAM_SPECS.altitude.params.find((x) => x.id === "claim");
    if (p && p.kind === "select" && typeof p.options === "function") {
      const ids = p
        .options({ data: SAMPLE_RIDE, palette: null })
        .map((o) => o.id);
      expect(ids).toContain("none");
      expect(ids).toContain("distance");
    }
  });
});
