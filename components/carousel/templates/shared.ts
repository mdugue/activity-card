// Shared contract + helpers for carousel slide templates. Templates render
// *foreground only* (type, stats, charts) at 1080×1350; the slide composer
// owns the background photo/poster, the legibility overlay, and the
// micro-graphic layer. Keeping these here (not in index.ts) avoids an import
// cycle with the dispatcher.

import type { ActivityData } from "@/components/app/sample-data";
import type { EffectiveStyle } from "@/lib/carousel/resolve";

export const SLIDE_PAD = 90;

export interface TemplateProps {
  data: ActivityData;
  /** true when a photo backs the slide → text goes light over the overlay */
  hasPhoto: boolean;
  index: number;
  style: EffectiveStyle;
  total: number;
}

export interface SlideTextColors {
  faint: string;
  fg: string;
  muted: string;
}

/** Foreground colours: light over a photo, themed ink on a poster background. */
export function slideText(
  style: EffectiveStyle,
  hasPhoto: boolean
): SlideTextColors {
  if (hasPhoto) {
    return {
      fg: "#ffffff",
      muted: "rgba(255,255,255,0.82)",
      faint: "rgba(255,255,255,0.6)",
    };
  }
  return { fg: style.ink, muted: style.mutedInk, faint: style.mutedInk };
}

export function sportWord(sport: ActivityData["sport"]): string {
  if (sport === "ride") {
    return "RIDE";
  }
  if (sport === "run") {
    return "RUN";
  }
  if (sport === "swim") {
    return "SWIM";
  }
  return "TRIATHLON";
}

/** "01 / 05" slide index, zero-padded. */
export function slideNumber(index: number, total: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(index + 1)} / ${pad(total)}`;
}
