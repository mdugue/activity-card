// The PHOTO theme's adjustable knobs, as data (see the theme-params skill).
// Its one switch so far is "text behind the horizon": the title moves up into
// the landscape as a big headline, behind the photo's foreground cut-out.

import { BEHIND_HORIZON_PARAM } from "@/theme/core/horizon";
import type { ParamDef, ThemeConfig } from "@/theme/core/params/kinds";

export interface PhotoConfig extends ThemeConfig {
  behindHorizon: boolean;
  /** headline top, in percent of the card height (behind the horizon only) */
  horizonTitleY: number;
}

export const DEFAULT_PHOTO_CONFIG: PhotoConfig = {
  behindHorizon: false,
  horizonTitleY: 24,
};

export const PHOTO_PARAMS: ParamDef[] = [
  BEHIND_HORIZON_PARAM,
  {
    default: DEFAULT_PHOTO_CONFIG.horizonTitleY,
    group: "photo",
    id: "horizonTitleY",
    kind: "slider",
    label: "Headline height",
    max: 70,
    min: 0,
    step: 1,
    unit: "%",
    visibleWhen: (cfg) => cfg.behindHorizon === true,
  },
];

/**
 * Font size for the behind-the-horizon headline: as large as one line of the
 * title allows across `width`, between a floor that keeps long titles legible
 * (they wrap instead) and a ceiling that keeps short ones from swallowing the
 * card. 0.5em is Playfair Display's average advance, measured on renders.
 */
export const horizonTitleSize = (title: string, width: number): number => {
  const chars = Math.max(1, title.trim().length);
  return Math.round(Math.min(300, Math.max(120, width / (chars * 0.5))));
};
