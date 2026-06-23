// Storybook control helpers shared by the single-card theme stories (CSF Next).
//
// Each story sets `component`, so args are the component's real props — that's
// what gives CSF Next its type inference. Two helpers dress those props up:
//
//   • `activityArgType` — a dropdown over the sample fixtures for the `data`
//     prop (Storybook `mapping` resolves the chosen key to the ActivityData).
//   • `paramArgTypes` — turns a theme's declarative `ParamDef[]` into proper,
//     typed controls (select / inline-radio / range / boolean), grouped by the
//     same editor category the app toolbar uses. They appear as EXTRA args
//     (widen the meta's args type with the theme's Config); the story's `render`
//     recombines them into `config` via `coerceConfig`.
//
// This keeps the controls panel in lockstep with each theme's real knobs — the
// same single source of truth (`ParamDef`) the in-app editor renders from.

import {
  SAMPLE_BRICK,
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_SWIM,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import { PARAM_GROUP_LABEL, type ParamDef } from "@/lib/params/kinds";

/** The sample activities, keyed by the label shown in the dropdown. */
export const ACTIVITY_SAMPLES = {
  Ride: SAMPLE_RIDE,
  Run: SAMPLE_RUN,
  Swim: SAMPLE_SWIM,
  Triathlon: SAMPLE_TRI,
  Brick: SAMPLE_BRICK,
} as const;

/** A select over the sample fixtures for the `data` prop. `mapping` resolves the
 *  chosen key to the real `ActivityData`, so `render` / the component get an
 *  object, not the key. */
export const activityArgType = {
  name: "Activity",
  control: { type: "select" },
  options: Object.keys(ACTIVITY_SAMPLES),
  mapping: ACTIVITY_SAMPLES,
  table: { category: "Activity" },
} as const;

/** Component props that aren't user controls — the photo args the decorator
 *  injects, plus the raw `config` object (replaced by the per-param controls).
 *  Pass to `parameters.controls.exclude`. */
export const THEME_PROP_CONTROLS_EXCLUDE = [
  "config",
  "colors",
  "imageTransform",
  "photoUrl",
  "imageSize",
];

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
