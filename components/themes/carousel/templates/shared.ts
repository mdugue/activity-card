// Shared contract + helpers for carousel slide panels. Panels render
// *foreground only* (type, stats) at 1080×1350; the deck renderer owns the
// background photo, the signature spanning layer, and the chrome. Each panel
// derives the stats it shows directly from `data` (see `lib/carousel/stats.ts`)
// — there is no deck-wide stat planner.

import type { ActivityData } from "@/lib/activity";
import type { EffectiveStyle } from "@/lib/carousel/resolve";
import type { Visibility } from "@/lib/visibility";

export const SLIDE_PAD = 90;

export interface PanelProps {
  data: ActivityData;
  /** true when a photo backs the slide → text leans on shadows / treatment */
  hasPhoto: boolean;
  index: number;
  /** print the "made with effort" mark (wrap-up slide only) */
  showEffort: boolean;
  /** print the "01 / 04" slide index */
  showPageNumber: boolean;
  style: EffectiveStyle;
  total: number;
  /** deck-wide element visibility (drives each panel's `statOptsFor`) */
  visibility: Visibility;
}

export interface SlideTextColors {
  faint: string;
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
export function slideText(
  style: EffectiveStyle,
  hasPhoto: boolean
): SlideTextColors {
  if (hasPhoto && style.dark) {
    return {
      fg: "#ffffff",
      muted: "rgba(255,255,255,0.84)",
      faint: "rgba(255,255,255,0.62)",
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
      faint: style.mutedInk,
      shadow: LIGHT_SHADOW,
    };
  }
  return {
    fg: style.ink,
    muted: style.mutedInk,
    faint: style.mutedInk,
    shadow: "",
  };
}

/** "01 / 05" slide index, zero-padded. */
export function slideNumber(index: number, total: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(index + 1)} / ${pad(total)}`;
}
