import { z } from "zod";
import type {
  ActivityData,
  ActivitySource,
  Sport,
} from "@/components/app/sample-data";
import type { ImageTransform } from "@/lib/image-transform";
import type { PhotoEffects } from "@/lib/photo-effects";

/**
 * zod schemas for the auto-saved card draft. The draft owns only the state that
 * was previously *lost* on reload — the parsed activity, the photo (stored
 * separately as a Blob), and the per-photo transform/effects. Styling choices
 * (theme, accent, visibility, moods, mode) are deliberately NOT here: they're
 * already persisted synchronously in the localStorage UI prefs, which stay the
 * single source of truth for them — duplicating them in the debounced draft
 * would let a slightly stale copy clobber the prefs on restore.
 *
 * Reads are validated with `safeParse`, so a draft written by an older /
 * incompatible app version is rejected (and the app starts fresh) rather than
 * mis-restored. The `satisfies z.ZodType<…>` guards fail the build if a schema
 * drifts from the type it mirrors.
 */

const sportSchema = z.enum([
  "ride",
  "run",
  "swim",
  "triathlon",
]) satisfies z.ZodType<Sport>;

const activitySourceSchema = z.enum([
  "upload",
  "strava",
]) satisfies z.ZodType<ActivitySource>;

const coordSchema = z.tuple([z.number(), z.number()]);

const triSegmentSchema = z.object({
  avgPaceMinPerKm: z.number().optional(),
  avgPacePer100m: z.number().optional(),
  avgSpeedKmh: z.number().optional(),
  distanceKm: z.number(),
  durationSec: z.number(),
  elevationGainM: z.number().optional(),
  elevationProfile: z.array(z.number()).optional(),
  paceProfile: z.array(z.number()).optional(),
  routeCoordinates: z.array(coordSchema).optional(),
  sport: z.enum(["swim", "bike", "run"]),
});

const splitSchema = z.object({
  avgSpeedKmh: z.number().optional(),
  durationSec: z.number(),
  km: z.number().optional(),
  lap: z.number().optional(),
});

const zoneSchema = z.object({
  pct: z.number(),
  zone: z.string(),
});

const transitionSchema = z.object({
  durationSec: z.number(),
  name: z.string(),
});

const activitySchema = z.object({
  athleteName: z.string(),
  avgCadence: z.number().optional(),
  avgHeartRate: z.number().optional(),
  avgPaceMinPerKm: z.number().optional(),
  avgPacePer100m: z.number().optional(),
  avgSpeedKmh: z.number().optional(),
  date: z.string(),
  distanceKm: z.number(),
  durationSec: z.number(),
  elevationGainM: z.number().optional(),
  elevationProfile: z.array(z.number()).optional(),
  hrZones: z.array(zoneSchema).optional(),
  lapPacesPer100m: z.array(z.number()).optional(),
  location: z.string(),
  maxSpeedKmh: z.number().optional(),
  normalizedPowerW: z.number().optional(),
  paceProfile: z.array(z.number()).optional(),
  powerProfile: z.array(z.number()).optional(),
  powerZones: z.array(zoneSchema).optional(),
  routeCoordinates: z.array(coordSchema).optional(),
  segments: z.array(triSegmentSchema).optional(),
  source: activitySourceSchema.optional(),
  speedProfile: z.array(z.number()).optional(),
  splits: z.array(splitSchema).optional(),
  sport: sportSchema,
  stravaActivityIds: z.array(z.number().nullable()).optional(),
  strokeCountAvg: z.number().optional(),
  swolf: z.number().optional(),
  title: z.string(),
  transitions: z.array(transitionSchema).optional(),
  vamMph: z.number().optional(),
}) satisfies z.ZodType<ActivityData>;

const imageTransformSchema = z.object({
  scale: z.number(),
  x: z.number(),
  y: z.number(),
}) satisfies z.ZodType<ImageTransform>;

const photoEffectsSchema = z.object({
  filter: z.string(),
  flipH: z.boolean(),
  flipV: z.boolean(),
  grain: z.boolean(),
  rotate: z.union([
    z.literal(0),
    z.literal(90),
    z.literal(180),
    z.literal(270),
  ]),
}) satisfies z.ZodType<PhotoEffects>;

export const draftMetaSchema = z.object({
  activity: activitySchema,
  imageTransform: imageTransformSchema,
  photoEffects: photoEffectsSchema,
  savedAt: z.number(),
  v: z.literal(1),
});

export type DraftMetaV1 = z.infer<typeof draftMetaSchema>;
