// Derives a role-based, contrast-checked theme from a photo.
// Pure logic — no React, no DOM beyond what node-vibrant needs. Testable in isolation.
//
// Deps:
//   node-vibrant  (v4)  → swatch extraction
//   culori               → OKLCH math + WCAG contrast (perceptually uniform, tree-shakeable)

import { converter, formatHex, parse, wcagContrast } from "culori";
import type { Oklch } from "culori";
// The browser entry registers the in-thread pipeline as the baseline, so
// extraction always works (SSR-rendered imports, tests, environments without
// Worker). `ensureWorkerPipeline` upgrades it to off-thread quantization.
import { Vibrant } from "node-vibrant/browser";
import { WorkerPipeline } from "node-vibrant/worker";

const toOklch = converter("oklch");

// Quantization is the slow stage of extraction (it scans every sampled pixel)
// and it used to run on the main thread, freezing the editor for the duration
// of a photo swap. node-vibrant's WorkerPipeline moves it into a Web Worker;
// image decode stays on the main thread (it needs the DOM), only the pixel
// crunching is shipped off. Installed lazily on first extraction so merely
// importing this module stays side-effect free.
let workerPipelineInstalled = false;

const ensureWorkerPipeline = (): void => {
  if (workerPipelineInstalled || typeof Worker === "undefined") {
    return;
  }
  workerPipelineInstalled = true;
  // node-vibrant's worker pool instantiates the class per worker; the wrapper
  // keeps the bundler-recognised `new Worker(new URL(...))` pattern verbatim
  // so the worker chunk is emitted by Next/Vite alike.
  const PaletteWorker = function PaletteWorker() {
    return new Worker(new URL("palette.worker.ts", import.meta.url), {
      type: "module",
    });
  } as unknown as ConstructorParameters<typeof WorkerPipeline>[0];
  // Aliased: the react-hooks lint rule misreads any `.use(...)` as a Hook.
  const installPipeline = Vibrant.use.bind(Vibrant);
  try {
    installPipeline(new WorkerPipeline(PaletteWorker));
  } catch {
    // Keep the in-thread pipeline registered by the browser entry.
  }
};

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

export type PaletteVariant =
  | "vibrant"
  | "muted"
  | "complementary"
  | "spectrum"
  | "pure";

/** User-facing alias — the Photo theme's mood is the palette variant. */
export type PhotoMood = PaletteVariant;

/** The final object a theme consumes — assign these to CSS variables. */
export interface PaletteTheme {
  // primary accent — hero number, divider, key stat highlight
  accent: string;
  // secondary accent — paired with `accent` for multi-colour moments
  // (gradient rule, ornamental italics). Equals `accent` for most variants;
  // only Spectrum sets it to a distinct hue.
  accent2: string;
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
const MIN_BODY_CONTRAST = 3;
// below this, a photo is "greyish" → skip complementary
const MIN_ACCENT_CHROMA = 0.06;
const WHITE = "#ffffff";
// not pure black — softer on screen
const BLACK = "#0a0a0a";

// ----------------------------------------------------------------------------
// Extraction
// ----------------------------------------------------------------------------

/**
 * Longest edge node-vibrant quantizes (it wins over `quality`). Photos arrive
 * at up to 12 MP (lib/photo-resize), and quality 1 shipped every one of those
 * pixels — ~48 MB of ImageData — through getImageData, into the worker and
 * through the histogram. ~1 MP is plenty for a 6-swatch population palette:
 * measured in Chromium on the sample photos (incl. 4000×3000 upscales), the
 * swatch shifts at 1024 stay within the jitter quality 1 itself shows between
 * the same photo at two sizes, while 256 flipped whole swatches (a gold
 * DarkVibrant turned blue). Smaller photos are left untouched.
 */
export const PALETTE_MAX_DIMENSION = 1024;

/**
 * Run node-vibrant on an image source (object URL, data URL, or HTMLImageElement).
 * Returns normalised swatches sorted by prominence (population) descending.
 */
export const extractSwatches = async (
  src: string
): Promise<NormalisedSwatch[]> => {
  ensureWorkerPipeline();
  const palette = await Vibrant.from(src)
    .maxDimension(PALETTE_MAX_DIMENSION)
    .getPalette();

  const swatches: NormalisedSwatch[] = (Object.keys(palette) as SwatchName[])
    .map((name) => {
      const sw = palette[name];
      if (!sw) {
        return null;
      }
      return {
        hex: sw.hex,
        name,
        population: sw.population,
      };
    })
    .filter((s): s is NormalisedSwatch => s !== null)
    .sort((a, b) => b.population - a.population);

  return swatches;
};

// ----------------------------------------------------------------------------
// Colour helpers (OKLCH-based)
// ----------------------------------------------------------------------------

const lightness = (hex: string): number =>
  (toOklch(parse(hex)) as Oklch).l ?? 0;

const chroma = (hex: string): number => (toOklch(parse(hex)) as Oklch).c ?? 0;

/** Rotate hue in OKLCH space — perceptually even, unlike HSL rotation. */
const rotateHue = (hex: string, degrees: number): string => {
  const c = toOklch(parse(hex)) as Oklch;
  const h = ((c.h ?? 0) + degrees) % 360;
  return formatHex({ ...c, h }) ?? hex;
};

/** Nudge a colour lighter/darker without changing hue — for deriving body text. */
const withLightness = (hex: string, l: number): string => {
  const c = toOklch(parse(hex)) as Oklch;
  return formatHex({ ...c, l }) ?? hex;
};

/** Pick whichever of black/white reads better on the given background. */
const autoContrastText = (bg: string): string =>
  wcagContrast(WHITE, bg) >= wcagContrast(BLACK, bg) ? WHITE : BLACK;

/**
 * Find the candidate with the best contrast against bg that clears `min`.
 * Falls back to auto black/white if nothing qualifies — legibility always wins.
 */
const pickTextColor = (
  bg: string,
  candidates: string[],
  min: number
): string => {
  let best: { hex: string; ratio: number } | null = null;
  for (const hex of candidates) {
    const ratio = wcagContrast(hex, bg);
    if (ratio >= min && (!best || ratio > best.ratio)) {
      best = { hex, ratio };
    }
  }
  return best ? best.hex : autoContrastText(bg);
};

// ----------------------------------------------------------------------------
// Role assignment
// ----------------------------------------------------------------------------

const byName = (
  swatches: NormalisedSwatch[],
  name: SwatchName
): string | undefined => swatches.find((s) => s.name === name)?.hex;

const darkest = (swatches: NormalisedSwatch[]): string =>
  [...swatches].sort((a, b) => lightness(a.hex) - lightness(b.hex))[0]?.hex ??
  BLACK;

const mostVibrant = (swatches: NormalisedSwatch[]): string =>
  // Highest chroma swatch, tie-broken by population.
  [...swatches].sort((a, b) => {
    const dc = chroma(b.hex) - chroma(a.hex);
    return dc === 0 ? b.population - a.population : dc;
  })[0]?.hex ?? "#888888";

/**
 * "Pure" mood — ignore the swatches entirely. The original photo theme's
 * typographic look: white headline / soft-white body / white accent. The
 * photo still shows through as the background image; this just keeps the
 * type and route stroke neutral so the photo speaks for itself.
 *
 * Exposed as a const (not a builder) so callers can opt out of waiting on
 * `buildPaletteFromImage` when they only need the pure theme.
 */
export const PURE_THEME: PaletteTheme = {
  variant: "pure",
  // --bg is consumed by the vignette only when no photo is loaded; a dark
  // neutral keeps the gradient credible without tinting toward any swatch.
  background: "#141414",
  headline: "#ffffff",
  body: "rgba(255,255,255,0.82)",
  accent: "#ffffff",
  accent2: "#ffffff",
  onAccent: BLACK,
};

/** Accent choice for the photo-derived variants (everything except pure). */
const pickAccent = (
  swatches: NormalisedSwatch[],
  variant: Exclude<PaletteVariant, "pure">
): string => {
  if (variant === "muted") {
    return (
      byName(swatches, "LightMuted") ??
      byName(swatches, "Muted") ??
      mostVibrant(swatches)
    );
  }
  if (variant === "complementary") {
    // Rotate the dominant vibrant hue 180° — but only if the photo has
    // enough chroma. Greyish photos keep the base colour instead.
    const base = byName(swatches, "Vibrant") ?? mostVibrant(swatches);
    return chroma(base) >= MIN_ACCENT_CHROMA ? rotateHue(base, 180) : base;
  }
  // vibrant + spectrum both pull the punchy Vibrant swatch.
  return byName(swatches, "Vibrant") ?? mostVibrant(swatches);
};

/** Body colour for all non-spectrum variants: a dimmed headline that
 *  still clears the lower contrast bar, with a swatch fallback. */
const dimmedBody = (
  headline: string,
  background: string,
  candidates: string[]
): string => {
  const dimmed = withLightness(
    headline,
    Math.max(0.55, lightness(headline) - 0.18)
  );
  return wcagContrast(dimmed, background) >= MIN_BODY_CONTRAST
    ? dimmed
    : pickTextColor(background, candidates, MIN_BODY_CONTRAST);
};

/** Spectrum body: prefer LightMuted so headline + body carry distinct tints. */
const spectrumBody = (
  swatches: NormalisedSwatch[],
  background: string,
  headline: string,
  candidates: string[]
): string => {
  const mutedLight =
    byName(swatches, "LightMuted") ?? byName(swatches, "Muted");
  if (mutedLight && wcagContrast(mutedLight, background) >= MIN_BODY_CONTRAST) {
    return mutedLight;
  }
  return dimmedBody(headline, background, candidates);
};

/**
 * Build a single theme for a given variant. All text/bg pairings are
 * contrast-guaranteed; the accent is the only "expressive" colour and it
 * never carries text without an auto-contrast onAccent.
 */
const buildTheme = (
  swatches: NormalisedSwatch[],
  variant: PaletteVariant
): PaletteTheme => {
  if (variant === "pure") {
    return PURE_THEME;
  }

  const allHexes = swatches.map((s) => s.hex);
  const background = byName(swatches, "DarkMuted") ?? darkest(swatches);
  const accent = pickAccent(swatches, variant);

  // Spectrum is the multi-colour mood: accent2 = the complementary rotation
  // of the primary accent (chroma-guarded). Other variants leave accent2
  // equal to accent so they stay single-colour by design.
  const accent2 =
    variant === "spectrum" && chroma(accent) >= MIN_ACCENT_CHROMA
      ? rotateHue(accent, 180)
      : accent;

  // Headline: best-contrast swatch over background, else auto black/white.
  // Prefer the light swatches as text candidates since bg is dark.
  const candidates = [
    byName(swatches, "LightVibrant"),
    byName(swatches, "LightMuted"),
    WHITE,
    ...allHexes,
  ].filter((x): x is string => Boolean(x));

  const headline = pickTextColor(background, candidates, MIN_HEADLINE_CONTRAST);

  const body =
    variant === "spectrum"
      ? spectrumBody(swatches, background, headline, candidates)
      : dimmedBody(headline, background, candidates);

  return {
    accent,
    accent2,
    background,
    body,
    headline,
    onAccent: autoContrastText(accent),
    variant,
  };
};

// ----------------------------------------------------------------------------
// Public entry point
// ----------------------------------------------------------------------------

export const buildPaletteFromImage = async (
  src: string
): Promise<ExtractedPalette> => {
  const swatches = await extractSwatches(src);

  if (swatches.length === 0) {
    // Pathological image (e.g. fully transparent). Return a safe neutral theme.
    const neutral: PaletteTheme = {
      accent: "#888888",
      accent2: "#888888",
      background: BLACK,
      body: "#bbbbbb",
      headline: WHITE,
      onAccent: BLACK,
      variant: "muted",
    };
    return {
      swatches: [],
      themes: {
        complementary: neutral,
        muted: neutral,
        pure: PURE_THEME,
        spectrum: neutral,
        vibrant: neutral,
      },
    };
  }

  return {
    swatches,
    themes: {
      complementary: buildTheme(swatches, "complementary"),
      muted: buildTheme(swatches, "muted"),
      pure: PURE_THEME,
      spectrum: buildTheme(swatches, "spectrum"),
      vibrant: buildTheme(swatches, "vibrant"),
    },
  };
};
