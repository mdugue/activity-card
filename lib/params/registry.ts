// The single registry of per-theme parameter specs. Adding a theme with knobs
// means adding one row here (its defaults + params) — no new app-state field, no
// new control component, no new dispatch arm. Keyed by a config key shared across
// the two theme families: the single-card `strata` and the carousel `strata`
// both use the "strata" key because they render the same StrataConfig.

import { ALTITUDE_PARAMS, DEFAULT_ALTITUDE_CONFIG } from "@/lib/altitude";
import { DEFAULT_STRATA_CONFIG, STRATA_PARAMS } from "@/lib/strata";
import type { ParamDef } from "./kinds";
import { coerceConfig } from "./resolve";

export interface ThemeParamSpec {
  defaults: Record<string, unknown>;
  params: ParamDef[];
}

export const THEME_PARAM_SPECS: Record<string, ThemeParamSpec> = {
  altitude: { defaults: DEFAULT_ALTITUDE_CONFIG, params: ALTITUDE_PARAMS },
  strata: { defaults: DEFAULT_STRATA_CONFIG, params: STRATA_PARAMS },
};

/** The param specs for a theme key, or an empty list when it has no knobs. */
export function themeParams(key: string): ParamDef[] {
  return THEME_PARAM_SPECS[key]?.params ?? [];
}

export function hasThemeParams(key: string): boolean {
  return (THEME_PARAM_SPECS[key]?.params.length ?? 0) > 0;
}

/** Coerce a raw (possibly stale / hand-edited / absent) stored value into a
 *  valid config for a theme. Returns `{}` for themes with no params. */
export function resolveThemeConfig(
  key: string,
  raw: unknown
): Record<string, unknown> {
  const spec = THEME_PARAM_SPECS[key];
  if (!spec) {
    return {};
  }
  return coerceConfig(spec.defaults, spec.params, raw);
}
