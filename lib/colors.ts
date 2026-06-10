// The unified colour model. What a theme CONSUMES is always a resolved
// `ColorScheme`; what the user PICKS is a `ColorChoice` — a static preset
// swatch (single hue or a pair) or one of the photo-derived strategies (the
// old PhotoMood). One control serves both sources; the photo options show
// their real computed swatches and are badged as coming from the photo.

import type { ExtractedPalette, PaletteTheme, PaletteVariant } from "./palette";

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
  vibrant: "Vibrant",
  muted: "Muted",
  complementary: "Complement",
  spectrum: "Spectrum",
  pure: "Pure",
};

/** The scheme a photo-derived variant would produce, or null until the palette
 *  is extracted — drives the live swatches in the colour control. */
export function schemeFromPalette(
  palette: ExtractedPalette,
  variant: PaletteVariant
): ColorScheme {
  const t = palette.themes[variant];
  return {
    primary: t.accent,
    secondary: t.accent2,
    onPrimary: t.onAccent,
    roles: { background: t.background, body: t.body, headline: t.headline },
  };
}

/**
 * Resolve the user's choice to the scheme a theme renders with. A photo-kind
 * choice without an extracted palette (photo removed, extraction in flight)
 * falls back to the theme's own default — the choice itself persists, so
 * re-adding a photo restores the dynamic colours.
 */
export function resolveColors(
  choice: ColorChoice,
  themeDefault: ColorScheme,
  palette: ExtractedPalette | null
): ColorScheme {
  if (choice.kind === "photo") {
    return palette ? schemeFromPalette(palette, choice.variant) : themeDefault;
  }
  return choice.scheme;
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function isHex(v: unknown): v is string {
  return typeof v === "string" && HEX.test(v);
}

function isVariant(v: unknown): v is PaletteVariant {
  return typeof v === "string" && (PALETTE_VARIANTS as string[]).includes(v);
}

/**
 * Coerce a raw (persisted / hand-edited) value to a valid `ColorChoice`, or
 * `null` (= "use the theme's default") when it isn't one. CSS-injection-safe:
 * preset colours must be hex literals.
 */
export function coerceColorChoice(raw: unknown): ColorChoice | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const r = raw as Record<string, unknown>;
  if (r.kind === "photo" && isVariant(r.variant)) {
    return { kind: "photo", variant: r.variant };
  }
  if (r.kind === "preset" && r.scheme && typeof r.scheme === "object") {
    const s = r.scheme as Record<string, unknown>;
    if (isHex(s.primary)) {
      return {
        kind: "preset",
        scheme: {
          primary: s.primary,
          secondary: isHex(s.secondary) ? s.secondary : undefined,
          onPrimary: isHex(s.onPrimary) ? s.onPrimary : undefined,
        },
      };
    }
  }
  return null;
}

/** Stable identity for selection state in the colour control. */
export function colorChoiceId(choice: ColorChoice): string {
  if (choice.kind === "photo") {
    return `photo:${choice.variant}`;
  }
  const s = choice.scheme;
  return `preset:${s.primary}:${s.secondary ?? ""}`;
}
