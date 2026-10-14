// "Text behind the horizon" as a theme knob. A theme opts in by listing
// `BEHIND_HORIZON_PARAM` in its params: the switch then shows in the PHOTO
// tool like any other param, the editor estimates the photo's depth when it is
// on (`hooks/use-photo-cutout.ts`), and the theme draws the near part of the
// photo over its headline with `PhotoForeground` (theme/shared). The config
// value is the single source of truth for "on".

import type { ParamDef, ThemeConfig, ToggleParam } from "./params/kinds";

export const BEHIND_HORIZON = "behindHorizon";

export const BEHIND_HORIZON_PARAM: ToggleParam = {
  default: false,
  group: "photo",
  id: BEHIND_HORIZON,
  kind: "toggle",
  label: "Text behind the horizon",
};

/** Does this theme offer the switch at all? */
export const offersBehindHorizon = (params: readonly ParamDef[]): boolean =>
  params.some((p) => p.id === BEHIND_HORIZON);

/** Is the switch on in this config? */
export const wantsBehindHorizon = (config: ThemeConfig | undefined): boolean =>
  config?.[BEHIND_HORIZON] === true;

/** Should the editor estimate depth: single card, photo shown, and the
 *  active theme offers the switch with it on? */
export const behindHorizonActive = (
  mode: "carousel" | "single",
  photoShown: boolean,
  theme: { params: readonly ParamDef[] },
  config: ThemeConfig
): boolean =>
  mode === "single" &&
  photoShown &&
  offersBehindHorizon(theme.params) &&
  wantsBehindHorizon(config);
