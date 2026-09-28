// CRC32 and PNG chunk byte-packing are inherently bitwise — this is the
// standard PNG algorithm.

import { hasText } from "./text";

/**
 * PNG metadata injection — Effort attribution (+ optional GPS) baked into the
 * exported file.
 *
 * Canvas / snapdom output carries **no** metadata, so we re-inject it
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
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      // oxlint-disable-next-line eslint/no-bitwise -- CRC-32 is defined over 32-bit XOR / unsigned shift; there is no arithmetic equivalent.
      c = c & 1 ? 0xed_b8_83_20 ^ (c >>> 1) : c >>> 1;
    }
    // oxlint-disable-next-line eslint/no-bitwise -- `>>> 0` reinterprets the signed 32-bit XOR result as the unsigned table entry.
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array): number => {
  let crc = 0xff_ff_ff_ff;
  for (const byte of bytes) {
    // oxlint-disable-next-line eslint/no-bitwise -- CRC-32 table step: 32-bit XOR, low-byte mask and unsigned shift.
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  // oxlint-disable-next-line eslint/no-bitwise -- final CRC-32 inversion, read back as an unsigned 32-bit value.
  return (crc ^ 0xff_ff_ff_ff) >>> 0;
};

const latin1Bytes = (s: string): Uint8Array => {
  // tEXt keyword/value is Latin-1; drop anything outside it (callers keep
  // keywords ASCII, and route UTF-8 content through iTXt instead).
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i += 1) {
    // Low byte of each UTF-16 code unit (the chunk is sized in code units).
    // oxlint-disable-next-line unicorn/prefer-code-point -- the packing is per UTF-16 code unit by design; `codePointAt` would merge surrogate pairs and change the bytes written.
    out[i] = s.charCodeAt(i) % 256;
  }
  return out;
};

const buildChunk = (type: string, data: Uint8Array): Uint8Array => {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  // Chunk types are four ASCII letters, so code points are the bytes.
  for (let i = 0; i < 4; i += 1) {
    out[4 + i] = type.codePointAt(i) ?? 0;
  }
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
};

/** A `tEXt` chunk — Latin-1 keyword + value, widely read by viewers. */
export const textChunk = (keyword: string, text: string): Uint8Array => {
  const kw = latin1Bytes(keyword);
  const tx = latin1Bytes(text);
  const data = new Uint8Array(kw.length + 1 + tx.length);
  data.set(kw, 0);
  data[kw.length] = 0;
  data.set(tx, kw.length + 1);
  return buildChunk("tEXt", data);
};

const ITXT_HEADER_ZEROS = 5;

/** An `iTXt` chunk (uncompressed, UTF-8) — for user text + the XMP packet. */
export const itxtChunk = (keyword: string, text: string): Uint8Array => {
  const kw = latin1Bytes(keyword);
  const tx = new TextEncoder().encode(text);
  // keyword\0 compFlag compMethod langTag\0 transKeyword\0 text
  // The five bytes between keyword and text are all zero — the keyword's
  // null terminator, compression flag (uncompressed), compression method,
  // then the empty language tag's and empty translated keyword's
  // terminators — which a fresh `Uint8Array` already holds.
  const data = new Uint8Array(kw.length + ITXT_HEADER_ZEROS + tx.length);
  data.set(kw, 0);
  data.set(tx, kw.length + ITXT_HEADER_ZEROS);
  return buildChunk("iTXt", data);
};

const isPng = (bytes: Uint8Array): boolean =>
  bytes.length >= PNG_SIGNATURE.length &&
  PNG_SIGNATURE.every((b, i) => bytes[i] === b);

/**
 * Splice extra chunks in just before `IEND`. Returns the original bytes
 * unchanged if the input is not a PNG (defensive — never corrupts an export).
 */
export const injectPngChunks = (
  png: Uint8Array,
  chunks: Uint8Array[]
): Uint8Array => {
  if (!(isPng(png) && chunks.length)) {
    return png;
  }
  // Walk the chunk list to find IEND's start offset.
  let offset = 8;
  let iendStart = -1;
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  while (offset + 8 <= png.length) {
    const len = dv.getUint32(offset);
    const type = String.fromCodePoint(
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
};

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
const toXmpCoord = (
  value: number,
  positive: string,
  negative: string
): string => {
  const ref = value >= 0 ? positive : negative;
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  return `${deg},${min.toFixed(6)}${ref}`;
};

const xmpEscape = (s: string): string =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** Build an XMP packet carrying attribution and (optionally) GPS. */
export const buildXmp = (input: MetadataInput, withGps: boolean): string => {
  const tool = `${APP_NAME} — ${hasText(input.url) ? input.url : APP_URL}`;
  const desc = hasText(input.title) ? xmpEscape(input.title) : "";
  const creator = hasText(input.athleteName)
    ? xmpEscape(input.athleteName)
    : "";
  const gps =
    withGps && input.point
      ? `\n   exif:GPSLatitude="${toXmpCoord(input.point.lat, "N", "S")}"` +
        `\n   exif:GPSLongitude="${toXmpCoord(input.point.lng, "E", "W")}"`
      : "";
  const place =
    withGps && hasText(input.location)
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
};

/** The textual chunks Effort writes: attribution always, GPS/place opt-out. */
export const buildMetadataChunks = (
  input: MetadataInput,
  opts: MetadataOptions = {}
): Uint8Array[] => {
  const withGps = opts.gps !== false;
  const url = hasText(input.url) ? input.url : APP_URL;
  const chunks: Uint8Array[] = [
    textChunk("Software", APP_NAME),
    textChunk("Source", `Created with ${APP_NAME} — ${url}`),
  ];
  if (hasText(input.title)) {
    chunks.push(itxtChunk("Title", input.title));
  }
  if (hasText(input.athleteName)) {
    chunks.push(
      itxtChunk("Author", input.athleteName),
      textChunk("Copyright", `© ${input.athleteName}`)
    );
  }
  if (hasText(input.date)) {
    chunks.push(textChunk("Creation Time", input.date));
  }
  const descBits = [
    input.title,
    withGps && hasText(input.location) ? input.location : null,
    `Created with ${APP_NAME}`,
  ].filter(Boolean);
  chunks.push(
    itxtChunk("Description", descBits.join(" · ")),
    itxtChunk("XML:com.adobe.xmp", buildXmp(input, withGps))
  );
  return chunks;
};

/** Convenience: inject Effort metadata into PNG bytes. */
export const applyMetadata = (
  png: Uint8Array,
  input: MetadataInput,
  opts: MetadataOptions = {}
): Uint8Array => injectPngChunks(png, buildMetadataChunks(input, opts));

/**
 * Derive a representative GPS point from route coordinates. Effort stores route
 * points as `[lng, -lat]` (see `lib/activity.ts`), so we invert the second
 * component. Uses the centroid for a stable, less-identifying point than the
 * exact start.
 */
export const routeCentroid = (
  coords?: readonly (readonly [number, number])[]
): GeoPoint | null => {
  if (!coords || coords.length === 0) {
    return null;
  }
  let sx = 0;
  let sy = 0;
  for (const [lng, negLat] of coords) {
    sx += lng;
    sy += -negLat;
  }
  return { lat: sy / coords.length, lng: sx / coords.length };
};
