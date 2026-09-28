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
  /** run, float minutes */
  avgPaceMinPerKm?: number;
  /** swim, seconds */
  avgPacePer100m?: number;
  /** bike */
  avgSpeedKmh?: number;
  distanceKm: number;
  durationSec: number;
  elevationGainM?: number;
  elevationProfile?: number[];
  paceProfile?: number[];
  routeCoordinates?: Coord[];
  sport: "swim" | "bike" | "run";
}

export interface Split {
  /** ride splits */
  avgSpeedKmh?: number;
  durationSec: number;
  /** per-km splits for run / ride */
  km?: number;
  /** per-lap for swim */
  lap?: number;
}

export interface Zone {
  pct: number;
  zone: string;
}

export interface Transition {
  durationSec: number;
  /** "T1", "T2", … */
  name: string;
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
  /** run, float minutes (4.95 = 4:57/km) */
  avgPaceMinPerKm?: number;
  /** swim, integer seconds */
  avgPacePer100m?: number;

  /** ride */
  avgSpeedKmh?: number;
  /** ISO date string; format at render */
  date: string;

  distanceKm: number;
  durationSec: number;
  elevationGainM?: number;
  elevationProfile?: number[];
  hrZones?: Zone[];
  /** swim, sec/100m per lap */
  lapPacesPer100m?: number[];
  location: string;
  /** ride */
  maxSpeedKmh?: number;
  /** ride */
  normalizedPowerW?: number;
  /** run, sec/km */
  paceProfile?: number[];
  /** ride, watts sampled over the activity */
  powerProfile?: number[];
  powerZones?: Zone[];

  routeCoordinates?: Coord[];

  segments?: TriSegment[];
  /** Where this activity came from. Drives provider attribution (the
   * app-wide footer) and conditional UI like "View on Strava" links. */
  source?: ActivitySource;
  /** ride, km/h sampled over the activity */
  speedProfile?: number[];
  splits?: Split[];
  sport: Sport;
  /** Strava activity ids for "View on Strava" linking. Single Strava
   * activity → `[id]`. Combined triathlon → segment-aligned with `null`
   * entries for file-sourced parts. Unset for pure GPX/.fit uploads. */
  stravaActivityIds?: (number | null)[];
  /** Photos Strava attached to the activity, offered as one-click
   * backgrounds. Unset for uploads and photo-less activities. */
  stravaPhotos?: StravaPhotoRef[];
  /** swim */
  strokeCountAvg?: number;
  /** swim */
  swolf?: number;
  title: string;
  transitions?: Transition[];
  /** ride: vertical metres / hour (label kept "mph" for legacy) */
  vamMph?: number;
}
