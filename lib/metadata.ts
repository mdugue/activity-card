// biome-ignore-all lint/suspicious/noBitwiseOperators: CRC32 and PNG chunk
// byte-packing are inherently bitwise — this is the standard PNG algorithm.

/**
 * PNG metadata injection — Effort attribution (+ optional GPS) baked into the
 * exported file.
 *
 * Canvas / html-to-image output carries **no** metadata, so we re-inject it
 * after rasterising. PNG has no native EXIF; we write standard textual chunks
 * (`tEXt`/`iTXt`) for attribution and an XMP packet (`iTXt`, keyword
 * `XML:com.adobe.xmp`) for GPS — the same mechanism Lightroom/Photoshop read.
 *
 * Reality check baked into the UI copy: most social platforms **strip**
 * metadata on upload, so the value is the saved file / print / provenance, not
 * a guarantee inside the platform. GPS is opt-OUT (see `MetadataOptions.gps`).
 *
 * Pure + dependency-free so it unit-tests under `bun:test` (it operates on
 * `Uint8Array`, no DOM).
 */

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;

// --- CRC32 (PNG polynomial) -------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xed_b8_83_20 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xff_ff_ff_ff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xff_ff_ff_ff) >>> 0;
}

function latin1Bytes(s: string): Uint8Array {
  // tEXt keyword/value is Latin-1; drop anything outside it (callers keep
  // keywords ASCII, and route UTF-8 content through iTXt instead).
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    out[i] = s.charCodeAt(i) & 0xff;
  }
  return out;
}

function buildChunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) {
    out[4 + i] = type.charCodeAt(i);
  }
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** A `tEXt` chunk — Latin-1 keyword + value, widely read by viewers. */
export function textChunk(keyword: string, text: string): Uint8Array {
  const kw = latin1Bytes(keyword);
  const tx = latin1Bytes(text);
  const data = new Uint8Array(kw.length + 1 + tx.length);
  data.set(kw, 0);
  data[kw.length] = 0;
  data.set(tx, kw.length + 1);
  return buildChunk("tEXt", data);
}

/** An `iTXt` chunk (uncompressed, UTF-8) — for user text + the XMP packet. */
export function itxtChunk(keyword: string, text: string): Uint8Array {
  const kw = latin1Bytes(keyword);
  const tx = new TextEncoder().encode(text);
  // keyword\0 compFlag compMethod langTag\0 transKeyword\0 text
  const data = new Uint8Array(kw.length + 5 + tx.length);
  let o = 0;
  data.set(kw, o);
  o += kw.length;
  data[o++] = 0; // null after keyword
  data[o++] = 0; // compression flag (uncompressed)
  data[o++] = 0; // compression method
  data[o++] = 0; // empty language tag, then null
  data[o++] = 0; // empty translated keyword, then null
  data.set(tx, o);
  return buildChunk("iTXt", data);
}

function isPng(bytes: Uint8Array): boolean {
  return PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

/**
 * Splice extra chunks in just before `IEND`. Returns the original bytes
 * unchanged if the input is not a PNG (defensive — never corrupts an export).
 */
export function injectPngChunks(
  png: Uint8Array,
  chunks: Uint8Array[]
): Uint8Array {
  if (!(isPng(png) && chunks.length)) {
    return png;
  }
  // Walk the chunk list to find IEND's start offset.
  let offset = 8;
  let iendStart = -1;
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  while (offset + 8 <= png.length) {
    const len = dv.getUint32(offset);
    const type = String.fromCharCode(
      png[offset + 4],
      png[offset + 5],
      png[offset + 6],
      png[offset + 7]
    );
    if (type === "IEND") {
      iendStart = offset;
      break;
    }
    offset += 12 + len;
  }
  if (iendStart < 0) {
    return png;
  }
  const extra = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(png.length + extra);
  out.set(png.subarray(0, iendStart), 0);
  let o = iendStart;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  out.set(png.subarray(iendStart), o);
  return out;
}

// --- Effort metadata model --------------------------------------------------

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MetadataInput {
  athleteName?: string;
  /** ISO date (yyyy-mm-dd) of the activity */
  date?: string;
  /** human-readable place, e.g. "Neustadt, Sachsen" */
  location?: string;
  /** WGS84 point for GPS tags — only embedded when `gps` is true */
  point?: GeoPoint | null;
  title?: string;
  /** the app URL written into attribution */
  url?: string;
}

export interface MetadataOptions {
  /** GPS is opt-OUT: true (default) embeds location, false strips it */
  gps?: boolean;
}

const APP_NAME = "Effort";
const APP_URL = "https://effort.app";

/** Decimal degrees → XMP exif "deg,min.mmmmREF" form. */
function toXmpCoord(value: number, positive: string, negative: string): string {
  const ref = value >= 0 ? positive : negative;
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  return `${deg},${min.toFixed(6)}${ref}`;
}

function xmpEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build an XMP packet carrying attribution and (optionally) GPS. */
export function buildXmp(input: MetadataInput, withGps: boolean): string {
  const tool = `${APP_NAME} — ${input.url || APP_URL}`;
  const desc = input.title ? xmpEscape(input.title) : "";
  const creator = input.athleteName ? xmpEscape(input.athleteName) : "";
  const gps =
    withGps && input.point
      ? `\n   exif:GPSLatitude="${toXmpCoord(input.point.lat, "N", "S")}"` +
        `\n   exif:GPSLongitude="${toXmpCoord(input.point.lng, "E", "W")}"`
      : "";
  const place =
    withGps && input.location
      ? `\n   photoshop:City="${xmpEscape(input.location)}"`
      : "";
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
   xmlns:xmp="http://ns.adobe.com/xap/1.0/"
   xmlns:dc="http://purl.org/dc/elements/1.1/"
   xmlns:exif="http://ns.adobe.com/exif/1.0/"
   xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"
   xmp:CreatorTool="${xmpEscape(tool)}"
   dc:description="${desc}"
   dc:creator="${creator}"${gps}${place}>
  </rdf:Description>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="r"?>`;
}

/** The textual chunks Effort writes: attribution always, GPS/place opt-out. */
export function buildMetadataChunks(
  input: MetadataInput,
  opts: MetadataOptions = {}
): Uint8Array[] {
  const withGps = opts.gps !== false;
  const url = input.url || APP_URL;
  const chunks: Uint8Array[] = [
    textChunk("Software", APP_NAME),
    textChunk("Source", `Created with ${APP_NAME} — ${url}`),
  ];
  if (input.title) {
    chunks.push(itxtChunk("Title", input.title));
  }
  if (input.athleteName) {
    chunks.push(itxtChunk("Author", input.athleteName));
    chunks.push(textChunk("Copyright", `© ${input.athleteName}`));
  }
  if (input.date) {
    chunks.push(textChunk("Creation Time", input.date));
  }
  const descBits = [
    input.title,
    withGps && input.location ? input.location : null,
    `Created with ${APP_NAME}`,
  ].filter(Boolean);
  chunks.push(itxtChunk("Description", descBits.join(" · ")));
  chunks.push(itxtChunk("XML:com.adobe.xmp", buildXmp(input, withGps)));
  return chunks;
}

/** Convenience: inject Effort metadata into PNG bytes. */
export function applyMetadata(
  png: Uint8Array,
  input: MetadataInput,
  opts: MetadataOptions = {}
): Uint8Array {
  return injectPngChunks(png, buildMetadataChunks(input, opts));
}

/**
 * Derive a representative GPS point from route coordinates. Effort stores route
 * points as `[lng, -lat]` (see `lib/activity.ts`), so we invert the second
 * component. Uses the centroid for a stable, less-identifying point than the
 * exact start.
 */
export function routeCentroid(
  coords: readonly (readonly [number, number])[] | undefined
): GeoPoint | null {
  if (!coords || coords.length === 0) {
    return null;
  }
  let sx = 0;
  let sy = 0;
  for (const [lng, negLat] of coords) {
    sx += lng;
    sy += -negLat;
  }
  return { lng: sx / coords.length, lat: sy / coords.length };
}
