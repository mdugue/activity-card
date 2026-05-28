/**
 * GPX parser. Statically imports `fast-xml-parser` and `zod/mini`; both
 * land in this module's chunk so the FIT path never pays for them.
 * Reached via dynamic import from `parse-activity.ts`.
 */

import { XMLParser } from "fast-xml-parser";
import { z } from "zod/mini";
import {
  detectSport,
  finalise,
  type ParsedActivity,
  type TrackPoint,
} from "./parse-shared";

const GPX_EXT_RE = /\.gpx$/i;

// fast-xml-parser may yield numbers or strings depending on input; accept both
// and coerce in the mapping below.
const Numeric = z.union([z.string(), z.number()]);

const TrkPtSchema = z.object({
  "@_lat": Numeric,
  "@_lon": Numeric,
  ele: z.optional(Numeric),
  time: z.optional(z.string()),
  extensions: z.optional(
    z.object({
      "gpxtpx:TrackPointExtension": z.optional(
        z.object({
          "gpxtpx:hr": z.optional(Numeric),
          "gpxtpx:cad": z.optional(Numeric),
        })
      ),
    })
  ),
});

const TrkSegSchema = z.object({
  trkpt: z.union([TrkPtSchema, z.array(TrkPtSchema)]),
});

const GpxSchema = z.object({
  gpx: z.optional(
    z.object({
      metadata: z.optional(
        z.object({
          name: z.optional(z.string()),
          time: z.optional(z.string()),
        })
      ),
      trk: z.optional(
        z.object({
          name: z.optional(z.string()),
          type: z.optional(z.string()),
          trkseg: z.optional(z.union([TrkSegSchema, z.array(TrkSegSchema)])),
        })
      ),
    })
  ),
});

type GpxTrkPt = z.infer<typeof TrkPtSchema>;

/**
 * Coerce a value to a finite number, or `undefined` on bad input. fast-xml-parser
 * may yield strings, and `Number("foo")` / `Date.parse("bad")` both return `NaN`
 * — letting that through poisons haversine, splits, and route projection
 * downstream because `lat === undefined` is false for NaN.
 */
function toFiniteNumber(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") {
    return;
  }
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function parseGpx(text: string, filename: string): ParsedActivity {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  let raw: unknown;
  try {
    raw = parser.parse(text);
  } catch {
    throw new Error(`${filename} could not be read as XML.`);
  }

  const result = GpxSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`${filename} does not look like a valid GPX file.`);
  }
  const xml = result.data;

  const trk = xml.gpx?.trk;
  let segs: { trkpt: GpxTrkPt | GpxTrkPt[] }[] = [];
  if (Array.isArray(trk?.trkseg)) {
    segs = trk.trkseg;
  } else if (trk?.trkseg) {
    segs = [trk.trkseg];
  }
  const flatPts: GpxTrkPt[] = [];
  for (const seg of segs) {
    const pts = seg.trkpt;
    if (Array.isArray(pts)) {
      flatPts.push(...pts);
    } else if (pts) {
      flatPts.push(pts);
    }
  }

  const points: TrackPoint[] = flatPts.map((p) => {
    const ext = p.extensions?.["gpxtpx:TrackPointExtension"];
    return {
      lat: toFiniteNumber(p["@_lat"]),
      lng: toFiniteNumber(p["@_lon"]),
      elevation: toFiniteNumber(p.ele),
      time: p.time ? toFiniteNumber(Date.parse(p.time)) : undefined,
      heartRate: toFiniteNumber(ext?.["gpxtpx:hr"]),
      cadence: toFiniteNumber(ext?.["gpxtpx:cad"]),
    };
  });

  const sport = detectSport(trk?.type, filename);
  return finalise({
    points,
    sport,
    name:
      trk?.name || xml.gpx?.metadata?.name || filename.replace(GPX_EXT_RE, ""),
    isoDate: xml.gpx?.metadata?.time || points[0]?.time,
  });
}
