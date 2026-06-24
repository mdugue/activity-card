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
  type ColorChoice,
  PALETTE_VARIANTS,
  PRESET_SCHEMES,
  resolveColors,
  VARIANT_LABELS,
} from "@/lib/colors";
import { PARAM_GROUP_LABEL, type ParamDef } from "@/lib/params/kinds";
import { coerceConfig } from "@/lib/params/resolve";
import { pickThemeData, type SingleCardTheme } from "@/lib/theme-contract";
import type { BackgroundArgs } from "./backgrounds";

/* ----------------------------- activity ----------------------------- */

/** The sample activities, keyed by the label shown in the dropdown. */
export const ACTIVITY_SAMPLES = {
  Ride: SAMPLE_RIDE,
  Run: SAMPLE_RUN,
  Swim: SAMPLE_SWIM,
  Triathlon: SAMPLE_TRI,
  Brick: SAMPLE_BRICK,
} as const;

/** A select over the sample fixtures for the `data` prop. `mapping` resolves the
 *  chosen key to the real `ActivityData`. */
export const activityArgType = {
  name: "Activity",
  control: { type: "select" },
  options: Object.keys(ACTIVITY_SAMPLES),
  mapping: ACTIVITY_SAMPLES,
  table: { category: "Activity" },
} as const;

/** Per-field overrides applied ON TOP of the chosen sample (empty = keep the
 *  sample's value). These are extra args, not component props. */
export const activityTuningArgTypes = {
  title: {
    name: "Title",
    control: { type: "text" },
    table: { category: "Activity" },
  },
  location: {
    name: "Location",
    control: { type: "text" },
    table: { category: "Activity" },
  },
  athleteName: {
    name: "Athlete",
    control: { type: "text" },
    table: { category: "Activity" },
  },
  distanceKm: {
    name: "Distance (km)",
    control: { type: "number", min: 0, step: 0.1 },
    table: { category: "Activity" },
  },
  durationSec: {
    name: "Duration (s)",
    control: { type: "number", min: 0, step: 60 },
    table: { category: "Activity" },
  },
  elevationGainM: {
    name: "Elevation gain (m)",
    control: { type: "number", min: 0, step: 10 },
    table: { category: "Activity" },
  },
  avgHeartRate: {
    name: "Avg HR (bpm)",
    control: { type: "number", min: 0, step: 1 },
    table: { category: "Activity" },
  },
};

/** Merge the activity-tuning overrides onto the chosen sample (empty string /
 *  undefined = keep the sample's own value). */
function applyActivityOverrides(
  base: ActivityData,
  a: ThemeStoryExtras
): ActivityData {
  return {
    ...base,
    title: a.title || base.title,
    location: a.location || base.location,
    athleteName: a.athleteName || base.athleteName,
    distanceKm: a.distanceKm ?? base.distanceKm,
    durationSec: a.durationSec ?? base.durationSec,
    elevationGainM: a.elevationGainM ?? base.elevationGainM,
    avgHeartRate: a.avgHeartRate ?? base.avgHeartRate,
  };
}

/* ------------------------------- colour ------------------------------- */

function presetLabel(primary: string, secondary?: string): string {
  return secondary
    ? `Preset · ${primary} + ${secondary}`
    : `Preset · ${primary}`;
}

/** Every colour the app offers, keyed by a human label: the theme default, the
 *  predefined preset accents, and the five photo-derived strategies. */
const COLOR_CHOICES: Record<string, ColorChoice | null> = {
  "Theme default": null,
  ...Object.fromEntries(
    PRESET_SCHEMES.map((scheme) => [
      presetLabel(scheme.primary, scheme.secondary),
      { kind: "preset", scheme } satisfies ColorChoice,
    ])
  ),
  ...Object.fromEntries(
    PALETTE_VARIANTS.map((variant) => [
      `Photo · ${VARIANT_LABELS[variant]}`,
      { kind: "photo", variant } satisfies ColorChoice,
    ])
  ),
};

// A spreadable `{ color }` (not a single argType): `color` is not a component
// prop, so it must enter `argTypes` via a spread — an explicit non-prop key trips
// excess-property checking against the component's props.
export const colorArgTypes = {
  color: {
    name: "Colour",
    control: { type: "select" },
    options: Object.keys(COLOR_CHOICES),
    table: { category: "Colour" },
  },
} as const;

function colorChoiceFromArg(key: unknown): ColorChoice | null {
  return typeof key === "string" ? (COLOR_CHOICES[key] ?? null) : null;
}

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

/* --------------------------- shared render --------------------------- */

/** Extra (non-component) args every single-card theme story shares: the colour
 *  pick, the activity-tuning overrides, and the background photo args. Intersect
 *  with the component's props (and the theme's Config) in the story `Meta`. */
export interface ThemeStoryExtras extends BackgroundArgs {
  athleteName?: string;
  avgHeartRate?: number;
  color?: string;
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
export function useStoryThemeProps(
  args: ThemeStoryExtras & { data: unknown },
  theme: SingleCardTheme
) {
  const photoUrl = typeof args.photoUrl === "string" ? args.photoUrl : null;
  const palette = useImagePalette(photoUrl);
  // reason: stories always seed `data` via activityArgType (an ActivityData sample)
  const base = args.data as ActivityData;
  const data = applyActivityOverrides(base, args);
  const choice = colorChoiceFromArg(args.color) ?? theme.colors.defaultChoice;
  const colors = choice
    ? resolveColors(choice, theme.colors.default, palette)
    : theme.colors.default;
  const config = coerceConfig(theme.defaults, theme.params, args);
  return { colors, config, data, photoUrl };
}

/** Renders a single-card theme straight from the story args — the canonical
 *  `render` for every single-card theme story. */
export function ThemeStoryView({
  args,
  theme,
}: {
  args: ThemeStoryExtras & { data: unknown };
  theme: SingleCardTheme;
}) {
  const { colors, config, data, photoUrl } = useStoryThemeProps(args, theme);
  const Component = theme.Component;
  return (
    <Component
      colors={colors}
      config={config}
      data={pickThemeData(theme, data)}
      photoUrl={photoUrl}
    />
  );
}
