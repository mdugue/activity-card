/**
 * The Dawn/Dusk pairing as an adjustable knob. Trace and Ascent used to ship as
 * two registry entries each (…Dawn / …Dusk); they are now one theme with an
 * ATMOSPHERE param that swaps the whole palette + type — the same
 * light·serif ↔ dark·bold contrast, chosen in the editor instead of the rail.
 * Pure data (mirrors `lib/strata.ts`' mood param) so it stays unit-testable.
 */

import type { ParamDef } from "@/theme/core/params/kinds";

export type CarouselAtmosphere = "dawn" | "dusk";

// Extends Record so the config flows through the generic param registry /
// coercer without casts; the declared key keeps its precise type.
export interface AtmosphereConfig extends Record<string, unknown> {
  /** The light the deck is bathed in: palette, type, light/dark. */
  atmosphere: CarouselAtmosphere;
}

export const DEFAULT_ATMOSPHERE_CONFIG: AtmosphereConfig = {
  atmosphere: "dawn",
};

export const ATMOSPHERE_LABELS: Record<CarouselAtmosphere, string> = {
  dawn: "Dawn",
  dusk: "Dusk",
};

export const ATMOSPHERE_BLURBS: Record<CarouselAtmosphere, string> = {
  dawn: "first light, serif on paper",
  dusk: "after dark, condensed bold",
};

const ATMOSPHERE_ORDER: CarouselAtmosphere[] = ["dawn", "dusk"];

export const ATMOSPHERE_PARAMS: ParamDef[] = [
  {
    id: "atmosphere",
    group: "style",
    label: "ATMOSPHERE",
    kind: "segmented",
    default: DEFAULT_ATMOSPHERE_CONFIG.atmosphere,
    options: ATMOSPHERE_ORDER.map((a) => ({
      id: a,
      label: ATMOSPHERE_LABELS[a],
      blurb: ATMOSPHERE_BLURBS[a],
    })),
  },
];
