import { crc32, deflateSync } from "node:zlib";

/**
 * Synthetic GPX builder for E2E tests. Lets us drop deterministic
 * "files" into the dropzone without committing binary fixtures.
 */
export interface SyntheticGpx {
  durationSec: number;
  /** Optional constant HR in bpm. Emitted via the standard
   * `gpxtpx:TrackPointExtension` block; the parser picks it up and the
   * mean comes out exactly equal to `hr` (stable for assertions). */
  hr?: number;
  latStart: number;
  latStep: number;
  lngStart: number;
  lngStep: number;
  points?: number;
  sport: "swimming" | "cycling" | "running";
  startIso: string;
}

export function makeGpx(opts: SyntheticGpx): string {
  const {
    sport,
    startIso,
    durationSec,
    latStart,
    latStep,
    lngStart,
    lngStep,
    points = 60,
    hr,
  } = opts;
  const startMs = Date.parse(startIso);
  const trkpts: string[] = [];
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const lat = latStart + latStep * t;
    const lng = lngStart + lngStep * t;
    const time = new Date(startMs + t * durationSec * 1000).toISOString();
    const elev =
      sport === "cycling"
        ? 10 + 50 * Math.sin(t * 8)
        : sport === "running"
          ? 5 + 5 * Math.sin(t * 4)
          : 0;
    const extensions =
      hr === undefined
        ? ""
        : `<extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${hr}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions>`;
    trkpts.push(
      `<trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}"><ele>${elev.toFixed(1)}</ele><time>${time}</time>${extensions}</trkpt>`
    );
  }
  return `<?xml version="1.0"?>
<gpx version="1.1" creator="effort-e2e">
  <metadata><time>${startIso}</time></metadata>
  <trk><name>${sport}-test</name><type>${sport}</type><trkseg>${trkpts.join("")}</trkseg></trk>
</gpx>`;
}

export const TRIATHLON_FILES = {
  swim: makeGpx({
    sport: "swimming",
    startIso: "2026-05-18T07:00:00Z",
    durationSec: 30 * 60,
    latStart: 54.5,
    latStep: 0.005,
    lngStart: 14,
    lngStep: 0.001,
    points: 40,
  }),
  bike: makeGpx({
    sport: "cycling",
    startIso: "2026-05-18T07:32:30Z",
    durationSec: 90 * 60,
    latStart: 54.5,
    latStep: 0.05,
    lngStart: 14,
    lngStep: 0.05,
    points: 120,
  }),
  run: makeGpx({
    sport: "running",
    startIso: "2026-05-18T09:04:00Z",
    durationSec: 45 * 60,
    latStart: 54.55,
    latStep: 0.01,
    lngStart: 14.05,
    lngStep: -0.005,
    points: 80,
  }),
};

/** Single 5km run for single-file upload tests. HR is constant so the
 * computed mean is stable for assertions. */
export const SINGLE_RUN_GPX = makeGpx({
  sport: "running",
  startIso: "2026-05-18T07:00:00Z",
  durationSec: 30 * 60,
  latStart: 54.5,
  latStep: 0.04,
  lngStart: 14,
  lngStep: 0.04,
  points: 100,
  hr: 150,
});

/** A 1×1 transparent PNG for photo-upload tests. */
export const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

/**
 * A solid magenta 64×64 PNG (rgb 255,0,255). Unlike the transparent 1×1 above,
 * its distinctive colour lets a test decode a rasterised export and assert the
 * uploaded background photo actually made it in — the regression guard that the
 * background survives the export pipeline (it once dropped via an html-to-image
 * `cacheBust` blob-URL bug; snapdom no longer rewrites resource URLs).
 */
export const SOLID_MAGENTA_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAlElEQVR4nO3QMREAMBDDsOdPOoWhoR60+3y77WenA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0BqgA7QG6ACtATpAa4AO0B5MtNLCmn7KywAAAABJRU5ErkJggg==";

/**
 * A 2×2 PNG with four saturated quadrants — red, green / blue, yellow. Solid
 * colours prove the photo reached the export; this one also proves it landed
 * the right way round, so a cover-fit, pan or mirror mistake in the export's
 * photo compositing can't pass unnoticed.
 */
export const QUADRANT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGO4Iycnt8+GQcPtzrMTGgAhzgVRsZiXAwAAAABJRU5ErkJggg==";

/**
 * Synthesise a solid-colour PNG of any size. Used to feed the export an
 * oversized photo (Strava serves renditions up to 5000px) without carrying a
 * multi-megapixel fixture in the repo — solid colour deflates to a few KB.
 */
export function solidPngBuffer(
  width: number,
  height: number,
  rgb: [number, number, number]
): Buffer {
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.from(Array.from({ length: width }, () => rgb).flat()),
  ]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const chunk = (type: string, data: Buffer): Buffer => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
