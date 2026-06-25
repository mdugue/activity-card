// Photo effects shared by both card modes: rotate, mirror, and a CSS-`filter`
// preset. CSS filters (not a canvas/WebGL library) keep the preview === output
// contract with snapdom, which inlines computed styles. Preset looks are
// the common Instagram-style combos (grayscale/contrast/saturate/sepia/
// hue-rotate) — see CSSgram / instagram.css / cssfilters.co.

export type RotateDeg = 0 | 90 | 180 | 270;

export interface PhotoEffects {
  /** preset id from FILTER_PRESETS */
  filter: string;
  flipH: boolean;
  flipV: boolean;
  /** analogue film grain overlaid on the photo (art-print / newsprint feel) */
  grain: boolean;
  rotate: RotateDeg;
}

export const NO_EFFECTS: PhotoEffects = {
  rotate: 0,
  flipH: false,
  flipV: false,
  filter: "none",
  grain: false,
};

export interface FilterPreset {
  css: string;
  id: string;
  label: string;
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: "none", label: "Original", css: "" },
  {
    id: "noir",
    label: "Noir",
    css: "grayscale(1) contrast(1.32) brightness(0.94)",
  },
  { id: "mono", label: "Mono", css: "grayscale(1) contrast(1.05)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.5) contrast(1.1)" },
  {
    id: "warm",
    label: "Warm",
    css: "saturate(1.18) sepia(0.24) brightness(1.03) hue-rotate(-8deg)",
  },
  {
    id: "cool",
    label: "Cool",
    css: "saturate(1.1) hue-rotate(12deg) brightness(1.02)",
  },
  {
    id: "fade",
    label: "Faded",
    css: "contrast(0.88) saturate(0.82) brightness(1.08) sepia(0.12)",
  },
  {
    id: "sepia",
    label: "Sepia",
    css: "sepia(0.62) contrast(1.05) brightness(1.02)",
  },
];

export function filterCss(id: string): string {
  return FILTER_PRESETS.find((p) => p.id === id)?.css ?? "";
}

/**
 * Film-grain texture as an inline SVG `feTurbulence`, served as a data-URI
 * `background-image`. A live DOM `<filter>` rasterises unreliably through the
 * foreignObject snapshot, but an SVG *image* is decoded by the browser like any
 * other bitmap, so the grain survives export. Tiled (`background-repeat`) and laid
 * over the photo with a blend mode by the consumer.
 */
function grainDataUri(baseFrequency: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="${baseFrequency}" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Default grain texture (medium size). */
export const GRAIN_BG = grainDataUri(0.82);

/** The rotate/flip suffix to append to a photo's pan/zoom `transform`. */
export function effectsTransformSuffix(e?: PhotoEffects | null): string {
  if (!e) {
    return "";
  }
  const parts: string[] = [];
  if (e.rotate) {
    parts.push(`rotate(${e.rotate}deg)`);
  }
  if (e.flipH) {
    parts.push("scaleX(-1)");
  }
  if (e.flipV) {
    parts.push("scaleY(-1)");
  }
  return parts.length ? ` ${parts.join(" ")}` : "";
}

export function nextRotation(deg: RotateDeg): RotateDeg {
  return ((deg + 90) % 360) as RotateDeg;
}

/** True when the rotation swaps the image's width and height. */
export function isQuarterTurn(deg: RotateDeg): boolean {
  return deg === 90 || deg === 270;
}
