// `catch` is renamed on import: as a `z.catch` member call it reads like
// `Promise#catch` to the promise lint rules.
import { catch as withFallback, z } from "zod/mini";

/**
 * Runtime schemas for the Strava API responses the route handlers consume,
 * parsed once at the fetch boundary (`stravaFetch`) into the domain types
 * below. Only the fields the app reads are modelled; everything else is
 * stripped.
 *
 * The live API is looser than its Swagger spec (display fields come back
 * `null`, fields go missing), so every field is lenient: a present value of
 * the right type is kept, `null` / missing stay `null` / missing, and a value
 * of an unexpected type reads as `null` rather than failing the whole
 * response. Only a body that isn't the expected container (object / array)
 * is rejected.
 */
export const lenient = <T extends z.core.SomeType>(schema: T) =>
  withFallback(z.nullish(schema), null);

const lenientNumber = lenient(z.number());
const lenientString = lenient(z.string());

/** One activity of `/athlete/activities` — the fields the picker lists. */
const StravaActivitySummarySchema = z.object({
  distance: lenientNumber,
  id: lenientNumber,
  map: lenient(z.object({ summary_polyline: lenientString })),
  moving_time: lenientNumber,
  name: lenientString,
  sport_type: lenientString,
  start_date: lenientString,
  total_elevation_gain: lenientNumber,
});

export const StravaActivitySummaryListSchema = z.array(
  StravaActivitySummarySchema
);

/** `/activities/{id}` — the fields `stravaToParsed` maps. */
export const StravaActivitySchema = z.object({
  athlete: lenient(
    z.object({ firstname: lenientString, lastname: lenientString })
  ),
  average_cadence: lenientNumber,
  average_heartrate: lenientNumber,
  average_speed: lenientNumber,
  distance: lenientNumber,
  elapsed_time: lenientNumber,
  id: lenientNumber,
  location_city: lenientString,
  location_country: lenientString,
  max_speed: lenientNumber,
  moving_time: lenientNumber,
  name: lenientString,
  sport_type: lenientString,
  start_date: lenientString,
  start_date_local: lenientString,
  total_elevation_gain: lenientNumber,
  type: lenientString,
});

export type StravaActivity = z.infer<typeof StravaActivitySchema>;

/**
 * `/activities/{id}/streams?key_by_type=true`: channel name → samples. The
 * samples stay unparsed here; `stravaToParsed` decodes each channel it reads
 * sample by sample, so one odd value can't drop a whole stream.
 */
export const StravaStreamsSchema = z.record(
  z.string(),
  z.object({ data: z.array(z.unknown()), type: z.optional(z.string()) })
);

export type StravaStreams = z.infer<typeof StravaStreamsSchema>;

/** `/athletes/{id}/stats` — only the lifetime counts. */
const StravaTotalsSchema = lenient(z.object({ count: lenientNumber }));

export const StravaAthleteStatsSchema = z.object({
  all_ride_totals: StravaTotalsSchema,
  all_run_totals: StravaTotalsSchema,
  all_swim_totals: StravaTotalsSchema,
});

/**
 * One item of `/activities/{id}/photos?size=N&photo_sources=true`. The
 * Swagger spec doesn't model this endpoint; the shape is observed from the
 * live API — `urls` is keyed by the requested size.
 */
const StravaPhotoSchema = z.object({
  urls: lenient(z.record(z.string(), z.string())),
});

export const StravaPhotoListSchema = z.array(StravaPhotoSchema);
