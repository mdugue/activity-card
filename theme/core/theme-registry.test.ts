/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { SAMPLE_RIDE } from "@/components/app/sample-data";
import { ALTITUDE_PARAMS } from "@/lib/altitude";
import { CAROUSEL_THEMES } from "@/theme/carousel/registry";
import { resolveDeckStyle } from "@/theme/carousel/resolve";
import { coerceConfig } from "@/theme/core/params/resolve";
import type { ThemeBase } from "@/theme/core/theme-contract";
import { OPTION_GLYPHS } from "@/theme/editor/param-control";
import { SINGLE_CARD_THEMES } from "@/theme/single-card";

// Both families express a theme through the same descriptor core (ThemeBase),
// so one set of invariants covers every theme the app can show.
const ALL_THEMES: ThemeBase[] = [
  ...Object.values(SINGLE_CARD_THEMES),
  ...Object.values(CAROUSEL_THEMES),
];

describe("theme registries", () => {
  for (const theme of ALL_THEMES) {
    test(`${theme.id}: param ids are unique and present in defaults`, () => {
      const ids = theme.params.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        expect(id in theme.defaults).toBe(true);
      }
    });

    test(`${theme.id}: defaults round-trip through coerceConfig`, () => {
      expect(
        coerceConfig(theme.defaults, theme.params, theme.defaults)
      ).toEqual(theme.defaults);
    });

    test(`${theme.id}: each param default is a valid option / in range`, () => {
      for (const p of theme.params) {
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

    test(`${theme.id}: colour policy has a valid default scheme`, () => {
      expect(theme.colors.default.primary).toMatch(/^#/);
    });
  }

  test("the two families' id spaces are tracked independently", () => {
    // STRATA deliberately exists in both (shared config key); no accidental
    // single-card id may shadow a carousel id beyond that.
    const single = new Set(Object.keys(SINGLE_CARD_THEMES));
    const overlap = Object.keys(CAROUSEL_THEMES).filter((id) => single.has(id));
    expect(overlap).toEqual(["strata"]);
  });

  // Trace and Ascent carry the Dawn/Dusk pairing as an ATMOSPHERE param: dusk
  // swaps the whole deck (palette, light/dark, fonts) via `resolveStyle`, but a
  // user-picked accent must survive the swap.
  for (const id of ["trace", "ascent"] as const) {
    const theme = CAROUSEL_THEMES[id];
    const base = resolveDeckStyle(
      theme.look,
      theme.label,
      theme.colors.default
    );

    test(`${id}: dawn atmosphere keeps the base style untouched`, () => {
      expect(theme.resolveStyle?.(base, { atmosphere: "dawn" })).toEqual(base);
    });

    test(`${id}: dusk atmosphere swaps onto the dark look`, () => {
      const dusk = theme.resolveStyle?.(base, { atmosphere: "dusk" });
      expect(dusk?.dark).toBe(true);
      expect(dusk?.background).not.toBe(base.background);
      expect(dusk?.accent).not.toBe(base.accent);
      expect(dusk?.fonts).not.toEqual(base.fonts);
    });

    test(`${id}: a user-picked accent survives the dusk swap`, () => {
      const userStyle = resolveDeckStyle(theme.look, theme.label, {
        primary: "#123456",
        secondary: "#654321",
        onPrimary: "#fafafa",
      });
      const dusk = theme.resolveStyle?.(userStyle, { atmosphere: "dusk" });
      expect(dusk?.accent).toBe("#123456");
      expect(dusk?.accent2).toBe("#654321");
      expect(dusk?.onAccent).toBe("#fafafa");
    });
  }

  test("altitude headline offers only available metrics + none", () => {
    const p = ALTITUDE_PARAMS.find((x) => x.id === "claim");
    if (p && p.kind === "select" && typeof p.options === "function") {
      const ids = p
        .options({ data: SAMPLE_RIDE, palette: null })
        .map((o) => o.id);
      expect(ids).toContain("none");
      expect(ids).toContain("distance");
    }
  });

  // The rich select leads every headline option with a duotone metric icon;
  // each option must name a glyph the param control's icon map covers.
  test("altitude headline options carry editor-renderable glyphs", () => {
    const p = ALTITUDE_PARAMS.find((x) => x.id === "claim");
    if (p && p.kind === "select" && typeof p.options === "function") {
      for (const o of p.options({ data: SAMPLE_RIDE, palette: null })) {
        expect(o.glyph).toBeDefined();
        expect(OPTION_GLYPHS[o.glyph as string]).toBeDefined();
      }
    }
  });
});
