/**
 * GPX parser. Statically imports `fast-xml-parser` and `zod/mini`; both
 * land in this module's chunk so the FIT path never pays for them.
 * Reached via dynamic import from `parse-activity.ts`.
 */

import { XMLParser } from "fast-xml-parser";
// `catch` is renamed on import: as a `z.catch` member call it reads like
// `Promise#catch` to the promise lint rules.
import { catch as withFallback, z } from "zod/mini";

import { detectSport, finalise } from "./parse-shared";
import type { ParsedActivity, TrackPoint } from "./parse-shared";

const GPX_EXT_RE = /\.gpx$/iu;

// fast-xml-parser may yield numbers or strings depending on input (a
// `<name>2024</name>` or `<type>9</type>` arrives as a number); accept both
// and coerce in the mapping below.
const Numeric = z.union([z.string(), z.number()]);

/**
 * `<extensions>` children, keyed by (prefixed) element name. Only the
 * TrackPointExtension element is read: its channels (`hr`, `cad`, …) are
 * kept when they are XML text values, and any other extension child — or a
 * channel with nested markup — reads as `null` (no reading), so an exotic
 * extension never fails the whole file.
 */
const ChannelValue = withFallback(z.nullish(Numeric), null);
const TrackPointExtensionSchema = z.record(z.string(), ChannelValue);
const ExtensionsSchema = z.record(
  z.string(),
  withFallback(z.nullish(TrackPointExtensionSchema), null)
);

const TrkPtSchema = z.object({
  "@_lat": Numeric,
  "@_lon": Numeric,
  ele: z.optional(Numeric),
  // The TrackPointExtension namespace prefix varies by exporter (`gpxtpx:`,
  // Garmin's `ns3:`, …), so keep every key and pick by suffix in the mapping.
  extensions: z.optional(ExtensionsSchema),
  time: z.optional(z.string()),
});

const TrkSegSchema = z.object({
  trkpt: z.union([TrkPtSchema, z.array(TrkPtSchema)]),
});

const TrkSchema = z.object({
  name: z.optional(Numeric),
  trkseg: z.optional(z.union([TrkSegSchema, z.array(TrkSegSchema)])),
  type: z.optional(Numeric),
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
/** An XML text value as fast-xml-parser yields it, or no value at all. */
type XmlNumeric = z.infer<typeof ChannelValue>;

/**
 * Coerce a value to a finite number, or `undefined` on bad input. fast-xml-parser
 * may yield strings, and `Number("foo")` / `Date.parse("bad")` both return `NaN`
 * — letting that through poisons haversine, splits, and route projection
 * downstream because `lat === undefined` is false for NaN.
 */
const toFiniteNumber = (v: XmlNumeric): number | undefined => {
  if (v === undefined || v === null || v === "") {
    return undefined;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** A string/number XML text value as a string, or `undefined` if empty. */
const toText = (v: string | number | undefined): string | undefined =>
  v === undefined || v === "" ? undefined : String(v);

/** The value of the first key in `obj` named `local`, whatever its namespace
 *  prefix (`gpxtpx:hr`, `ns3:hr`) — or unprefixed, when the exporter declares
 *  the extension namespace as the default (`<TrackPointExtension xmlns=…>`). */
const pickByLocalName = <T>(
  obj: Readonly<Record<string, T>> | null | undefined,
  local: string
): T | undefined => {
  if (obj === undefined || obj === null) {
    return undefined;
  }
  const key = Object.keys(obj).find(
    (k) => k === local || k.endsWith(`:${local}`)
  );
  return key === undefined ? undefined : obj[key];
};

const asArray = <T>(v: T | T[] | undefined): T[] => {
  if (v === undefined) {
    return [];
  }
  return Array.isArray(v) ? v : [v];
};

export const parseGpx = (text: string, filename: string): ParsedActivity => {
  const parser = new XMLParser({
    attributeNamePrefix: "@_",
    ignoreAttributes: false,
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
  // `toText` never yields "", so the first defined text is the first
  // non-empty one.
  const trkName = trks.map((t) => toText(t.name)).find((n) => n !== undefined);
  const trkType = trks.map((t) => toText(t.type)).find((n) => n !== undefined);

  const points: TrackPoint[] = flatPts.map((p) => {
    const ext = pickByLocalName(p.extensions, "TrackPointExtension");
    return {
      cadence: toFiniteNumber(pickByLocalName(ext, "cad")),
      elevation: toFiniteNumber(p.ele),
      heartRate: toFiniteNumber(pickByLocalName(ext, "hr")),
      lat: toFiniteNumber(p["@_lat"]),
      lng: toFiniteNumber(p["@_lon"]),
      time:
        p.time === undefined || p.time === ""
          ? undefined
          : toFiniteNumber(Date.parse(p.time)),
    };
  });

  const sport = detectSport(trkType, filename);
  const metadataTime = xml.gpx?.metadata?.time;
  return finalise({
    isoDate:
      metadataTime === undefined || metadataTime === ""
        ? points[0]?.time
        : metadataTime,
    name:
      trkName ??
      toText(xml.gpx?.metadata?.name) ??
      filename.replace(GPX_EXT_RE, ""),
    points,
    sport,
  });
};
