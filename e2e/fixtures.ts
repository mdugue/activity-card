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
    lngStart: 14.0,
    lngStep: 0.001,
    points: 40,
  }),
  bike: makeGpx({
    sport: "cycling",
    startIso: "2026-05-18T07:32:30Z",
    durationSec: 90 * 60,
    latStart: 54.5,
    latStep: 0.05,
    lngStart: 14.0,
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
  lngStart: 14.0,
  lngStep: 0.04,
  points: 100,
  hr: 150,
});

/** A 1×1 transparent PNG for photo-upload tests. */
export const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
