import type { ActivityData } from "@/lib/activity";
import type { CapabilityKey, ThemeBase } from "@/theme/core/theme-contract";

/**
 * Per-element visibility. Every overlay the card can show has a switch here, and
 * the key set is exactly `CapabilityKey` — every overlay element is both a
 * theme capability and a user switch. Most flags work by *stripping the
 * underlying field* before a theme renders (themes already render conditionally
 * on a field being present), so a single toggle hides the element in both Single
 * Card and Carousel with no per-theme code.
 */
export interface Visibility {
  athleteName: boolean;
  cadence: boolean;
  date: boolean;
  distance: boolean;
  /** total elevation gain (the number) */
  elevation: boolean;
  /** elevation profile chart / sparkline */
  elevationViz: boolean;
  heartRate: boolean;
  location: boolean;
  pace: boolean;
  /** use the uploaded photo as a backdrop where the theme supports it */
  photo: boolean;
  power: boolean;
  /** route silhouette / path graphic */
  route: boolean;
  speed: boolean;
  splits: boolean;
  time: boolean;
  title: boolean;
}

export const DEFAULT_VISIBILITY: Visibility = {
  title: true,
  date: true,
  location: true,
  // The athlete's name is personal; keep it off until the user opts in.
  athleteName: false,
  distance: true,
  time: true,
  pace: true,
  speed: true,
  power: true,
  elevation: true,
  heartRate: true,
  cadence: true,
  route: true,
  elevationViz: true,
  splits: true,
  photo: true,
};

const isNum = (n: number | undefined): boolean =>
  n !== undefined && Number.isFinite(n);

/**
 * Which switches address information the *current activity* actually has. Drives
 * the disabled state of the controls (computed from the raw, pre-strip data).
 */
export function availableVisibility(
  data: ActivityData
): Record<keyof Visibility, boolean> {
  const hasPace =
    (data.sport === "run" && isNum(data.avgPaceMinPerKm)) ||
    (data.sport === "swim" && isNum(data.avgPacePer100m));
  return {
    title: true,
    date: Boolean(data.date),
    location: true,
    athleteName: true,
    distance: isNum(data.distanceKm),
    time: isNum(data.durationSec),
    pace: hasPace,
    speed: isNum(data.avgSpeedKmh),
    power: isNum(data.normalizedPowerW),
    elevation: isNum(data.elevationGainM),
    heartRate: isNum(data.avgHeartRate),
    cadence: isNum(data.avgCadence),
    route: (data.routeCoordinates?.length ?? 0) > 1,
    elevationViz: (data.elevationProfile?.length ?? 0) > 1,
    splits: (data.splits?.length ?? 0) > 0,
    photo: true,
  };
}

/**
 * Strip fields the user has toggled off before handing data to a theme. Themes
 * render conditionally on these fields being truthy, so blanking them is enough
 * — distance and time included, now ordinary toggles like every other metric
 * (so `distanceKm` / `durationSec` are optional on `ActivityData`).
 */
export function applyVisibility(
  data: ActivityData,
  vis: Visibility
): ActivityData {
  return {
    ...data,
    title: vis.title ? data.title : "",
    date: vis.date ? data.date : "",
    location: vis.location ? data.location : "",
    athleteName: vis.athleteName ? data.athleteName : "",
    distanceKm: vis.distance ? data.distanceKm : undefined,
    durationSec: vis.time ? data.durationSec : undefined,
    avgHeartRate: vis.heartRate ? data.avgHeartRate : undefined,
    avgCadence: vis.cadence ? data.avgCadence : undefined,
    normalizedPowerW: vis.power ? data.normalizedPowerW : undefined,
    powerProfile: vis.power ? data.powerProfile : undefined,
    avgSpeedKmh: vis.speed ? data.avgSpeedKmh : undefined,
    maxSpeedKmh: vis.speed ? data.maxSpeedKmh : undefined,
    speedProfile: vis.speed ? data.speedProfile : undefined,
    avgPaceMinPerKm: vis.pace ? data.avgPaceMinPerKm : undefined,
    avgPacePer100m: vis.pace ? data.avgPacePer100m : undefined,
    paceProfile: vis.pace ? data.paceProfile : undefined,
    elevationGainM: vis.elevation ? data.elevationGainM : undefined,
    elevationProfile: vis.elevationViz ? data.elevationProfile : undefined,
    routeCoordinates: vis.route ? data.routeCoordinates : undefined,
    splits: vis.splits ? data.splits : undefined,
  };
}

/** Editor control state for a switch under the active theme + activity. */
export type ControlState = "hidden" | "disabled" | "enabled";

/**
 * The editor control state for every switch, for a theme + activity (BOTH
 * families), derived from the theme's capability declaration:
 *  - "hidden"   — the theme doesn't declare the capability (it never renders it,
 *                 so the editor offers no control: this removes the noise);
 *  - "disabled" — declared, but the activity has no data (or a sport-aware
 *                 `usesWhen` refinement excludes it) — shown greyed with a reason;
 *  - "enabled"  — declared and present.
 * The single source the editor gates every control by. The render pipeline
 * strips independently via `pickThemeData` (undeclared capabilities) and
 * `applyVisibility` (user toggles).
 */
export function themeControls(
  data: ActivityData,
  theme: Pick<ThemeBase, "uses" | "usesWhen">
): Record<keyof Visibility, ControlState> {
  const base = availableVisibility(data);
  const declared = new Set<CapabilityKey>(theme.uses);
  const out = {} as Record<keyof Visibility, ControlState>;
  // key is typed `keyof Visibility`; using it against the `CapabilityKey`-typed
  // `declared` / `usesWhen` makes the compiler enforce that the two vocabularies
  // stay identical.
  for (const key of Object.keys(base) as (keyof Visibility)[]) {
    if (!declared.has(key)) {
      out[key] = "hidden";
      continue;
    }
    const refine = theme.usesWhen?.[key];
    const available = base[key] && (refine ? refine(data) : true);
    out[key] = available ? "enabled" : "disabled";
  }
  return out;
}
