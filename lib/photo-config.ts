// PHOTO theme parameters. The single user-facing knob is the colour *strategy*
// (the palette variant) — a fixed choice whose CONSEQUENCE (the actual colours)
// is computed downstream from the photo. The picker previews each strategy's
// real accent swatch via the pre-built presets in `ExtractedPalette.themes`
// (`lib/palette.ts`), so it's a calculated-`options(ctx)` parameter with a static
// id space.

import type { PaletteVariant } from "@/lib/palette";
import type { ParamDef } from "@/lib/params/kinds";

export interface PhotoConfig extends Record<string, unknown> {
  /** Colour-derivation strategy ("mood") for the photo-adaptive palette. */
  palette: PaletteVariant;
}

export const DEFAULT_PHOTO_CONFIG: PhotoConfig = { palette: "vibrant" };

const VARIANT_ORDER: PaletteVariant[] = [
  "vibrant",
  "muted",
  "complementary",
  "spectrum",
  "pure",
];

const VARIANT_META: Record<PaletteVariant, { label: string; blurb: string }> = {
  vibrant: { label: "Vibrant", blurb: "photo-forward" },
  muted: { label: "Muted", blurb: "editorial calm" },
  complementary: { label: "Complement", blurb: "designed contrast" },
  spectrum: { label: "Spectrum", blurb: "every swatch in play" },
  pure: { label: "Pure", blurb: "type only · ignores photo" },
};

export const PHOTO_PARAMS: ParamDef[] = [
  {
    id: "palette",
    group: "style",
    label: "COLOUR",
    kind: "select",
    default: DEFAULT_PHOTO_CONFIG.palette,
    optionIds: VARIANT_ORDER,
    // Calculated options: each strategy shows the real accent it would produce
    // from this photo (cheap — all five presets are pre-built in one pass).
    options: (ctx) =>
      VARIANT_ORDER.map((v) => ({
        id: v,
        label: VARIANT_META[v].label,
        hint: VARIANT_META[v].blurb,
        swatch: ctx.palette ? ctx.palette.themes[v].accent : undefined,
      })),
  },
];
