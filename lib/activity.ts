/**
 * The canonical activity domain model — the shape every theme, planner, and
 * parser consumes. Numerics are stored raw (seconds, km, float minutes, integer
 * sec/100m); themes call `lib/format.ts` to render. Route coordinates live in
 * normalised x/y for the samples and in `[lng, -lat]` for parsed files —
 * `chart-helpers.ts` only cares about bbox-relative positions.
 *
 * (Sample fixtures live in `components/app/sample-data.ts`.)
 */

export type Sport = "ride" | "run" | "swim" | "triathlon";

export type Coord = [number, number];

export interface TriSegment {
  avgPaceMinPerKm?: number; // run, float minutes
  avgPacePer100m?: number; // swim, seconds
  avgSpeedKmh?: number; // bike
  distanceKm: number;
  durationSec: number;
  elevationGainM?: number;
  elevationProfile?: number[];
  paceProfile?: number[];
  routeCoordinates?: Coord[];
  sport: "swim" | "bike" | "run";
}

export interface Split {
  avgSpeedKmh?: number; // ride splits
  durationSec: number;
  km?: number; // per-km splits for run / ride
  lap?: number; // per-lap for swim
}

export interface Zone {
  pct: number;
  zone: string;
}

export interface Transition {
  durationSec: number;
  name: string; // "T1", "T2", …
}

export type ActivitySource = "upload" | "strava";

/**
 * A photo Strava attached to the activity. The preview URL renders directly
 * in pickers (`<img>`, never exported); activating a photo downloads the
 * full-size image through `/api/strava/photo` (same-origin, so the export
 * canvas stays untainted) and feeds it through the normal File pipeline.
 */
export interface StravaPhotoRef {
  /** Strava activity the photo belongs to (the proxy's fetch key). */
  activityId: number;
  /** Index within that activity's photo list. */
  index: number;
  /** Small CDN URL for thumbnails. */
  previewUrl: string;
}

export interface ActivityData {
  athleteName: string;
  avgCadence?: number;
  avgHeartRate?: number;
  avgPaceMinPerKm?: number; // run, float minutes (4.95 = 4:57/km)
  avgPacePer100m?: number; // swim, integer seconds

  avgSpeedKmh?: number; // ride
  date: string; // ISO date string; format at render

  // Optional like every other metric: a theme may not declare distance/time,
  // and the user may toggle them off — both strip the field to `undefined`.
  distanceKm?: number;
  durationSec?: number;
  elevationGainM?: number;
  elevationProfile?: number[];
  hrZones?: Zone[];
  lapPacesPer100m?: number[]; // swim, sec/100m per lap
  location: string;
  maxSpeedKmh?: number; // ride
  normalizedPowerW?: number; // ride
  paceProfile?: number[]; // run, sec/km
  powerProfile?: number[]; // ride, watts sampled over the activity
  powerZones?: Zone[];

  routeCoordinates?: Coord[];

  segments?: TriSegment[];
  /** Where this activity came from. Drives provider attribution (the
   * app-wide footer) and conditional UI like "View on Strava" links. */
  source?: ActivitySource;
  speedProfile?: number[]; // ride, km/h sampled over the activity
  splits?: Split[];
  sport: Sport;
  /** Strava activity ids for "View on Strava" linking. Single Strava
   * activity → `[id]`. Combined triathlon → segment-aligned with `null`
   * entries for file-sourced parts. Unset for pure GPX/.fit uploads. */
  stravaActivityIds?: (number | null)[];
  /** Photos Strava attached to the activity, offered as one-click
   * backgrounds. Unset for uploads and photo-less activities. */
  stravaPhotos?: StravaPhotoRef[];
  strokeCountAvg?: number; // swim
  swolf?: number; // swim
  title: string;
  transitions?: Transition[];
  vamMph?: number; // ride: vertical metres / hour (label kept "mph" for legacy)
}
