import type { components } from "./strava-api.generated";

/**
 * Strava model types.
 *
 * Base shapes are derived from the official Swagger spec via
 * `bun run strava:types` (see `lib/strava-api.generated.ts`). That spec lags
 * the live API in a few places, so we layer the missing fields back on rather
 * than hand-maintaining the whole model. Keep additions in `ActivityExtras`
 * with a note on why the generated type doesn't cover them.
 */
type Schemas = components["schemas"];

/**
 * Fields the live `/activities/{id}` response returns but the Swagger spec
 * omits (it only lists `average_*heartrate`/`*cadence` on segment efforts and
 * has no location fields). `athlete` is `MetaAthlete` (id only) in the spec;
 * the firstname/lastname overlay in `stravaToParsed` is defensive.
 */
interface ActivityExtras {
  athlete?: { firstname?: string; lastname?: string };
  average_cadence?: number;
  average_heartrate?: number;
  location_city?: string;
  location_country?: string;
}

export type StravaActivityDetail = Schemas["DetailedActivity"] & ActivityExtras;

/**
 * Stream payloads (channel name → samples), as parsed at the fetch boundary.
 * We always request `key_by_type=true` and decode each channel's `.data`
 * sample by sample, so a permissive record is more practical than the
 * generated `StreamSet` (whose per-channel `data` is optional and strongly
 * typed, which the parser doesn't need).
 */
export type { StravaStreams } from "./strava-schemas";
