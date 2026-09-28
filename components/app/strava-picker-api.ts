// The Strava picker's client for our own `/api/strava/*` Route Handlers: the
// activity list, one activity's parsed detail, and the lifetime page count.
// Every body is parsed at this boundary into the picker's domain types, and
// every failure comes back as a discriminated `StravaFetchError` (never a
// throw) so the picker can show actionable per-kind copy.

import { catch as withFallback, z } from "zod/mini";

import type { ParsedActivity } from "@/lib/parse-activity";

export const PER_PAGE = 30;

/** Discriminated error shape mirrored from `stravaErrorResponse` on the
 * server. Lets the picker show actionable per-kind copy instead of a
 * generic "couldn't reach Strava (NNN)". */
export type StravaFetchError =
  | { kind: "reauth" }
  | { kind: "rate_limited"; retryAfter: number }
  | { kind: "upstream"; status: number }
  | { kind: "network"; message: string }
  | { kind: "empty_activity" };

/** One row of the activity list. Strava's display fields can come back
 *  null; they read as empty / zero here, the way the list renders them. */
const StravaSummaryActivitySchema = z.object({
  distance: withFallback(z.number(), 0),
  id: z.number(),
  moving_time: withFallback(z.number(), 0),
  name: withFallback(z.string(), ""),
  sport_type: withFallback(z.string(), ""),
  start_date: withFallback(z.string(), ""),
  total_elevation_gain: withFallback(z.nullish(z.number()), null),
});

export type StravaSummaryActivity = z.infer<typeof StravaSummaryActivitySchema>;

const ActivityListResponseSchema = z.object({
  activities: z.array(StravaSummaryActivitySchema),
});

/** An optional reading: JSON has no NaN, so a missing reading may arrive as
 *  `null` — it reads as absent, like `undefined`. */
const optionalNumber = z.optional(
  z.pipe(
    z.nullable(z.number()),
    z.transform((value) => value ?? undefined)
  )
);
const numberList = z.optional(z.array(z.number()));

/** `ParsedActivity` as the detail route serialises it (`stravaToParsed`). */
const ParsedActivitySchema = z.object({
  athleteName: z.string(),
  avgCadence: optionalNumber,
  avgHeartRate: optionalNumber,
  avgPaceMinPerKm: optionalNumber,
  avgPacePer100m: optionalNumber,
  avgSpeedKmh: optionalNumber,
  date: z.string(),
  distanceKm: z.number(),
  durationSec: z.number(),
  elevationGainM: optionalNumber,
  elevationProfile: numberList,
  endTimeMs: optionalNumber,
  location: z.string(),
  maxSpeedKmh: optionalNumber,
  paceProfile: numberList,
  routeCoordinates: z.optional(z.array(z.tuple([z.number(), z.number()]))),
  splits: z.optional(
    z.array(
      z.object({
        avgSpeedKmh: optionalNumber,
        durationSec: z.number(),
        km: optionalNumber,
        lap: optionalNumber,
      })
    )
  ),
  sport: z.enum(["ride", "run", "swim", "triathlon"]),
  startTimeMs: optionalNumber,
  stravaActivityIds: z.optional(z.array(z.nullable(z.number()))),
  stravaPhotos: z.optional(
    z.array(
      z.object({
        activityId: z.number(),
        index: z.number(),
        previewUrl: z.string(),
      })
    )
  ),
  title: z.string(),
});

const DetailResponseSchema = z.object({
  parts: z.optional(z.array(ParsedActivitySchema)),
});

const StatsResponseSchema = z.object({
  totalPages: z.optional(z.number()),
});

const ServerErrorEnvelopeSchema = z.object({
  error: z.optional(z.string()),
  retryAfter: z.optional(z.number()),
  status: z.optional(z.number()),
});

type ServerErrorEnvelope = z.infer<typeof ServerErrorEnvelopeSchema>;

export type LoadResult =
  | { kind: "ok"; activities: StravaSummaryActivity[] }
  | { kind: "err"; error: StravaFetchError };

export type DetailResult =
  | { kind: "ok"; parts: ParsedActivity[] }
  | { kind: "err"; error: StravaFetchError };

const UNEXPECTED_RESPONSE: StravaFetchError = {
  kind: "network",
  message: "Unexpected response from the server.",
};

const readErrorEnvelope = async (
  res: Response
): Promise<ServerErrorEnvelope> => {
  try {
    const parsed = ServerErrorEnvelopeSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
};

/** `Retry-After` in seconds, or undefined when the header is absent or junk —
 *  `Number(null)` is 0, which would otherwise read as a valid delay. */
const retryAfterHeader = (headers: Headers): number | undefined => {
  const raw = headers.get("retry-after");
  if (raw === null || raw === "") {
    return undefined;
  }
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
};

const toFetchError = (
  res: Response,
  envelope: ServerErrorEnvelope
): StravaFetchError => {
  if (res.status === 401 || envelope.error === "not_connected") {
    return { kind: "reauth" };
  }
  if (res.status === 429 || envelope.error === "rate_limited") {
    return {
      kind: "rate_limited",
      // Server may compute a fresh retryAfter; fall back to the response
      // header if it didn't set one.
      retryAfter: envelope.retryAfter ?? retryAfterHeader(res.headers) ?? 60,
    };
  }
  return {
    kind: "upstream",
    status: envelope.status ?? res.status,
  };
};

/** The failure a thrown fetch (or body read) becomes. */
const networkError = (message: string | undefined): StravaFetchError => ({
  kind: "network",
  message: message ?? "Network error.",
});

export const fetchActivities = async (page: number): Promise<LoadResult> => {
  try {
    const res = await fetch(
      `/api/strava/activities?page=${page}&per_page=${PER_PAGE}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      return {
        error: toFetchError(res, await readErrorEnvelope(res)),
        kind: "err",
      };
    }
    const data = ActivityListResponseSchema.safeParse(await res.json());
    if (!data.success) {
      return { error: UNEXPECTED_RESPONSE, kind: "err" };
    }
    return { activities: data.data.activities, kind: "ok" };
  } catch (error) {
    return {
      error: networkError(error instanceof Error ? error.message : undefined),
      kind: "err",
    };
  }
};

export const fetchDetail = async (id: number): Promise<DetailResult> => {
  try {
    const res = await fetch(`/api/strava/activity/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return {
        error: toFetchError(res, await readErrorEnvelope(res)),
        kind: "err",
      };
    }
    const data = DetailResponseSchema.safeParse(await res.json());
    if (!data.success) {
      return { error: UNEXPECTED_RESPONSE, kind: "err" };
    }
    const { parts } = data.data;
    if (parts === undefined || parts.length === 0) {
      return { error: { kind: "empty_activity" }, kind: "err" };
    }
    return { kind: "ok", parts };
  } catch (error) {
    return {
      error: networkError(error instanceof Error ? error.message : undefined),
      kind: "err",
    };
  }
};

export const fetchTotalPages = async (): Promise<number | null> => {
  // Stats is a hint, not load-bearing — silently fall back to the
  // page-is-full heuristic when it fails (rate-limit or upstream).
  try {
    const res = await fetch("/api/strava/stats", { cache: "no-store" });
    if (!res.ok) {
      return null;
    }
    const data = StatsResponseSchema.safeParse(await res.json());
    return data.success ? (data.data.totalPages ?? null) : null;
  } catch {
    return null;
  }
};
