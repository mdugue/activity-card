// Shared text helpers for carousel slide panels — the dual text-shadow treatment
// and the slide-number formatter. (The panel CONTRACT `PanelProps` lives beside
// `CanvasProps` in `define-theme.ts`; per-slide padding is the
// `SlideScaffold`/`SafeArea` safe-area machinery in `scaffold.tsx`.) Panels
// render *foreground only* (type, stats); the deck renderer owns the photo, the
// spanning canvas, and chrome.

import type { EffectiveStyle } from "@/theme/carousel/resolve";
import type { StatItem } from "@/theme/carousel/stats";

export interface SlideTextColors {
  fg: string;
  muted: string;
  /** dual light+dark text-shadow for legibility over a photo; "" when none */
  shadow: string;
}

// A photo never gets a heavy dark scrim under light themes; instead text carries
// a dual shadow — a tight halo plus a soft glow — so even small mono labels
// ("DISTANCE", "TIME") read on busy imagery. Dark themes use a dark drop.
const DARK_SHADOW = "0 1px 2px rgba(0,0,0,0.6), 0 2px 22px rgba(0,0,0,0.45)";
const LIGHT_SHADOW =
  "0 0 2px rgba(255,255,255,1), 0 0 6px rgba(255,255,255,0.98), 0 0 14px rgba(255,255,255,0.9), 0 0 26px rgba(255,255,255,0.72), 0 0 46px rgba(255,255,255,0.5), 0 1px 2px rgba(0,0,0,0.2)";

/** Foreground colours + an optional text-shadow for the slide's text. */
export const slideText = (
  style: EffectiveStyle,
  hasPhoto: boolean
): SlideTextColors => {
  if (hasPhoto && style.dark) {
    return {
      fg: "#ffffff",
      muted: "rgba(255,255,255,0.84)",
      shadow: DARK_SHADOW,
    };
  }
  if (hasPhoto) {
    // Light theme over a (bright-filtered) photo: keep the ink identity, but
    // drop the low-alpha "muted" — small mono labels need full ink + the halo
    // shadow to stay legible over busy imagery.
    return {
      fg: style.ink,
      muted: style.ink,
      shadow: LIGHT_SHADOW,
    };
  }
  return {
    fg: style.ink,
    muted: style.mutedInk,
    shadow: "",
  };
};

const pad2 = (n: number) => String(n).padStart(2, "0");

/** "01 / 05" slide index, zero-padded. */
export const slideNumber = (index: number, total: number): string =>
  `${pad2(index + 1)} / ${pad2(total)}`;

/** A stat as running text: "42.1 km", or just the value when unitless. */
export const statWithUnit = (s: StatItem): string =>
  s.unit ? `${s.value} ${s.unit}` : s.value;
