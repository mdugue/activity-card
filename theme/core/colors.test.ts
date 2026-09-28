/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import type { ExtractedPalette, PaletteTheme } from "@/lib/palette";
import {
  coerceColorChoice,
  colorChoiceId,
  resolveColors,
  schemeFromPalette,
} from "@/theme/core/colors";
import type { ColorChoice } from "@/theme/core/colors";

const paletteTheme = (accent: string): PaletteTheme => ({
  accent,
  accent2: "#222222",
  background: "#101010",
  body: "#cccccc",
  headline: "#ffffff",
  onAccent: "#000000",
  variant: "vibrant",
});

const PALETTE: ExtractedPalette = {
  swatches: [],
  themes: {
    complementary: paletteTheme("#00ff00"),
    muted: paletteTheme("#884444"),
    pure: paletteTheme("#ffffff"),
    spectrum: paletteTheme("#0000ff"),
    vibrant: paletteTheme("#ff0000"),
  },
};

const DEFAULT = { primary: "#c45a2c" };

describe("resolveColors", () => {
  test("a preset choice resolves to its own scheme", () => {
    const choice: ColorChoice = {
      kind: "preset",
      scheme: { primary: "#123456", secondary: "#654321" },
    };
    expect(resolveColors(choice, DEFAULT, PALETTE)).toEqual(choice.scheme);
  });

  test("a photo choice resolves through the palette with full roles", () => {
    const out = resolveColors(
      { kind: "photo", variant: "vibrant" },
      DEFAULT,
      PALETTE
    );
    expect(out.primary).toBe("#ff0000");
    expect(out.secondary).toBe("#222222");
    expect(out.onPrimary).toBe("#000000");
    expect(out.roles).toEqual({
      background: "#101010",
      body: "#cccccc",
      headline: "#ffffff",
    });
  });

  test("a photo choice without a palette falls back to the theme default", () => {
    const out = resolveColors(
      { kind: "photo", variant: "muted" },
      DEFAULT,
      null
    );
    expect(out).toEqual(DEFAULT);
  });
});

describe("coerceColorChoice", () => {
  test("accepts a valid photo choice", () => {
    expect(coerceColorChoice({ kind: "photo", variant: "muted" })).toEqual({
      kind: "photo",
      variant: "muted",
    });
  });

  test("rejects an unknown variant", () => {
    expect(coerceColorChoice({ kind: "photo", variant: "neon" })).toBeNull();
  });

  test("accepts a valid preset and drops non-hex extras", () => {
    const out = coerceColorChoice({
      kind: "preset",
      scheme: {
        onPrimary: "#ffffff",
        primary: "#abc",
        secondary: "javascript:alert(1)",
      },
    });
    expect(out).toEqual({
      kind: "preset",
      scheme: { onPrimary: "#ffffff", primary: "#abc", secondary: undefined },
    });
  });

  test("rejects a preset whose primary is not a hex literal", () => {
    expect(
      coerceColorChoice({
        kind: "preset",
        scheme: { primary: "url(javascript:x)" },
      })
    ).toBeNull();
  });

  test("rejects garbage shapes", () => {
    for (const raw of [null, 1, "x", [], {}, { kind: "nope" }]) {
      expect(coerceColorChoice(raw)).toBeNull();
    }
  });
});

describe("colorChoiceId", () => {
  test("distinguishes sources and pairs", () => {
    const a = colorChoiceId({ kind: "photo", variant: "pure" });
    const b = colorChoiceId({ kind: "preset", scheme: { primary: "#fff" } });
    const c = colorChoiceId({
      kind: "preset",
      scheme: { primary: "#fff", secondary: "#000" },
    });
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe("schemeFromPalette", () => {
  test("maps each variant's accents and roles", () => {
    const s = schemeFromPalette(PALETTE, "spectrum");
    expect(s.primary).toBe("#0000ff");
    expect(s.roles?.headline).toBe("#ffffff");
  });
});
