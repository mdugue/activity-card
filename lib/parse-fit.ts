/**
 * FIT parser. Statically imports `fit-file-parser` and `zod/mini`; both
 * land in this module's chunk so the GPX path never pays for them.
 * Reached via dynamic import from `parse-activity.ts`.
 */

import FitParser from "fit-file-parser";
import { z } from "zod/mini";
import {
  detectSport,
  finalise,
  type ParsedActivity,
  type TrackPoint,
} from "./parse-shared";

const FIT_EXT_RE = /\.fit$/i;

const DateLike = z.union([z.string(), z.date()]);

const FitSessionSchema = z.object({
  sport: z.optional(z.string()),
  sub_sport: z.optional(z.string()),
  start_time: z.optional(DateLike),
  total_distance: z.optional(z.number()),
  total_elapsed_time: z.optional(z.number()),
  total_ascent: z.optional(z.number()),
  avg_speed: z.optional(z.number()),
  max_speed: z.optional(z.number()),
  avg_heart_rate: z.optional(z.number()),
  avg_cadence: z.optional(z.number()),
  avg_running_cadence: z.optional(z.number()),
});

const FitRecordSchema = z.object({
  position_lat: z.optional(z.number()),
  position_long: z.optional(z.number()),
  altitude: z.optional(z.number()),
  timestamp: z.optional(DateLike),
  heart_rate: z.optional(z.number()),
  cadence: z.optional(z.number()),
});

const FitDataSchema = z.object({
  activity: z.optional(
    z.object({
      sessions: z.optional(z.array(FitSessionSchema)),
    })
  ),
  records: z.optional(z.array(FitRecordSchema)),
});

export function parseFit(
  buffer: ArrayBuffer,
  filename: string
): Promise<ParsedActivity> {
  return new Promise((resolve, reject) => {
    const parser = new FitParser({
      force: true,
      speedUnit: "km/h",
      lengthUnit: "km",
      elapsedRecordField: true,
      mode: "list",
    });
    parser.parse(buffer, (err, data) => {
      if (err) {
        reject(new Error(`${filename} could not be read as FIT.`));
        return;
      }
      const parsed = FitDataSchema.safeParse(data ?? {});
      if (!parsed.success) {
        reject(new Error(`${filename} does not look like a valid FIT file.`));
        return;
      }
      const fit = parsed.data;
      const session = fit.activity?.sessions?.[0];
      const records = fit.records || [];
      const points: TrackPoint[] = records
        .filter(
          (r) => r.position_lat !== undefined && r.position_long !== undefined
        )
        .map((r) => ({
          lat: r.position_lat,
          lng: r.position_long,
          elevation: r.altitude,
          time: r.timestamp
            ? (() => {
                const t = new Date(r.timestamp).getTime();
                return Number.isFinite(t) ? t : undefined;
              })()
            : undefined,
          heartRate: r.heart_rate,
          cadence: r.cadence,
        }));

      const sport = detectSport(session?.sport, filename);
      const result = finalise({
        points,
        sport,
        name: filename.replace(FIT_EXT_RE, ""),
        isoDate: session?.start_time || points[0]?.time,
        sessionDistanceKm: session?.total_distance,
        sessionDurationSec: session?.total_elapsed_time,
        sessionElevationM: session?.total_ascent,
        sessionAvgSpeedKmh: session?.avg_speed,
        sessionMaxSpeedKmh: session?.max_speed,
        sessionAvgHr: session?.avg_heart_rate,
        sessionAvgCadence: session?.avg_cadence || session?.avg_running_cadence,
      });
      resolve(result);
    });
  });
}
