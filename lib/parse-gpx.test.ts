/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import { parseGpx } from "@/lib/parse-gpx";

function gpx(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1">${body}</gpx>`;
}

function trkpt(lat: string, lon: string, ele: number, time: string): string {
  return `<trkpt lat="${lat}" lon="${lon}"><ele>${ele}</ele><time>${time}</time></trkpt>`;
}

const THREE_POINT_RIDE = gpx(
  `<trk><name>Morning Ride</name><type>cycling</type><trkseg>${[
    trkpt("47.0", "11.0", 500, "2026-05-18T07:00:00Z"),
    trkpt("47.001", "11.0", 505, "2026-05-18T07:01:00Z"),
    trkpt("47.002", "11.0", 510, "2026-05-18T07:02:00Z"),
  ].join("")}</trkseg></trk>`
);

describe("parseGpx", () => {
  test("parses a minimal track into a ride", () => {
    const parsed = parseGpx(THREE_POINT_RIDE, "morning.gpx");
    expect(parsed.sport).toBe("ride");
    expect(parsed.title).toBe("Morning Ride");
    expect(parsed.durationSec).toBe(120);
    expect(parsed.distanceKm).toBeGreaterThan(0.1);
    expect(parsed.distanceKm).toBeLessThan(0.5);
    expect(parsed.routeCoordinates?.length).toBe(3);
    expect(parsed.elevationGainM).toBe(10);
  });

  // fast-xml-parser is lenient: bare garbage parses to an empty document, so
  // it flows through as an empty activity rather than the "not XML" error.
  // Pinned here so a future parser-config change shows up as a test diff.
  test("non-XML garbage degrades to an empty activity, not a crash", () => {
    const parsed = parseGpx("garbage{{{", "broken.gpx");
    expect(parsed.distanceKm).toBe(0);
    expect(parsed.durationSec).toBe(0);
  });

  test("structurally broken GPX throws the schema error", () => {
    expect(() => parseGpx("<gpx><trk>", "broken.gpx")).toThrow(
      /does not look like a valid GPX/u
    );
  });

  test("throws the GPX error for XML that is not GPX-shaped", () => {
    // Valid XML, but `gpx.trk.trkseg` has the wrong shape (a bare string).
    expect(() =>
      parseGpx(gpx("<trk><trkseg>nope</trkseg></trk>"), "weird.gpx")
    ).toThrow(/does not look like a valid GPX/u);
  });

  test("a GPX without any track yields an empty activity, not a crash", () => {
    const parsed = parseGpx(
      gpx("<metadata><name>Empty</name></metadata>"),
      "empty.gpx"
    );
    expect(parsed.distanceKm).toBe(0);
    expect(parsed.durationSec).toBe(0);
  });

  test("non-numeric coordinates never leak NaN into the route", () => {
    const text = gpx(
      `<trk><name>Odd</name><trkseg>${[
        trkpt("abc", "11.0", 500, "2026-05-18T07:00:00Z"),
        trkpt("47.001", "11.0", 505, "2026-05-18T07:01:00Z"),
        trkpt("47.002", "11.0", 510, "2026-05-18T07:02:00Z"),
      ].join("")}</trkseg></trk>`
    );
    const parsed = parseGpx(text, "odd.gpx");
    for (const [x, y] of parsed.routeCoordinates ?? []) {
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
    }
  });

  test("a single-point track has zero distance and duration", () => {
    const text = gpx(
      `<trk><name>Blip</name><trkseg>${trkpt(
        "47.0",
        "11.0",
        500,
        "2026-05-18T07:00:00Z"
      )}</trkseg></trk>`
    );
    const parsed = parseGpx(text, "blip.gpx");
    expect(parsed.distanceKm).toBe(0);
    expect(parsed.durationSec).toBe(0);
  });

  test("falls back to the filename for sport and title", () => {
    const text = gpx(
      `<trk><trkseg>${[
        trkpt("47.0", "11.0", 500, "2026-05-18T07:00:00Z"),
        trkpt("47.001", "11.0", 505, "2026-05-18T07:01:00Z"),
      ].join("")}</trkseg></trk>`
    );
    const parsed = parseGpx(text, "evening_run.gpx");
    expect(parsed.sport).toBe("run");
    expect(parsed.title.toLowerCase()).toContain("run");
  });

  test("numeric names and types parse instead of failing the schema", () => {
    const text = gpx(
      `<trk><name>2024</name><type>9</type><trkseg>${[
        trkpt("47.0", "11.0", 500, "2026-05-18T07:00:00Z"),
        trkpt("47.001", "11.0", 505, "2026-05-18T07:01:00Z"),
      ].join("")}</trkseg></trk>`
    );
    const parsed = parseGpx(text, "export.gpx");
    expect(parsed.title).toContain("2024");
    expect(parsed.durationSec).toBe(60);
  });

  test("several tracks are joined in order", () => {
    const second = `<trk><trkseg>${[
      trkpt("47.003", "11.0", 515, "2026-05-18T07:03:00Z"),
      trkpt("47.004", "11.0", 520, "2026-05-18T07:04:00Z"),
    ].join("")}</trkseg></trk>`;
    const single = parseGpx(THREE_POINT_RIDE, "one.gpx");
    const text = THREE_POINT_RIDE.replace("</gpx>", `${second}</gpx>`);
    const parsed = parseGpx(text, "two.gpx");
    expect(parsed.title).toBe("Morning Ride");
    expect(parsed.sport).toBe("ride");
    expect(parsed.routeCoordinates?.length).toBe(5);
    expect(parsed.distanceKm).toBeGreaterThan(single.distanceKm);
    expect(parsed.durationSec).toBe(240);
  });

  test("reads heart rate and cadence whatever the extension prefix", () => {
    const point = (lat: string, time: string, prefix: string) =>
      `<trkpt lat="${lat}" lon="11.0"><ele>500</ele><time>${time}</time>` +
      `<extensions><${prefix}:TrackPointExtension><${prefix}:hr>150</${prefix}:hr>` +
      `<${prefix}:cad>80</${prefix}:cad></${prefix}:TrackPointExtension></extensions></trkpt>`;
    for (const prefix of ["gpxtpx", "ns3"]) {
      const text = gpx(
        `<trk><trkseg>${[
          point("47.0", "2026-05-18T07:00:00Z", prefix),
          point("47.001", "2026-05-18T07:01:00Z", prefix),
        ].join("")}</trkseg></trk>`
      );
      const parsed = parseGpx(text, "garmin.gpx");
      expect(parsed.avgHeartRate).toBe(150);
      expect(parsed.avgCadence).toBe(80);
    }
  });

  test("an empty extensions element does not fail the file", () => {
    const text = gpx(
      `<trk><trkseg><trkpt lat="47.0" lon="11.0"><extensions></extensions></trkpt></trkseg></trk>`
    );
    expect(() => parseGpx(text, "empty-ext.gpx")).not.toThrow();
  });
});
