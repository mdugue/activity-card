// The unified theme-parameter model. A parameter is a (schema, value) pair: a
// theme declares a list of `ParamDef`s and the editor renders them generically,
// grouped by `group`. Two kinds of parameter share this shape — *shared* ones
// (accent, photo, visibility) whose meaning is universal, and *bespoke* ones
// (Strata `mood`, Altitude `headline`) whose option set is owned by the theme.
//
// Pure data only (no JSX) so the specs live in `lib/` and stay unit-testable;
// the generic renderer (`components/app/param-control.tsx`) maps each `kind` to
// an existing control primitive. `min`/`max` live only on the slider variant and
// `options` only on the choice variant — a discriminated union on `kind`, so an
// invalid combination can't be expressed.

import type { ActivityData } from "@/lib/activity";
import type { ExtractedPalette } from "@/lib/palette";

/** Editor category a parameter files itself into (drives the toolbar grouping).
 *  STYLE = colour & atmosphere · LAYOUT = composition & type · the rest mirror
 *  the focused-toolbar sections. Retires the old catch-all "MOOD". */
export type ParamGroup =
  | "style"
  | "layout"
  | "photo"
  | "text"
  | "stats"
  | "marks"
  | "activity";

/** Recomputed every render, never persisted — calculated options read from it
 *  (e.g. the Photo palette picker reads the live per-strategy swatches). */
export interface ParamCtx {
  data: ActivityData;
  /** all five pre-built palette presets, or null until extraction is ready */
  palette: ExtractedPalette | null;
}

/** One choice in a segmented/select parameter. Carries display-only extras the
 *  rich select can surface: a colour `swatch`, or a live `value`+`unit` sidenote
 *  with the metric name as a `hint`. */
export interface ParamOption {
  /** small muted sub-label under the label (segmented controls) */
  blurb?: string;
  /** muted caption under the value (e.g. the metric name) */
  hint?: string;
  id: string;
  label: string;
  /** hex colour rendered as a swatch (the palette picker) */
  swatch?: string;
  /** unit beside the value (e.g. "m") */
  unit?: string;
  /** first-class value shown in a rich select (e.g. "1240") */
  value?: string;
}

interface BaseParam {
  group: ParamGroup;
  /** key into the theme's config object */
  id: string;
  label: string;
  /** hide this control unless the predicate over the current config holds —
   *  declarative conditional params (e.g. cutout-opacity only in cutout mode) */
  visibleWhen?: (config: Record<string, unknown>) => boolean;
}

export interface ToggleParam extends BaseParam {
  default: boolean;
  kind: "toggle";
}

export interface SliderParam extends BaseParam {
  default: number;
  kind: "slider";
  max: number;
  min: number;
  step?: number;
  unit?: string;
}

export interface ChoiceParam extends BaseParam {
  default: string;
  kind: "segmented" | "select";
  /** valid ids for coercion when `options` is a function (the displayed set may
   *  vary, but the storable id space is fixed) */
  optionIds?: readonly string[];
  /** static option set, or a function of context for calculated options
   *  (data-dependent availability / live values / palette swatches) */
  options: ParamOption[] | ((ctx: ParamCtx) => ParamOption[]);
}

export type ParamDef = ToggleParam | SliderParam | ChoiceParam;

/** Stable category order + display labels for the toolbar. */
export const PARAM_GROUP_ORDER: ParamGroup[] = [
  "style",
  "layout",
  "photo",
  "text",
  "stats",
  "marks",
  "activity",
];

export const PARAM_GROUP_LABEL: Record<ParamGroup, string> = {
  style: "STYLE",
  layout: "LAYOUT",
  photo: "PHOTO",
  text: "TEXT",
  stats: "STATS",
  marks: "MARKS",
  activity: "ACTIVITY",
};
