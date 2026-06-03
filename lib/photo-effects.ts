// Photo effects shared by both card modes: rotate, mirror, and a CSS-`filter`
// preset. CSS filters (not a canvas/WebGL library) keep the preview === output
// contract with html-to-image, which inlines computed styles. Preset looks are
// the common Instagram-style combos (grayscale/contrast/saturate/sepia/
// hue-rotate) — see CSSgram / instagram.css / cssfilters.co.

export type RotateDeg = 0 | 90 | 180 | 270;

export interface PhotoEffects {
  /** preset id from FILTER_PRESETS */
  filter: string;
  flipH: boolean;
  flipV: boolean;
  rotate: RotateDeg;
}

export const NO_EFFECTS: PhotoEffects = {
  rotate: 0,
  flipH: false,
  flipV: false,
  filter: "none",
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

export function nextRotation(deg: RotateDeg): RotateDeg {
  return ((deg + 90) % 360) as RotateDeg;
}

/** True when the rotation swaps the image's width and height. */
export function isQuarterTurn(deg: RotateDeg): boolean {
  return deg === 90 || deg === 270;
}
