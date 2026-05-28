// Derives a role-based, contrast-checked theme from a photo.
// Pure logic — no React, no DOM beyond what node-vibrant needs. Testable in isolation.
//
// Deps:
//   node-vibrant  (v4)  → swatch extraction
//   culori               → OKLCH math + WCAG contrast (perceptually uniform, tree-shakeable)

import { converter, formatHex, type Oklch, parse, wcagContrast } from "culori";
import { Vibrant } from "node-vibrant/browser";

const toOklch = converter("oklch");

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type SwatchName =
  | "Vibrant"
  | "DarkVibrant"
  | "LightVibrant"
  | "Muted"
  | "DarkMuted"
  | "LightMuted";

export interface NormalisedSwatch {
  hex: string;
  name: SwatchName;
  // how many pixels fell into this swatch — a proxy for prominence
  population: number;
}

export type PaletteVariant = "vibrant" | "muted" | "complementary";

/** User-facing alias — the Photo theme's mood is the palette variant. */
export type PhotoMood = PaletteVariant;

/** The final object a theme consumes — assign these to CSS variables. */
export interface PaletteTheme {
  // route stroke, key stat highlight
  accent: string;
  // page/card background
  background: string;
  // secondary text — guaranteed >= 3:1 on background
  body: string;
  // primary text — guaranteed >= 4.5:1 on background
  headline: string;
  // text placed ON the accent colour
  onAccent: string;
  variant: PaletteVariant;
}

export interface ExtractedPalette {
  swatches: NormalisedSwatch[];
  /** Pre-built themes for each variant, ready to offer the user as presets. */
  themes: Record<PaletteVariant, PaletteTheme>;
}

// ----------------------------------------------------------------------------
// Tunables
// ----------------------------------------------------------------------------

// WCAG AA for normal text
const MIN_HEADLINE_CONTRAST = 4.5;
// WCAG AA for large text / secondary
const MIN_BODY_CONTRAST = 3.0;
// below this, a photo is "greyish" → skip complementary
const MIN_ACCENT_CHROMA = 0.06;
const WHITE = "#ffffff";
// not pure black — softer on screen
const BLACK = "#0a0a0a";

// ----------------------------------------------------------------------------
// Extraction
// ----------------------------------------------------------------------------

/**
 * Run node-vibrant on an image source (object URL, data URL, or HTMLImageElement).
 * Returns normalised swatches sorted by prominence (population) descending.
 */
export async function extractSwatches(
  src: string
): Promise<NormalisedSwatch[]> {
  const palette = await Vibrant.from(src).quality(1).getPalette();

  const swatches: NormalisedSwatch[] = (Object.keys(palette) as SwatchName[])
    .map((name) => {
      const sw = palette[name];
      if (!sw) {
        return null;
      }
      return {
        name,
        hex: sw.hex,
        population: sw.population,
      };
    })
    .filter((s): s is NormalisedSwatch => s !== null)
    .sort((a, b) => b.population - a.population);

  return swatches;
}

// ----------------------------------------------------------------------------
// Colour helpers (OKLCH-based)
// ----------------------------------------------------------------------------

function lightness(hex: string): number {
  return (toOklch(parse(hex)) as Oklch).l ?? 0;
}

function chroma(hex: string): number {
  return (toOklch(parse(hex)) as Oklch).c ?? 0;
}

/** Rotate hue in OKLCH space — perceptually even, unlike HSL rotation. */
function rotateHue(hex: string, degrees: number): string {
  const c = toOklch(parse(hex)) as Oklch;
  const h = ((c.h ?? 0) + degrees) % 360;
  return formatHex({ ...c, h }) ?? hex;
}

/** Nudge a colour lighter/darker without changing hue — for deriving body text. */
function withLightness(hex: string, l: number): string {
  const c = toOklch(parse(hex)) as Oklch;
  return formatHex({ ...c, l }) ?? hex;
}

/** Pick whichever of black/white reads better on the given background. */
function autoContrastText(bg: string): string {
  return wcagContrast(WHITE, bg) >= wcagContrast(BLACK, bg) ? WHITE : BLACK;
}

/**
 * Find the candidate with the best contrast against bg that clears `min`.
 * Falls back to auto black/white if nothing qualifies — legibility always wins.
 */
function pickTextColor(bg: string, candidates: string[], min: number): string {
  let best: { hex: string; ratio: number } | null = null;
  for (const hex of candidates) {
    const ratio = wcagContrast(hex, bg);
    if (ratio >= min && (!best || ratio > best.ratio)) {
      best = { hex, ratio };
    }
  }
  return best ? best.hex : autoContrastText(bg);
}

// ----------------------------------------------------------------------------
// Role assignment
// ----------------------------------------------------------------------------

function byName(
  swatches: NormalisedSwatch[],
  name: SwatchName
): string | undefined {
  return swatches.find((s) => s.name === name)?.hex;
}

function darkest(swatches: NormalisedSwatch[]): string {
  return (
    [...swatches].sort((a, b) => lightness(a.hex) - lightness(b.hex))[0]?.hex ??
    BLACK
  );
}

function mostVibrant(swatches: NormalisedSwatch[]): string {
  // Highest chroma swatch, tie-broken by population.
  return (
    [...swatches].sort((a, b) => {
      const dc = chroma(b.hex) - chroma(a.hex);
      return dc === 0 ? b.population - a.population : dc;
    })[0]?.hex ?? "#888888"
  );
}

/**
 * Build a single theme for a given variant. All text/bg pairings are
 * contrast-guaranteed; the accent is the only "expressive" colour and it
 * never carries text without an auto-contrast onAccent.
 */
function buildTheme(
  swatches: NormalisedSwatch[],
  variant: PaletteVariant
): PaletteTheme {
  const allHexes = swatches.map((s) => s.hex);

  // Background: dark-muted reads best behind a photo overlay; fall back to darkest.
  const background = byName(swatches, "DarkMuted") ?? darkest(swatches);

  // Accent depends on variant.
  let accent: string;
  if (variant === "vibrant") {
    accent = byName(swatches, "Vibrant") ?? mostVibrant(swatches);
  } else if (variant === "muted") {
    accent =
      byName(swatches, "LightMuted") ??
      byName(swatches, "Muted") ??
      mostVibrant(swatches);
  } else {
    // complementary: rotate the dominant vibrant hue 180° in OKLCH,
    // but only if the photo has enough colour to justify it.
    const base = byName(swatches, "Vibrant") ?? mostVibrant(swatches);
    accent = chroma(base) >= MIN_ACCENT_CHROMA ? rotateHue(base, 180) : base;
  }

  // Headline: best-contrast swatch over background, else auto black/white.
  // Prefer the light swatches as text candidates since bg is dark.
  const lightCandidates = [
    byName(swatches, "LightVibrant"),
    byName(swatches, "LightMuted"),
    WHITE,
    ...allHexes,
  ].filter((x): x is string => Boolean(x));

  const headline = pickTextColor(
    background,
    lightCandidates,
    MIN_HEADLINE_CONTRAST
  );

  // Body: a dimmer version of headline that still clears the lower bar.
  const dimmed = withLightness(
    headline,
    Math.max(0.55, lightness(headline) - 0.18)
  );
  const body =
    wcagContrast(dimmed, background) >= MIN_BODY_CONTRAST
      ? dimmed
      : pickTextColor(background, lightCandidates, MIN_BODY_CONTRAST);

  return {
    variant,
    background,
    headline,
    body,
    accent,
    onAccent: autoContrastText(accent),
  };
}

// ----------------------------------------------------------------------------
// Public entry point
// ----------------------------------------------------------------------------

export async function buildPaletteFromImage(
  src: string
): Promise<ExtractedPalette> {
  const swatches = await extractSwatches(src);

  if (swatches.length === 0) {
    // Pathological image (e.g. fully transparent). Return a safe neutral theme.
    const neutral: PaletteTheme = {
      variant: "muted",
      background: BLACK,
      headline: WHITE,
      body: "#bbbbbb",
      accent: "#888888",
      onAccent: BLACK,
    };
    return {
      swatches: [],
      themes: { vibrant: neutral, muted: neutral, complementary: neutral },
    };
  }

  return {
    swatches,
    themes: {
      vibrant: buildTheme(swatches, "vibrant"),
      muted: buildTheme(swatches, "muted"),
      complementary: buildTheme(swatches, "complementary"),
    },
  };
}
