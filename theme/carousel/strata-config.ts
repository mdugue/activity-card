// Reads STRATA's knobs back out of the erased carousel config. The deck hands
// every canvas / `resolveStyle` the theme's coerced config as a plain
// `ThemeConfig`; this narrows it to `StrataConfig` by checking each value
// against its option space (falling back to the default per field), instead of
// asserting the type.

import {
  DEFAULT_STRATA_CONFIG,
  STRATA_DENSITY_K,
  STRATA_MOODS,
} from "@/lib/strata";
import type { StrataConfig, StrataDensity, StrataMood } from "@/lib/strata";
import type { ParamValue, ThemeConfig } from "@/theme/core/params/kinds";

const isStrataMood = (v: ParamValue | undefined): v is StrataMood =>
  typeof v === "string" && Object.hasOwn(STRATA_MOODS, v);

const isStrataDensity = (v: ParamValue | undefined): v is StrataDensity =>
  typeof v === "string" && Object.hasOwn(STRATA_DENSITY_K, v);

/** The STRATA config carried by a coerced carousel theme config. */
export const strataConfigOf = (config: ThemeConfig): StrataConfig => {
  const { density, legend, mood } = config;
  return {
    density: isStrataDensity(density) ? density : DEFAULT_STRATA_CONFIG.density,
    legend:
      legend === true || legend === false
        ? legend
        : DEFAULT_STRATA_CONFIG.legend,
    mood: isStrataMood(mood) ? mood : DEFAULT_STRATA_CONFIG.mood,
  };
};
