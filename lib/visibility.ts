import type { ActivityData } from "@/lib/activity";

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
  /** carousel: print the "made with effort" mark on the wrap-up slide */
  showEffort: boolean;
  /** carousel: print the "01 / 04" slide index on every slide */
  showPageNumber: boolean;
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
  photoBackdrop: true,
  // Carousel chrome — off by default so a deck reads as a clean art piece.
  showEffort: false,
  showPageNumber: false,
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
    photoBackdrop: true,
    showEffort: true,
    showPageNumber: true,
  };
}

/**
 * Strip fields the user has toggled off before handing data to a theme. Themes
 * render conditionally on these fields being truthy, so blanking them is enough.
 * Distance and time are never stripped here (they stay valid for the single
 * card's core layout); the carousel honours those two in its stat builder.
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
