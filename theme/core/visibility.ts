import type { ActivityData } from "@/lib/activity";
import { CAPABILITY_KEYS } from "@/theme/core/theme-contract";
import type { CapabilityKey, ThemeBase } from "@/theme/core/theme-contract";

/**
 * Per-element visibility. Every overlay the card can show has a switch here.
 * Most flags work by *stripping the underlying field* before a theme renders
 * (themes already render conditionally on a field being present), so a single
 * toggle hides the element in both Single Card and Carousel with no per-theme
 * code. Distance and time are the irreducible core of a single card, so those
 * two are honoured by the carousel stat builder rather than by stripping.
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
  /** single card: use the uploaded photo as a backdrop where supported */
  photoBackdrop: boolean;
  power: boolean;
  /** route silhouette / path graphic */
  route: boolean;
  speed: boolean;
  splits: boolean;
  time: boolean;
  title: boolean;
}

export const DEFAULT_VISIBILITY: Visibility = {
  // The athlete's name is personal; keep it off until the user opts in.
  athleteName: false,
  cadence: true,
  date: true,
  distance: true,
  elevation: true,
  elevationViz: true,
  heartRate: true,
  location: true,
  pace: true,
  photoBackdrop: true,
  power: true,
  route: true,
  speed: true,
  splits: true,
  time: true,
  title: true,
};

const isNum = (n: number | undefined): boolean =>
  n !== undefined && Number.isFinite(n);

/**
 * Which switches address information the *current activity* actually has. Drives
 * the disabled state of the controls (computed from the raw, pre-strip data).
 */
export const availableVisibility = (
  data: ActivityData
): Record<keyof Visibility, boolean> => {
  const hasPace =
    (data.sport === "run" && isNum(data.avgPaceMinPerKm)) ||
    (data.sport === "swim" && isNum(data.avgPacePer100m));
  return {
    athleteName: true,
    cadence: isNum(data.avgCadence),
    date: Boolean(data.date),
    distance: isNum(data.distanceKm),
    elevation: isNum(data.elevationGainM),
    elevationViz: (data.elevationProfile?.length ?? 0) > 1,
    heartRate: isNum(data.avgHeartRate),
    location: true,
    pace: hasPace,
    photoBackdrop: true,
    power: isNum(data.normalizedPowerW),
    route: (data.routeCoordinates?.length ?? 0) > 1,
    speed: isNum(data.avgSpeedKmh),
    splits: (data.splits?.length ?? 0) > 0,
    time: isNum(data.durationSec),
    title: true,
  };
};

/**
 * Strip fields the user has toggled off before handing data to a theme. Themes
 * render conditionally on these fields being truthy, so blanking them is enough.
 * Distance and time are never stripped here (they stay valid for the single
 * card's core layout); the carousel honours those two in its stat builder.
 */
export const applyVisibility = (
  data: ActivityData,
  vis: Visibility
): ActivityData => ({
  ...data,
  athleteName: vis.athleteName ? data.athleteName : "",
  avgCadence: vis.cadence ? data.avgCadence : undefined,
  avgHeartRate: vis.heartRate ? data.avgHeartRate : undefined,
  avgPaceMinPerKm: vis.pace ? data.avgPaceMinPerKm : undefined,
  avgPacePer100m: vis.pace ? data.avgPacePer100m : undefined,
  avgSpeedKmh: vis.speed ? data.avgSpeedKmh : undefined,
  date: vis.date ? data.date : "",
  elevationGainM: vis.elevation ? data.elevationGainM : undefined,
  elevationProfile: vis.elevationViz ? data.elevationProfile : undefined,
  // Swim laps are a pace series too (the `pace` capability declares them) and
  // the shared profile signal falls back to them, so they hide with pace.
  lapPacesPer100m: vis.pace ? data.lapPacesPer100m : undefined,
  location: vis.location ? data.location : "",
  maxSpeedKmh: vis.speed ? data.maxSpeedKmh : undefined,
  normalizedPowerW: vis.power ? data.normalizedPowerW : undefined,
  paceProfile: vis.pace ? data.paceProfile : undefined,
  powerProfile: vis.power ? data.powerProfile : undefined,
  routeCoordinates: vis.route ? data.routeCoordinates : undefined,
  speedProfile: vis.speed ? data.speedProfile : undefined,
  splits: vis.splits ? data.splits : undefined,
  title: vis.title ? data.title : "",
});

/**
 * Which visibility switches apply for a theme + activity (BOTH families),
 * derived entirely from the theme's capability declaration: the activity has
 * the data AND the theme declared the capability AND any sport-aware `usesWhen`
 * refinement holds. Replaces both `THEME_META.usesX` (single card) and
 * `carouselVisibilityAvailable` (which derived the same answer by inspecting
 * the now-deleted stat planner).
 */
export const themeAvailability = (
  data: ActivityData,
  theme: Pick<ThemeBase, "uses" | "usesWhen">
): Record<keyof Visibility, boolean> => {
  const base = availableVisibility(data);
  const declared = new Set<CapabilityKey>(theme.uses);
  const out = { ...base };
  // Non-capability switches (title/date/distance/time/photoBackdrop/marks) are
  // never theme-gated; capability switches gate on declaration + refinement.
  for (const key of CAPABILITY_KEYS) {
    if (!declared.has(key)) {
      out[key] = false;
      continue;
    }
    const refine = theme.usesWhen?.[key];
    out[key] &&= refine ? refine(data) : true;
  }
  return out;
};
