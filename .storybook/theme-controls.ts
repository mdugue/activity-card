// Storybook control helpers shared by the single-card theme stories.
//
//   • `activityArgType` — a dropdown of the sample fixtures, keyed by name. The
//     arg is the KEY string (not the object), so it stays type-safe and survives
//     Storybook's "save from controls" (which persists the option value). The
//     story's `render` resolves the key through `ACTIVITY_SAMPLES`.
//   • `paramArgTypes` — turns a theme's declarative `ParamDef[]` into proper,
//     typed Storybook controls (select / inline-radio / range / boolean),
//     grouped by the same editor category the app toolbar uses. The flattened
//     param args are recombined into the theme's `config` with `coerceConfig`.
//
// This keeps the controls panel in lockstep with each theme's real knobs — the
// same single source of truth (`ParamDef`) the in-app editor renders from. The
// stories set `render` (not `component`), so there are no auto-inferred object
// controls to hide; the only injected args worth hiding are the photo ones.

import {
  SAMPLE_BRICK,
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_SWIM,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import { PARAM_GROUP_LABEL, type ParamDef } from "@/lib/params/kinds";
import type { BackgroundArgs } from "./backgrounds";

/** The sample activities, keyed by the label shown in the dropdown. */
export const ACTIVITY_SAMPLES = {
  Ride: SAMPLE_RIDE,
  Run: SAMPLE_RUN,
  Swim: SAMPLE_SWIM,
  Triathlon: SAMPLE_TRI,
  Brick: SAMPLE_BRICK,
} as const;

export type ActivitySampleKey = keyof typeof ACTIVITY_SAMPLES;

/** Args every single-card theme story shares: the activity picker + the photo
 *  injected by the `withBackground` decorator. Intersect with a theme's flattened
 *  config in the story's `Meta<…>` type. */
export interface ThemeStoryArgs extends BackgroundArgs {
  activity: ActivitySampleKey;
  /** resolved by the global `withBackground` decorator, not a user control */
  photoUrl?: string | null;
}

/** A select over the sample fixtures (by key). */
export const activityArgType = {
  name: "Activity",
  control: { type: "select" },
  options: Object.keys(ACTIVITY_SAMPLES),
  table: { category: "Activity" },
} as const;

/** Photo args the decorator injects — hidden from the controls panel. */
export const INJECTED_CONTROLS_EXCLUDE = ["photoUrl", "imageSize"];

/** The fixed id space a choice param can take (the stored values, even when the
 *  displayed option set is computed from context). */
function choiceIds(p: Extract<ParamDef, { kind: "segmented" | "select" }>) {
  if (p.optionIds) {
    return [...p.optionIds];
  }
  return Array.isArray(p.options) ? p.options.map((o) => o.id) : [];
}

/** One Storybook argType per `ParamDef`, controlled by its kind and grouped by
 *  its editor category. Spread into a story meta's `argTypes`. */
export function paramArgTypes(params: ParamDef[]) {
  return Object.fromEntries(
    params.map((p) => {
      const table = { category: PARAM_GROUP_LABEL[p.group] };
      if (p.kind === "toggle") {
        return [p.id, { name: p.label, table, control: { type: "boolean" } }];
      }
      if (p.kind === "slider") {
        return [
          p.id,
          {
            name: p.label,
            table,
            control: {
              type: "range",
              min: p.min,
              max: p.max,
              step: p.step ?? 1,
            },
          },
        ];
      }
      // segmented → inline-radio (compact for a small fixed set); select → select
      return [
        p.id,
        {
          name: p.label,
          table,
          control: { type: p.kind === "segmented" ? "inline-radio" : "select" },
          options: choiceIds(p),
        },
      ];
    })
  );
}
