// The unified colour model. What a theme CONSUMES is always a resolved
// `ColorScheme`; what the user PICKS is a `ColorChoice` — a static preset
// swatch (single hue or a pair) or one of the photo-derived strategies (the
// old PhotoMood). One control serves both sources; the photo options show
// their real computed swatches and are badged as coming from the photo.

import { z } from "zod/mini";

import type {
  ExtractedPalette,
  PaletteTheme,
  PaletteVariant,
} from "@/lib/palette";

/** What a theme consumes — always resolved, never a choice. */
export interface ColorScheme {
  /** text placed ON the primary; derived via `readableOn` when absent */
  onPrimary?: string;
  primary: string;
  /** full role palette when photo-derived — the Photo theme's CSS vars;
   *  other themes ignore it */
  roles?: Pick<PaletteTheme, "background" | "body" | "headline">;
  /** optional second hue (the old accent2 / tuple presets) */
  secondary?: string;
}

/** What the user picked. Persisted (coerced on load). */
export type ColorChoice =
  | { kind: "preset"; scheme: ColorScheme }
  | { kind: "photo"; variant: PaletteVariant };

/** Per-theme colour policy (single-card descriptors and carousel tokens). */
export interface ThemeColorPolicy {
  /** the theme's own scheme — the Reset target and the no-choice fallback */
  default: ColorScheme;
  /** initial choice when the user hasn't picked (Exposure → photo:vibrant) */
  defaultChoice?: ColorChoice;
  /** themes with a fixed, designed palette hide the colour control */
  userAdjustable: boolean;
}

/** Static swatches offered to every colour-adjustable theme. Mostly singles,
 *  plus pairs — a preset may carry a second hue. (Supersedes `ACCENTS`.) */
export const PRESET_SCHEMES: ColorScheme[] = [
  { primary: "#c45a2c" },
  { primary: "#e0683a" },
  { primary: "#ff7a3c" },
  { primary: "#2f6f86", secondary: "#c4663a" },
  { primary: "#1e6fa0" },
  { primary: "#1d3a2e" },
  { primary: "#b1281a", secondary: "#1d3a2e" },
  { primary: "#a98352" },
  { primary: "#1a1714" },
  { primary: "#e8c39e" },
];

export const PALETTE_VARIANTS: PaletteVariant[] = [
  "vibrant",
  "muted",
  "complementary",
  "spectrum",
  "pure",
];

export const VARIANT_LABELS: Record<PaletteVariant, string> = {
  complementary: "Complement",
  muted: "Muted",
  pure: "Pure",
  spectrum: "Spectrum",
  vibrant: "Vibrant",
};

/** The scheme a photo-derived variant produces from an extracted palette —
 *  drives the live swatches in the colour control. The "no palette yet" case
 *  is handled by callers (`resolveColors` falls back to the theme default), so
 *  this always returns a scheme. */
export const schemeFromPalette = (
  palette: ExtractedPalette,
  variant: PaletteVariant
): ColorScheme => {
  const t = palette.themes[variant];
  return {
    onPrimary: t.onAccent,
    primary: t.accent,
    roles: { background: t.background, body: t.body, headline: t.headline },
    secondary: t.accent2,
  };
};

/**
 * Resolve the user's choice to the scheme a theme renders with. A photo-kind
 * choice without an extracted palette (photo removed, extraction in flight)
 * falls back to the theme's own default — the choice itself persists, so
 * re-adding a photo restores the dynamic colours.
 */
export const resolveColors = (
  choice: ColorChoice,
  themeDefault: ColorScheme,
  palette: ExtractedPalette | null
): ColorScheme => {
  if (choice.kind === "photo") {
    return palette ? schemeFromPalette(palette, choice.variant) : themeDefault;
  }
  return choice.scheme;
};

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/u;

const hexSchema = z.string().check(z.regex(HEX));
/** An optional hue: a hex literal, else undefined (absent or invalid). */
const optionalHexSchema = z.pipe(
  z.unknown(),
  z.transform((v) => hexSchema.safeParse(v).data)
);

/** A persisted photo-derived choice: a known palette strategy. */
const photoChoiceSchema = z.object({
  kind: z.literal("photo"),
  variant: z.enum(PALETTE_VARIANTS),
});

/** A persisted preset choice. Only `primary` must be a hex literal; the
 *  optional hues are vetted one by one (a bad one is dropped, not fatal). */
const presetChoiceSchema = z.object({
  kind: z.literal("preset"),
  scheme: z.object({
    onPrimary: optionalHexSchema,
    primary: hexSchema,
    secondary: optionalHexSchema,
  }),
});

/**
 * Coerce a raw (persisted / hand-edited) value to a valid `ColorChoice`, or
 * `null` (= "use the theme's default") when it isn't one. CSS-injection-safe:
 * preset colours must be hex literals.
 */
export const coerceColorChoice = (
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- this IS the I/O boundary parser: the persisted colour choice arrives untyped from localStorage
  raw: unknown
): ColorChoice | null => {
  const photo = photoChoiceSchema.safeParse(raw);
  if (photo.success) {
    return { kind: "photo", variant: photo.data.variant };
  }
  const preset = presetChoiceSchema.safeParse(raw);
  if (preset.success) {
    const s = preset.data.scheme;
    return {
      kind: "preset",
      scheme: {
        onPrimary: s.onPrimary,
        primary: s.primary,
        secondary: s.secondary,
      },
    };
  }
  return null;
};

/** Stable identity for selection state in the colour control. */
export const colorChoiceId = (choice: ColorChoice): string => {
  if (choice.kind === "photo") {
    return `photo:${choice.variant}`;
  }
  const s = choice.scheme;
  return `preset:${s.primary}:${s.secondary ?? ""}`;
};
