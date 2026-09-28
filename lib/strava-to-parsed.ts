import { detectSport, finalise } from "./parse-shared";
import type { ParsedActivity, TrackPoint } from "./parse-shared";
import type {
  StravaActivityDetail,
  StravaStream,
  StravaStreams,
} from "./strava-types";

const MPS_TO_KMH = 3.6;

// The type parameter names what the caller expects of an `unknown` upstream
// stream; there is deliberately no relation to the argument type.
// oxlint-disable-next-line typescript/no-unnecessary-type-parameters
const pickArray = <T>(
  stream: StravaStream<unknown> | undefined
): T[] | null => {
  if (!(stream && Array.isArray(stream.data))) {
    return null;
  }
  return stream.data as T[];
};

/**
 * Map a Strava activity detail + streams into one or more `ParsedActivity`
 * objects. Single sports return a length-1 array. Triathlon / Multisport
 * activities are returned as a length-1 triathlon for now — Strava packages
 * sub-segments differently per sport and reliable splitting needs the
 * `/activities/{id}/laps` endpoint, which we defer.
 */
export const stravaToParsed = (
  detail: StravaActivityDetail,
  streams: StravaStreams
): ParsedActivity[] => {
  // The generated spec types mark these optional; the live API always sends
  // them, but coalesce so we stay type-safe and never pass `undefined` on.
  const name = detail.name ?? "";
  const sportRaw = detail.sport_type || detail.type;
  const sport = detectSport(sportRaw, name);

  const latlng = pickArray<[number, number]>(streams.latlng);
  const altitude = pickArray<number>(streams.altitude);
  const heartrate = pickArray<number>(streams.heartrate);
  const cadence = pickArray<number>(streams.cadence);
  const time = pickArray<number>(streams.time);

  // Strava `time` stream is seconds offset from `start_date`. Convert to
  // absolute epoch ms so `finalise()` can derive start/end correctly.
  const startMs = detail.start_date
    ? new Date(detail.start_date).getTime()
    : undefined;

  // Strava normally returns equally-sized streams, but we defensively
  // take the smallest non-zero length so a partial stream doesn't
  // produce phantom points (undefined lat/lng with defined elevation,
  // etc.) that skew downstream averages.
  const lengths = [
    latlng?.length,
    altitude?.length,
    heartrate?.length,
    cadence?.length,
    time?.length,
  ].filter((n): n is number => typeof n === "number" && n > 0);
  const length = lengths.length === 0 ? 0 : Math.min(...lengths);

  const points: TrackPoint[] = [];
  for (let i = 0; i < length; i++) {
    const ll = latlng?.[i];
    // Emit raw lat/lng. `finalise()` applies the [lng, -lat] projection in
    // exactly one place — pre-negating here would silently flip the route.
    points.push({
      cadence: cadence?.[i],
      elevation: altitude?.[i],
      heartRate: heartrate?.[i],
      lat: ll?.[0],
      lng: ll?.[1],
      time:
        time?.[i] !== undefined && startMs !== undefined
          ? startMs + time[i] * 1000
          : undefined,
    });
  }

  const location = [detail.location_city, detail.location_country]
    .filter(Boolean)
    .join(", ");

  const parsed = finalise({
    isoDate: detail.start_date,
    name,
    points,
    sessionAvgCadence: detail.average_cadence,
    sessionAvgHr: detail.average_heartrate,
    sessionAvgSpeedKmh:
      detail.average_speed === undefined
        ? undefined
        : detail.average_speed * MPS_TO_KMH,
    sessionDistanceKm:
      detail.distance === undefined ? undefined : detail.distance / 1000,
    sessionDurationSec: detail.moving_time ?? detail.elapsed_time,
    sessionElevationM: detail.total_elevation_gain,
    sessionMaxSpeedKmh:
      detail.max_speed === undefined
        ? undefined
        : detail.max_speed * MPS_TO_KMH,
    sport,
  });

  // Overlay Strava-provided fields the finalise pipeline can't infer.
  // `start_date_local` is wall-clock time with a misleading `Z`, so its first
  // 10 chars are the local calendar date. It is overlaid rather than passed
  // as `isoDate`, which must stay the real instant (`start_date`) because
  // `finalise` derives `startTimeMs` from it for triathlon ordering.
  if (detail.start_date_local) {
    parsed.date = detail.start_date_local.slice(0, 10);
  }
  const athleteName = [detail.athlete?.firstname, detail.athlete?.lastname]
    .filter(Boolean)
    .join(" ");
  if (athleteName) {
    parsed.athleteName = athleteName;
  }
  if (location) {
    parsed.location = location;
  }
  // Carry the Strava activity id forward so the UI can render a
  // "View on Strava" link (§3 of the brand guidelines).
  if (detail.id !== undefined) {
    parsed.stravaActivityIds = [detail.id];
  }

  return [parsed];
};
