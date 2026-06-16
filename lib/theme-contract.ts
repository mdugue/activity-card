/**
 * The single-card theme contract: a theme declares which overlay capabilities
 * it renders, and that declaration both (a) drives the editor's availability
 * derivation and (b) narrows the component's `data` prop type, so a theme
 * physically can't read a field it didn't declare — the compiler enforces the
 * declaration at the definition site.
 *
 * The generic is erased at the registry boundary (`SingleCardTheme`), the same
 * pattern as the param system: full type safety where themes are written,
 * `unknown`/widened where they're stored and dispatched.
 */

import type { FC } from "react";
import type { ActivityData } from "@/lib/activity";
import type { ColorChoice, ColorScheme, ThemeColorPolicy } from "@/lib/colors";
import type { ImageTransform } from "@/lib/image-transform";
import type { ParamDef } from "@/lib/params/kinds";

/** Overlay elements a theme can opt into. Title/date/distance/time are a
 *  card's core — always present, not capabilities. Each key matches its
 *  visibility toggle. */
export type CapabilityKey =
  | "athleteName"
  | "cadence"
  | "elevation"
  | "elevationViz"
  | "heartRate"
  | "location"
  | "pace"
  | "power"
  | "route"
  | "speed"
  | "splits";

/** Which ActivityData fields each capability governs — the runtime source for
 *  `pickThemeData` and the type-level source for `ThemeData`. */
export const GOVERNED_FIELDS = {
  athleteName: ["athleteName"],
  cadence: ["avgCadence"],
  elevation: ["elevationGainM"],
  elevationViz: ["elevationProfile"],
  heartRate: ["avgHeartRate"],
  location: ["location"],
  pace: ["avgPaceMinPerKm", "avgPacePer100m", "paceProfile", "lapPacesPer100m"],
  power: ["normalizedPowerW", "powerProfile", "powerZones"],
  route: ["routeCoordinates"],
  speed: ["avgSpeedKmh", "maxSpeedKmh", "speedProfile"],
  splits: ["splits"],
} as const satisfies Record<CapabilityKey, readonly (keyof ActivityData)[]>;

type GovernedFieldOf<K extends CapabilityKey> =
  (typeof GOVERNED_FIELDS)[K][number];

/** Every field governed by any capability. */
export type GovernedField = GovernedFieldOf<CapabilityKey>;

/**
 * ActivityData narrowed to a theme's declared capabilities: undeclared
 * governed fields are REMOVED from the type, so reading them in the theme is a
 * compile error.
 */
export type ThemeData<K extends CapabilityKey> = Omit<
  ActivityData,
  GovernedFieldOf<Exclude<CapabilityKey, K>>
>;

/**
 * What shared, theme-agnostic helpers accept: every governed field optional,
 * so ANY theme's narrowed `ThemeData` is assignable (and so is the full
 * `ActivityData`). Helpers already tolerate missing fields — formatters dash,
 * `isNum` guards — this type just says so.
 */
export type ActivityView = Omit<ActivityData, GovernedField> &
  Partial<Pick<ActivityData, GovernedField>>;

/**
 * How a theme paints its own background. `"opaque"` (default) is the legacy
 * behaviour — the theme fills its 1080×1350 with its photo / colour. When the
 * Hybrid frame extends a *photo-led* theme into another aspect ratio it renders
 * the theme `"transparent"` (no own photo/base fill) so the frame's full-bleed
 * photo shows seamlessly behind the content. Poster themes ignore this and stay
 * opaque (the frame mattes their own bg colour instead). See `format-frame`.
 */
export type ThemeSurface = "opaque" | "transparent";

/** Props every single-card theme component receives. */
export interface ThemeProps<
  K extends CapabilityKey = CapabilityKey,
  C = Record<string, unknown>,
> {
  /** the resolved colour scheme — colour-adjustable themes render with it;
   *  fixed-palette themes ignore it. Defaulted per theme so stories can omit. */
  colors?: ColorScheme;
  /** the theme's coerced parameter config — themes with knobs default it to
   *  their `DEFAULT_*_CONFIG`, so stories can omit it */
  config?: C;
  data: ThemeData<K>;
  /** Pan/zoom for the background photo — applied wherever a theme shows one. */
  imageTransform?: ImageTransform | null;
  photoUrl?: string | null;
  /** Background-paint mode for the Hybrid frame; defaults to `"opaque"`. */
  surface?: ThemeSurface;
}

/**
 * How a theme behaves when the Hybrid frame retargets it to another aspect
 * ratio. `backdrop` fills the letterbox bands (a seamless extension of the
 * theme's own background colour for poster themes); `photoBleed` themes are
 * photo-led — the frame draws the photo full-bleed and renders the theme
 * `"transparent"` over it.
 */
export interface ThemeFramePolicy {
  backdrop: string;
  photoBleed?: boolean;
}

/** Per-theme background-photo policy. */
export interface ThemePhotoPolicy {
  /** filter preset applied when a photo is added under this theme */
  defaultFilter?: string;
  /** film grain on by default for this theme */
  defaultGrain?: boolean;
  /** does an uploaded photo show by default when this theme is selected */
  defaultOn: boolean;
}

/**
 * The descriptor core EVERY theme shares, regardless of family: identity,
 * colour policy, photo policy, parameter specs, and the capability declaration
 * (which overlay elements the theme renders — drives the editor's visibility
 * toggles for both families). The families differ only in their render
 * strategy — a single-card theme adds a bespoke `Component`; a carousel theme
 * adds its `look` tokens + `canvas`/`panels`. "Both are just themes."
 */
export interface ThemeBase {
  colors: ThemeColorPolicy;
  defaults: Record<string, unknown>;
  /** how the theme retargets to other aspect ratios via the Hybrid frame */
  frame?: ThemeFramePolicy;
  id: string;
  label: string;
  params: ParamDef[];
  photo: ThemePhotoPolicy;
  tagline: string;
  /** overlay elements this theme renders — the visibility switches it offers */
  uses: readonly CapabilityKey[];
  /** sport-aware refinement of a declared capability (editor availability only) */
  usesWhen?: Partial<Record<CapabilityKey, (data: ActivityView) => boolean>>;
}

/** The user's effective colour choice for a theme: their pick, else the
 *  theme's default choice (photo-first themes), else its own preset scheme. */
export function effectiveChoiceFor(
  theme: ThemeBase,
  choice: ColorChoice | null
): ColorChoice {
  return (
    choice ??
    theme.colors.defaultChoice ?? {
      kind: "preset",
      scheme: theme.colors.default,
    }
  );
}

/** The erased registry-facing single-card descriptor. The single card uniquely
 *  uses its `uses` to narrow the component's `data` type (see `defineTheme`). */
export interface SingleCardTheme extends ThemeBase {
  Component: FC<ThemeProps>;
}

/**
 * Declare a single-card theme. `uses` narrows the component's `data` type via
 * `ThemeData`, so the declaration is compiler-checked against what the
 * component actually reads. `usesWhen` refines a declared capability per
 * activity (sport-aware), driving only the editor's availability.
 */
export function defineTheme<
  const K extends readonly CapabilityKey[],
  C extends Record<string, unknown> = Record<string, never>,
>(d: {
  colors: ThemeColorPolicy;
  Component: FC<ThemeProps<K[number], C>>;
  defaults?: C;
  frame?: ThemeFramePolicy;
  id: string;
  label: string;
  params?: ParamDef[];
  photo: ThemePhotoPolicy;
  tagline: string;
  uses: K;
  usesWhen?: Partial<Record<K[number], (data: ActivityView) => boolean>>;
}): SingleCardTheme {
  return {
    id: d.id,
    label: d.label,
    tagline: d.tagline,
    uses: d.uses,
    usesWhen: d.usesWhen,
    colors: d.colors,
    frame: d.frame,
    photo: d.photo,
    params: d.params ?? [],
    defaults: d.defaults ?? {},
    // reason: the registry stores all themes under one widened signature; the
    // narrow K/C generics are fully checked above, at the definition site.
    Component: d.Component as FC<ThemeProps>,
  };
}

/**
 * Strip the governed fields a theme did NOT declare, so the runtime data
 * matches the narrowed `ThemeData` type. Required text fields blank to ""
 * (mirroring `applyVisibility`); optional fields drop to undefined.
 */
export function pickThemeData(
  theme: Pick<ThemeBase, "uses">,
  data: ActivityData
): ActivityData {
  const declared = new Set(theme.uses);
  const out = { ...data };
  for (const cap of Object.keys(GOVERNED_FIELDS) as CapabilityKey[]) {
    if (declared.has(cap)) {
      continue;
    }
    for (const field of GOVERNED_FIELDS[cap]) {
      if (field === "athleteName" || field === "location") {
        out[field] = "";
      } else {
        out[field] = undefined;
      }
    }
  }
  return out;
}
