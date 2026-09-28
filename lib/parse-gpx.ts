/**
 * GPX parser. Statically imports `fast-xml-parser` and `zod/mini`; both
 * land in this module's chunk so the FIT path never pays for them.
 * Reached via dynamic import from `parse-activity.ts`.
 */

import { XMLParser } from "fast-xml-parser";
import { z } from "zod/mini";

import { detectSport, finalise } from "./parse-shared";
import type { ParsedActivity, TrackPoint } from "./parse-shared";

const GPX_EXT_RE = /\.gpx$/iu;

// fast-xml-parser may yield numbers or strings depending on input (a
// `<name>2024</name>` or `<type>9</type>` arrives as a number); accept both
// and coerce in the mapping below.
const Numeric = z.union([z.string(), z.number()]);

const TrkPtSchema = z.object({
  "@_lat": Numeric,
  "@_lon": Numeric,
  ele: z.optional(Numeric),
  time: z.optional(z.string()),
  // The TrackPointExtension namespace prefix varies by exporter (`gpxtpx:`,
  // Garmin's `ns3:`, …), so keep every key and pick by suffix in the mapping.
  extensions: z.optional(z.record(z.string(), z.unknown())),
});

const TrkSegSchema = z.object({
  trkpt: z.union([TrkPtSchema, z.array(TrkPtSchema)]),
});

const TrkSchema = z.object({
  name: z.optional(Numeric),
  type: z.optional(Numeric),
  trkseg: z.optional(z.union([TrkSegSchema, z.array(TrkSegSchema)])),
});

const GpxSchema = z.object({
  gpx: z.optional(
    z.object({
      metadata: z.optional(
        z.object({
          name: z.optional(Numeric),
          time: z.optional(z.string()),
        })
      ),
      // Several `<trk>` elements parse to an array.
      trk: z.optional(z.union([TrkSchema, z.array(TrkSchema)])),
    })
  ),
});

type GpxTrk = z.infer<typeof TrkSchema>;
type GpxTrkSeg = z.infer<typeof TrkSegSchema>;
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

/** A string/number XML text value as a string, or `undefined` if empty. */
function toText(v: string | number | undefined): string | undefined {
  return v === undefined || v === "" ? undefined : String(v);
}

/** The value of the first key in `obj` ending with `suffix`, whatever its namespace prefix. */
function pickBySuffix(obj: unknown, suffix: string): unknown {
  if (typeof obj !== "object" || obj === null) {
    return;
  }
  const key = Object.keys(obj).find((k) => k.endsWith(suffix));
  return key === undefined ? undefined : (obj as Record<string, unknown>)[key];
}

function asArray<T>(v: T | T[] | undefined): T[] {
  if (v === undefined) {
    return [];
  }
  return Array.isArray(v) ? v : [v];
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

  // Multiple tracks are concatenated in document order; name and type come
  // from the first track that declares them.
  const trks: GpxTrk[] = asArray(xml.gpx?.trk);
  const segs: GpxTrkSeg[] = trks.flatMap((t) => asArray(t.trkseg));
  const flatPts: GpxTrkPt[] = segs.flatMap((seg) => asArray(seg.trkpt));
  const trkName = trks.map((t) => toText(t.name)).find(Boolean);
  const trkType = trks.map((t) => toText(t.type)).find(Boolean);

  const points: TrackPoint[] = flatPts.map((p) => {
    const ext = pickBySuffix(p.extensions, ":TrackPointExtension");
    return {
      lat: toFiniteNumber(p["@_lat"]),
      lng: toFiniteNumber(p["@_lon"]),
      elevation: toFiniteNumber(p.ele),
      time: p.time ? toFiniteNumber(Date.parse(p.time)) : undefined,
      heartRate: toFiniteNumber(pickBySuffix(ext, ":hr")),
      cadence: toFiniteNumber(pickBySuffix(ext, ":cad")),
    };
  });

  const sport = detectSport(trkType, filename);
  return finalise({
    points,
    sport,
    name:
      trkName ||
      toText(xml.gpx?.metadata?.name) ||
      filename.replace(GPX_EXT_RE, ""),
    isoDate: xml.gpx?.metadata?.time || points[0]?.time,
  });
}
