// Storybook control helpers shared by the single-card theme stories (CSF Next).
//
// Each story sets `component`, so its base args are the component's real props.
// On top of that, three groups of controls let a story be driven like the app:
//
//   • ACTIVITY — `activityArgType` picks a sample fixture for `data`; the
//     `activityTuningArgTypes` then override individual fields (distance, gain,
//     HR, title…) on top of that sample. Empty = keep the sample's own value.
//   • COLOUR — `colorArgType` is the app's colour model in one select: the
//     predefined preset accents AND the five photo-derived strategies. It
//     resolves through `resolveColors` against the live `useImagePalette`, so the
//     photo options come alive once a Background is set.
//   • PARAMS — `paramArgTypes(params)` turns a theme's `ParamDef[]` into typed
//     controls (select / inline-radio / range / boolean), recombined into
//     `config` via `coerceConfig`.
//
// `ThemeStoryView` (+ `useStoryThemeProps`) does the resolution in one place, so
// a story's `render` is just `<ThemeStoryView args={args} theme={…} />`.

import {
  SAMPLE_BRICK,
  SAMPLE_RIDE,
  SAMPLE_RUN,
  SAMPLE_SWIM,
  SAMPLE_TRI,
} from "@/components/app/sample-data";
import { useImagePalette } from "@/hooks/use-image-palette";
import type { ActivityData } from "@/lib/activity";
import {
  PALETTE_VARIANTS,
  PRESET_SCHEMES,
  resolveColors,
  VARIANT_LABELS,
} from "@/theme/core/colors";
import type { ColorChoice } from "@/theme/core/colors";
import { PARAM_GROUP_LABEL } from "@/theme/core/params/kinds";
import type { ParamDef } from "@/theme/core/params/kinds";
import { coerceConfig } from "@/theme/core/params/resolve";
import { pickThemeData } from "@/theme/core/theme-contract";
import type { SingleCardTheme } from "@/theme/core/theme-contract";

import type { BackgroundArgs } from "./backgrounds";

/* ----------------------------- activity ----------------------------- */

/** The sample activities, keyed by the label shown in the dropdown. */
export const ACTIVITY_SAMPLES = {
  Brick: SAMPLE_BRICK,
  Ride: SAMPLE_RIDE,
  Run: SAMPLE_RUN,
  Swim: SAMPLE_SWIM,
  Triathlon: SAMPLE_TRI,
} as const;

/** Dropdown order of the samples — explicit, since the map's keys are sorted. */
const ACTIVITY_SAMPLE_ORDER = [
  "Ride",
  "Run",
  "Swim",
  "Triathlon",
  "Brick",
] as const satisfies readonly (keyof typeof ACTIVITY_SAMPLES)[];

/** A select over the sample fixtures for the `data` prop. `mapping` resolves the
 *  chosen key to the real `ActivityData`. */
export const activityArgType = {
  control: { type: "select" },
  mapping: ACTIVITY_SAMPLES,
  name: "Activity",
  options: ACTIVITY_SAMPLE_ORDER,
  table: { category: "Activity" },
} as const;

/** One Activity-category control row (text or number). */
interface TuningArgType {
  control: { type: "text" } | { min: number; step: number; type: "number" };
  name: string;
  table: { category: "Activity" };
}

const tuningArgType = (
  name: string,
  control: TuningArgType["control"]
): TuningArgType => ({ control, name, table: { category: "Activity" } });

const TEXT_CONTROL = { type: "text" } as const;

/** Per-field overrides applied ON TOP of the chosen sample (empty = keep the
 *  sample's value). These are extra args, not component props. Built from an
 *  ordered list: the Controls panel lists them in this order, not by key. */
export const activityTuningArgTypes = Object.fromEntries<TuningArgType>([
  ["title", tuningArgType("Title", TEXT_CONTROL)],
  ["location", tuningArgType("Location", TEXT_CONTROL)],
  ["athleteName", tuningArgType("Athlete", TEXT_CONTROL)],
  [
    "distanceKm",
    tuningArgType("Distance (km)", { min: 0, step: 0.1, type: "number" }),
  ],
  [
    "durationSec",
    tuningArgType("Duration (s)", { min: 0, step: 60, type: "number" }),
  ],
  [
    "elevationGainM",
    tuningArgType("Elevation gain (m)", {
      min: 0,
      step: 10,
      type: "number",
    }),
  ],
  [
    "avgHeartRate",
    tuningArgType("Avg HR (bpm)", { min: 0, step: 1, type: "number" }),
  ],
] satisfies [keyof ThemeStoryExtras, TuningArgType][]);

/** A text override: an empty (or unset) text control keeps the fallback. */
const textOr = (value: string | undefined, fallback: string): string =>
  value === undefined || value === "" ? fallback : value;

/** Merge the activity-tuning overrides onto the chosen sample (empty string /
 *  undefined = keep the sample's own value). */
const applyActivityOverrides = (
  base: ActivityData,
  a: ThemeStoryExtras
): ActivityData => ({
  ...base,
  athleteName: textOr(a.athleteName, base.athleteName),
  avgHeartRate: a.avgHeartRate ?? base.avgHeartRate,
  distanceKm: a.distanceKm ?? base.distanceKm,
  durationSec: a.durationSec ?? base.durationSec,
  elevationGainM: a.elevationGainM ?? base.elevationGainM,
  location: textOr(a.location, base.location),
  title: textOr(a.title, base.title),
});

/* ------------------------------- colour ------------------------------- */

const presetLabel = (primary: string, secondary?: string): string =>
  secondary === undefined || secondary === ""
    ? `Preset · ${primary}`
    : `Preset · ${primary} + ${secondary}`;

/** Every colour the app offers, keyed by a human label: the theme default, the
 *  predefined preset accents, and the five photo-derived strategies. A `Map`
 *  keeps that insertion order for the dropdown. */
const COLOR_CHOICES = new Map<string, ColorChoice | null>([
  ["Theme default", null],
  ...PRESET_SCHEMES.map(
    (scheme) =>
      [
        presetLabel(scheme.primary, scheme.secondary),
        { kind: "preset", scheme },
      ] satisfies [string, ColorChoice]
  ),
  ...PALETTE_VARIANTS.map(
    (variant) =>
      [
        `Photo · ${VARIANT_LABELS[variant]}`,
        { kind: "photo", variant },
      ] satisfies [string, ColorChoice]
  ),
]);

// A spreadable `{ color }` (not a single argType): `color` is not a component
// prop, so it must enter `argTypes` via a spread — an explicit non-prop key trips
// excess-property checking against the component's props.
export const colorArgTypes = {
  color: {
    control: { type: "select" },
    name: "Colour",
    options: [...COLOR_CHOICES.keys()],
    table: { category: "Colour" },
  },
} as const;

const colorChoiceFromArg = (key: string | undefined): ColorChoice | null =>
  key === undefined ? null : (COLOR_CHOICES.get(key) ?? null);

/* ------------------------------- params ------------------------------- */

/** Component props that aren't user controls — the photo args the decorator
 *  injects, plus the props resolved in `render` (config/colors/transform). */
export const THEME_PROP_CONTROLS_EXCLUDE = [
  "config",
  "colors",
  "imageTransform",
  "photoUrl",
  "imageSize",
];

const choiceIds = (p: Extract<ParamDef, { kind: "segmented" | "select" }>) => {
  if (p.optionIds) {
    return [...p.optionIds];
  }
  return Array.isArray(p.options) ? p.options.map((o) => o.id) : [];
};

/** One Storybook argType per `ParamDef`, controlled by its kind and grouped by
 *  its editor category. Spread into a story meta's `argTypes`. */
export const paramArgTypes = (params: ParamDef[]) =>
  Object.fromEntries(
    params.map((p) => {
      const table = { category: PARAM_GROUP_LABEL[p.group] };
      if (p.kind === "toggle") {
        return [p.id, { control: { type: "boolean" }, name: p.label, table }];
      }
      if (p.kind === "slider") {
        return [
          p.id,
          {
            control: {
              max: p.max,
              min: p.min,
              step: p.step ?? 1,
              type: "range",
            },
            name: p.label,
            table,
          },
        ];
      }
      return [
        p.id,
        {
          control: { type: p.kind === "segmented" ? "inline-radio" : "select" },
          name: p.label,
          options: choiceIds(p),
          table,
        },
      ];
    })
  );

/* --------------------------- shared render --------------------------- */

/** A theme config's declared params without `ThemeConfig`'s string index
 *  signature — so it can be intersected with the story's non-param args
 *  (`data`, `color`, …) in a story's `Meta` type. */
export type ParamArgs<C> = {
  [K in keyof C as string extends K ? never : K]: C[K];
};

/** Extra (non-component) args every single-card theme story shares: the colour
 *  pick, the activity-tuning overrides, and the background photo args. Intersect
 *  with the component's props (and the theme's Config) in the story `Meta`. */
export interface ThemeStoryExtras extends BackgroundArgs {
  athleteName?: string;
  avgHeartRate?: number;
  color?: string;
  /** the activity sample — always seeded via `activityArgType` */
  data: ActivityData;
  distanceKm?: number;
  durationSec?: number;
  elevationGainM?: number;
  location?: string;
  /** resolved by the global `withBackground` decorator, not a user control */
  photoUrl?: string | null;
  title?: string;
}

/** Resolve the controls into the props a theme renders with: the tuned activity,
 *  the chosen colour scheme (against the live photo palette), and the coerced
 *  config. A hook (reads the photo palette), so call it from a component. */
export const useStoryThemeProps = (
  args: ThemeStoryExtras,
  theme: SingleCardTheme
) => {
  const photoUrl = args.photoUrl ?? null;
  const palette = useImagePalette(photoUrl);
  const data = applyActivityOverrides(args.data, args);
  const choice = colorChoiceFromArg(args.color) ?? theme.colors.defaultChoice;
  const colors = choice
    ? resolveColors(choice, theme.colors.default, palette)
    : theme.colors.default;
  const config = coerceConfig(theme.defaults, theme.params, args);
  return { colors, config, data, photoUrl };
};

/** Renders a single-card theme straight from the story args — the canonical
 *  `render` for every single-card theme story. */
export const ThemeStoryView = ({
  args,
  theme,
}: {
  args: ThemeStoryExtras;
  theme: SingleCardTheme;
}) => {
  const { colors, config, data, photoUrl } = useStoryThemeProps(args, theme);
  const { Component } = theme;
  return (
    <Component
      colors={colors}
      config={config}
      data={pickThemeData(theme, data)}
      photoUrl={photoUrl}
    />
  );
};
