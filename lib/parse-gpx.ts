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

// fast-xml-parser may yield numbers or strings depending on input; accept both
// and coerce in the mapping below.
const Numeric = z.union([z.string(), z.number()]);

const TrkPtSchema = z.object({
  "@_lat": Numeric,
  "@_lon": Numeric,
  ele: z.optional(Numeric),
  time: z.optional(z.string()),
  // Left open: the namespace prefix is whatever the file declares (`gpxtpx:`
  // from most devices, `ns3:` from some Garmin exports). `trackPointExtension`
  // `fieldBySuffix` picks the fields out whatever the prefix.
  extensions: z.optional(z.unknown()),
});

const TrkSegSchema = z.object({
  trkpt: z.union([TrkPtSchema, z.array(TrkPtSchema)]),
});

// `<name>2024</name>` or `<type>9</type>` arrive as numbers.
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
      // A file with several `<trk>` elements parses to an array.
      trk: z.optional(z.union([TrkSchema, z.array(TrkSchema)])),
    })
  ),
});

type GpxTrk = z.infer<typeof TrkSchema>;
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

  const rawTrk = xml.gpx?.trk;
  const tracks: GpxTrk[] = Array.isArray(rawTrk)
    ? rawTrk
    : [rawTrk].filter((t) => t !== undefined);
  const flatPts: GpxTrkPt[] = tracks.flatMap((trk) =>
    [trk.trkseg ?? []].flat().flatMap((seg) => [seg.trkpt].flat())
  );

  const points: TrackPoint[] = flatPts.map((p) => {
    const ext = fieldBySuffix(p.extensions, "TrackPointExtension");
    return {
      lat: toFiniteNumber(p["@_lat"]),
      lng: toFiniteNumber(p["@_lon"]),
      elevation: toFiniteNumber(p.ele),
      time: p.time ? toFiniteNumber(Date.parse(p.time)) : undefined,
      heartRate: toFiniteNumber(fieldBySuffix(ext, "hr")),
      cadence: toFiniteNumber(fieldBySuffix(ext, "cad")),
    };
  });

  // Name and type come from the first track that has them.
  const trkName = tracks.find((t) => hasText(t.name))?.name;
  const trkType = tracks.find((t) => hasText(t.type))?.type;
  const metaName = xml.gpx?.metadata?.name;
  const sport = detectSport(
    trkType === undefined ? undefined : String(trkType),
    filename
  );
  return finalise({
    points,
    sport,
    name:
      [trkName, metaName].find(hasText)?.toString() ??
      filename.replace(GPX_EXT_RE, ""),
    isoDate: xml.gpx?.metadata?.time || points[0]?.time,
  });
}

function hasText(v: string | number | undefined): v is string | number {
  return v !== undefined && String(v) !== "";
}

/** Read `<prefix:key>` (or an unprefixed `<key>`) from a parsed element. */
function fieldBySuffix(element: unknown, key: string): unknown {
  if (!element || typeof element !== "object") {
    return;
  }
  for (const [name, value] of Object.entries(element)) {
    if (name === key || name.endsWith(`:${key}`)) {
      return value;
    }
  }
}
