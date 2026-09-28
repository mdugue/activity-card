import { z } from "zod/mini";

import { detectSport, finalise } from "./parse-shared";
import type { FinaliseInput, ParsedActivity, TrackPoint } from "./parse-shared";
import type { StravaActivity, StravaStreams } from "./strava-schemas";
import { hasText } from "./text";

const MPS_TO_KMH = 3.6;

const NumberSample = z.number();
const LatLngSample = z.tuple([z.number(), z.number()]);

/**
 * Decode one stream channel sample by sample. A missing channel is `null`;
 * a sample that isn't what the channel carries reads as `undefined`, like a
 * gap in the recording.
 */
const decodeChannel = <T>(
  stream: StravaStreams[string] | undefined,
  sample: z.ZodMiniType<T>
): (T | undefined)[] | null => {
  if (stream === undefined) {
    return null;
  }
  return stream.data.map((value) => {
    const result = sample.safeParse(value);
    return result.success ? result.data : undefined;
  });
};

/** Strava leaves absent fields `null` or out; both mean "not recorded". */
const present = <T>(value: T | null | undefined): T | undefined =>
  value ?? undefined;

/** Convert a recorded value; `undefined` when Strava didn't record it. */
const convert = (
  value: number | null | undefined,
  to: (recorded: number) => number
): number | undefined =>
  value === null || value === undefined ? undefined : to(value);

const mpsToKmh = (mps: number): number => mps * MPS_TO_KMH;

/**
 * Zip the stream channels into track points. Strava `time` is seconds
 * offset from `start_date`; it becomes absolute epoch ms (`startMs`) so
 * `finalise()` can derive start/end correctly.
 */
const streamPoints = (
  streams: StravaStreams,
  startMs: number | undefined
): TrackPoint[] => {
  const latlng = decodeChannel(streams.latlng, LatLngSample);
  const altitude = decodeChannel(streams.altitude, NumberSample);
  const heartrate = decodeChannel(streams.heartrate, NumberSample);
  const cadence = decodeChannel(streams.cadence, NumberSample);
  const time = decodeChannel(streams.time, NumberSample);

  // Strava normally returns equally-sized streams, but we defensively
  // take the smallest non-zero length so a partial stream doesn't
  // produce phantom points (undefined lat/lng with defined elevation,
  // etc.) that skew downstream averages.
  const lengths = [latlng, altitude, heartrate, cadence, time]
    .map((channel) => channel?.length ?? 0)
    .filter((n) => n > 0);
  const length = lengths.length === 0 ? 0 : Math.min(...lengths);

  const points: TrackPoint[] = [];
  for (let i = 0; i < length; i += 1) {
    const ll = latlng?.[i];
    const offsetSec = time?.[i];
    // Emit raw lat/lng. `finalise()` applies the [lng, -lat] projection in
    // exactly one place — pre-negating here would silently flip the route.
    points.push({
      cadence: cadence?.[i],
      elevation: altitude?.[i],
      heartRate: heartrate?.[i],
      lat: ll?.[0],
      lng: ll?.[1],
      time:
        offsetSec !== undefined && startMs !== undefined
          ? startMs + offsetSec * 1000
          : undefined,
    });
  }
  return points;
};

/** The session summary fields `finalise()` prefers over stream-derived ones. */
const sessionSummary = (
  detail: StravaActivity
): Omit<FinaliseInput, "name" | "points" | "sport"> => ({
  isoDate: present(detail.start_date),
  sessionAvgCadence: present(detail.average_cadence),
  sessionAvgHr: present(detail.average_heartrate),
  sessionAvgSpeedKmh: convert(detail.average_speed, mpsToKmh),
  sessionDistanceKm: convert(detail.distance, (m) => m / 1000),
  sessionDurationSec: detail.moving_time ?? present(detail.elapsed_time),
  sessionElevationM: present(detail.total_elevation_gain),
  sessionMaxSpeedKmh: convert(detail.max_speed, mpsToKmh),
});

/**
 * Map a Strava activity detail + streams into one or more `ParsedActivity`
 * objects. Single sports return a length-1 array. Triathlon / Multisport
 * activities are returned as a length-1 triathlon for now — Strava packages
 * sub-segments differently per sport and reliable splitting needs the
 * `/activities/{id}/laps` endpoint, which we defer.
 */
export const stravaToParsed = (
  detail: StravaActivity,
  streams: StravaStreams
): ParsedActivity[] => {
  // The generated spec types mark these optional; the live API always sends
  // them, but coalesce so we stay type-safe and never pass `undefined` on.
  const name = detail.name ?? "";
  const sportRaw = hasText(detail.sport_type)
    ? detail.sport_type
    : present(detail.type);
  const sport = detectSport(sportRaw, name);

  const startMs = hasText(detail.start_date)
    ? new Date(detail.start_date).getTime()
    : undefined;

  const parsed = finalise({
    ...sessionSummary(detail),
    name,
    points: streamPoints(streams, startMs),
    sport,
  });

  // Overlay Strava-provided fields the finalise pipeline can't infer.
  // `start_date_local` is wall-clock time with a misleading `Z`, so its first
  // 10 chars are the local calendar date. It is overlaid rather than passed
  // as `isoDate`, which must stay the real instant (`start_date`) because
  // `finalise` derives `startTimeMs` from it for triathlon ordering.
  if (hasText(detail.start_date_local)) {
    parsed.date = detail.start_date_local.slice(0, 10);
  }
  const athleteName = [detail.athlete?.firstname, detail.athlete?.lastname]
    .filter(hasText)
    .join(" ");
  if (athleteName !== "") {
    parsed.athleteName = athleteName;
  }
  const location = [detail.location_city, detail.location_country]
    .filter(hasText)
    .join(", ");
  if (location !== "") {
    parsed.location = location;
  }
  // Carry the Strava activity id forward so the UI can render a
  // "View on Strava" link (§3 of the brand guidelines).
  if (detail.id !== null && detail.id !== undefined) {
    parsed.stravaActivityIds = [detail.id];
  }

  return [parsed];
};
