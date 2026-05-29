import {
  detectSport,
  finalise,
  type ParsedActivity,
  type TrackPoint,
} from "./parse-shared";

export interface StravaActivityDetail {
  athlete?: { firstname?: string; lastname?: string };
  average_cadence?: number;
  average_heartrate?: number;
  average_speed?: number; // m/s
  distance?: number; // meters
  elapsed_time?: number; // seconds
  id: number;
  location_city?: string;
  location_country?: string;
  max_speed?: number; // m/s
  moving_time?: number; // seconds
  name: string;
  sport_type?: string;
  start_date?: string; // ISO
  total_elevation_gain?: number; // meters
  type?: string;
}

interface StravaStream<T> {
  data: T[];
  original_size?: number;
  resolution?: string;
  series_type?: string;
  type: string;
}

export type StravaStreams = Record<string, StravaStream<unknown>>;

const MPS_TO_KMH = 3.6;

/**
 * Map a Strava activity detail + streams into one or more `ParsedActivity`
 * objects. Single sports return a length-1 array. Triathlon / Multisport
 * activities are returned as a length-1 triathlon for now — Strava packages
 * sub-segments differently per sport and reliable splitting needs the
 * `/activities/{id}/laps` endpoint, which we defer.
 */
export function stravaToParsed(
  detail: StravaActivityDetail,
  streams: StravaStreams
): ParsedActivity[] {
  const sportRaw = detail.sport_type || detail.type;
  const sport = detectSport(sportRaw, detail.name);

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

  const length = Math.max(
    latlng?.length ?? 0,
    altitude?.length ?? 0,
    heartrate?.length ?? 0,
    cadence?.length ?? 0,
    time?.length ?? 0
  );

  const points: TrackPoint[] = [];
  for (let i = 0; i < length; i++) {
    const ll = latlng?.[i];
    // Emit raw lat/lng. `finalise()` applies the [lng, -lat] projection in
    // exactly one place — pre-negating here would silently flip the route.
    points.push({
      lat: ll?.[0],
      lng: ll?.[1],
      elevation: altitude?.[i],
      heartRate: heartrate?.[i],
      cadence: cadence?.[i],
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
    points,
    sport,
    name: detail.name,
    isoDate: detail.start_date,
    sessionDistanceKm:
      detail.distance === undefined ? undefined : detail.distance / 1000,
    sessionDurationSec: detail.moving_time ?? detail.elapsed_time,
    sessionElevationM: detail.total_elevation_gain,
    sessionAvgSpeedKmh:
      detail.average_speed === undefined
        ? undefined
        : detail.average_speed * MPS_TO_KMH,
    sessionMaxSpeedKmh:
      detail.max_speed === undefined
        ? undefined
        : detail.max_speed * MPS_TO_KMH,
    sessionAvgHr: detail.average_heartrate,
    sessionAvgCadence: detail.average_cadence,
  });

  // Overlay Strava-provided fields the finalise pipeline can't infer.
  const athleteName = [detail.athlete?.firstname, detail.athlete?.lastname]
    .filter(Boolean)
    .join(" ");
  if (athleteName) {
    parsed.athleteName = athleteName;
  }
  if (location) {
    parsed.location = location;
  }

  return [parsed];
}

function pickArray<T>(stream: StravaStream<unknown> | undefined): T[] | null {
  if (!(stream && Array.isArray(stream.data))) {
    return null;
  }
  return stream.data as T[];
}
