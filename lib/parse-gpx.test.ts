/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import { parseGpx } from "@/lib/parse-gpx";

const gpx = (body: string): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1">${body}</gpx>`;

const trkpt = (lat: string, lon: string, ele: number, time: string): string =>
  `<trkpt lat="${lat}" lon="${lon}"><ele>${ele}</ele><time>${time}</time></trkpt>`;

/** Track point with HR/cadence under a non-gpxtpx (`ns3:`) prefix. */
const ns3Trkpt = (lat: string, time: string): string =>
  `<trkpt lat="${lat}" lon="11.0"><ele>500</ele><time>${time}</time><extensions><ns3:TrackPointExtension><ns3:hr>150</ns3:hr><ns3:cad>85</ns3:cad></ns3:TrackPointExtension></extensions></trkpt>`;

/** Track point with HR/cadence in an unprefixed (default-namespace) extension. */
const defaultNsTrkpt = (lat: string, time: string): string =>
  `<trkpt lat="${lat}" lon="11.0"><ele>500</ele><time>${time}</time><extensions><TrackPointExtension xmlns="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><hr>142</hr><cad>80</cad></TrackPointExtension></extensions></trkpt>`;

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

  test("numeric track name and type still parse", () => {
    const text = gpx(
      `<trk><name>2024</name><type>9</type><trkseg>${[
        trkpt("47.0", "11.0", 500, "2026-05-18T07:00:00Z"),
        trkpt("47.001", "11.0", 505, "2026-05-18T07:01:00Z"),
      ].join("")}</trkseg></trk>`
    );
    const parsed = parseGpx(text, "numeric.gpx");
    expect(parsed.title).toContain("2024");
  });

  test("concatenates the points of several <trk> elements", () => {
    const first = `<trk><name>Leg one</name><trkseg>${[
      trkpt("47.0", "11.0", 500, "2026-05-18T07:00:00Z"),
      trkpt("47.001", "11.0", 505, "2026-05-18T07:01:00Z"),
    ].join("")}</trkseg></trk>`;
    const second = `<trk><name>Leg two</name><trkseg>${[
      trkpt("47.002", "11.0", 510, "2026-05-18T07:02:00Z"),
      trkpt("47.003", "11.0", 515, "2026-05-18T07:03:00Z"),
    ].join("")}</trkseg></trk>`;
    const single = parseGpx(gpx(first), "one.gpx");
    const both = parseGpx(gpx(first + second), "two.gpx");
    expect(both.routeCoordinates?.length).toBeGreaterThan(0);
    expect(both.distanceKm).toBeGreaterThan(single.distanceKm);
    expect(both.title).toBe("Leg One");
  });

  test("reads heart rate from a non-gpxtpx extension prefix (ns3:)", () => {
    const text = gpx(
      `<trk><name>Garmin</name><trkseg>${[
        ns3Trkpt("47.0", "2026-05-18T07:00:00Z"),
        ns3Trkpt("47.001", "2026-05-18T07:01:00Z"),
      ].join("")}</trkseg></trk>`
    );
    const parsed = parseGpx(text, "garmin.gpx");
    expect(parsed.avgHeartRate).toBe(150);
    expect(parsed.avgCadence).toBe(85);
  });

  test("reads heart rate from an unprefixed (default-namespace) extension", () => {
    const text = gpx(
      `<trk><name>Default ns</name><trkseg>${[
        defaultNsTrkpt("47.0", "2026-05-18T07:00:00Z"),
        defaultNsTrkpt("47.001", "2026-05-18T07:01:00Z"),
      ].join("")}</trkseg></trk>`
    );
    const parsed = parseGpx(text, "default-ns.gpx");
    expect(parsed.avgHeartRate).toBe(142);
    expect(parsed.avgCadence).toBe(80);
  });

  test("an empty <extensions/> element does not fail the file", () => {
    const text = gpx(
      `<trk><trkseg>${[
        `<trkpt lat="47.0" lon="11.0"><time>2026-05-18T07:00:00Z</time><extensions></extensions></trkpt>`,
        `<trkpt lat="47.001" lon="11.0"><time>2026-05-18T07:01:00Z</time><extensions/></trkpt>`,
      ].join("")}</trkseg></trk>`
    );
    const parsed = parseGpx(text, "empty-ext.gpx");
    expect(parsed.durationSec).toBe(60);
    expect(parsed.avgHeartRate).toBeUndefined();
  });
});
