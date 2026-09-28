/**
 * FIT parser. Statically imports `fit-file-parser` and `zod/mini`; both
 * land in this module's chunk so the GPX path never pays for them.
 * Reached via dynamic import from `parse-activity.ts`.
 */

import FitParser from "fit-file-parser";
import { z } from "zod/mini";

import { detectSport, finalise } from "./parse-shared";
import type { ParsedActivity, TrackPoint } from "./parse-shared";

const FIT_EXT_RE = /\.fit$/iu;

const DateLike = z.union([z.string(), z.date()]);

const FitSessionSchema = z.object({
  avg_cadence: z.optional(z.number()),
  avg_heart_rate: z.optional(z.number()),
  avg_running_cadence: z.optional(z.number()),
  avg_speed: z.optional(z.number()),
  max_speed: z.optional(z.number()),
  sport: z.optional(z.string()),
  start_time: z.optional(DateLike),
  sub_sport: z.optional(z.string()),
  total_ascent: z.optional(z.number()),
  total_distance: z.optional(z.number()),
  total_elapsed_time: z.optional(z.number()),
});

const FitRecordSchema = z.object({
  altitude: z.optional(z.number()),
  cadence: z.optional(z.number()),
  enhanced_altitude: z.optional(z.number()),
  heart_rate: z.optional(z.number()),
  position_lat: z.optional(z.number()),
  position_long: z.optional(z.number()),
  timestamp: z.optional(DateLike),
});

const FitDataSchema = z.object({
  // `mode: "list"` puts sessions at the top level; only `cascade` / `both`
  // nest them under `activity`. Accept both so the mode can't silently drop
  // every session field again.
  activity: z.optional(
    z.object({
      sessions: z.optional(z.array(FitSessionSchema)),
    })
  ),
  records: z.optional(z.array(FitRecordSchema)),
  sessions: z.optional(z.array(FitSessionSchema)),
});


/** FIT timestamps arrive as a Date or an ISO string; drop unparseable ones. */
const timestampMs = (value: string | Date): number | undefined => {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : undefined;
};

type FitRecord = z.infer<typeof FitRecordSchema>;
type FitSession = z.infer<typeof FitSessionSchema>;

/** Positioned records become track points; the rest carry no route. */
const recordPoints = (records: FitRecord[]): TrackPoint[] =>
  records.flatMap((r) =>
    r.position_lat === undefined || r.position_long === undefined
      ? []
      : [
          {
            cadence: r.cadence,
            // Newer devices only write `enhanced_altitude`.
            elevation: r.enhanced_altitude ?? r.altitude,
            heartRate: r.heart_rate,
            lat: r.position_lat,
            lng: r.position_long,
            time:
              r.timestamp === undefined ? undefined : timestampMs(r.timestamp),
          },
        ]
  );

/** Cycling cadence, else running cadence: a `0` means "not recorded". */
const sessionCadence = (session: FitSession | undefined): number | undefined => {
  const cadence = session?.avg_cadence;
  return cadence === undefined || cadence === 0
    ? session?.avg_running_cadence
    : cadence;
};

/**
 * Map fit-file-parser's `mode: "list"` output (lengths in metres, speeds in
 * km/h) to a `ParsedActivity`. Pure — split out of `parseFit` so it can be
 * tested without a binary fixture.
 */
export const fitDataToParsed = (
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- this IS the I/O-boundary parser: it takes fit-file-parser's raw output (whose own types promise more than a malformed file delivers) and decodes it with `FitDataSchema`.
  data: unknown,
  filename: string
): ParsedActivity => {
  const parsed = FitDataSchema.safeParse(data ?? {});
  if (!parsed.success) {
    throw new Error(`${filename} does not look like a valid FIT file.`);
  }
  const fit = parsed.data;
  const session = fit.sessions?.[0] ?? fit.activity?.sessions?.[0];
  const points = recordPoints(fit.records ?? []);
  const startTime = session?.start_time;

  const sport = detectSport(session?.sport, filename);
  return finalise({
    isoDate:
      startTime === undefined || startTime === "" ? points[0]?.time : startTime,
    name: filename.replace(FIT_EXT_RE, ""),
    points,
    sessionAvgCadence: sessionCadence(session),
    sessionAvgHr: session?.avg_heart_rate,
    sessionAvgSpeedKmh: session?.avg_speed,
    sessionDistanceKm:
      session?.total_distance === undefined
        ? undefined
        : session.total_distance / 1000,
    sessionDurationSec: session?.total_elapsed_time,
    sessionElevationM: session?.total_ascent,
    sessionMaxSpeedKmh: session?.max_speed,
    sport,
  });
};

export const parseFit = async (
  buffer: ArrayBuffer,
  filename: string
): Promise<ParsedActivity> => {
  // `lengthUnit` converts EVERY length field — altitude, enhanced_altitude and
  // total_ascent as well as distance — so parse in metres (elevation stays in
  // metres) and convert the session distance to km explicitly.
  const parser = new FitParser({
    elapsedRecordField: true,
    force: true,
    lengthUnit: "m",
    mode: "list",
    speedUnit: "km/h",
  });

  let data: unknown;
  try {
    // fit-file-parser v6 exposes a promise API, so the parse no longer needs a
    // hand-rolled `new Promise` wrapper around its callback.
    data = await parser.parseAsync(buffer);
  } catch {
    throw new Error(`${filename} could not be read as FIT.`);
  }

  return fitDataToParsed(data, filename);
};
