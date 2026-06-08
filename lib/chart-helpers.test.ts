/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  accentShades,
  type Coord,
  mixHex,
  projectRoutes,
  sequencePaths,
  sequenceProfiles,
} from "@/lib/chart-helpers";

describe("projectRoutes", () => {
  test("returns an index-aligned empty result when every route is absent", () => {
    const out = projectRoutes([undefined, []], 100, 100, 0);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ d: "", points: [], start: null, end: null });
    expect(out[1]).toEqual({ d: "", points: [], start: null, end: null });
  });

  test("projects several routes through ONE shared bounding box", () => {
    // Two routes occupying different halves of the same space. A shared bbox
    // means the combined extent (0..2 in x) sets the scale for both, so the
    // second route sits to the right of the first — not rescaled to its own box.
    const a: Coord[] = [
      [0, 0],
      [1, 0],
    ];
    const b: Coord[] = [
      [1, 0],
      [2, 0],
    ];
    const [pa, pb] = projectRoutes([a, b], 200, 200, 0);
    // combined dx = 2, dy = 0→1; uniform scale = min(200/2, 200/1)=100.
    expect(pa.points[0][0]).toBeCloseTo(0, 5);
    expect(pa.points[1][0]).toBeCloseTo(100, 5);
    expect(pb.points[0][0]).toBeCloseTo(100, 5);
    expect(pb.points[1][0]).toBeCloseTo(200, 5);
  });

  test("keeps absent routes as empty while still projecting present ones", () => {
    const a: Coord[] = [
      [0, 0],
      [2, 2],
    ];
    const [pa, missing] = projectRoutes([a, undefined], 100, 100, 0);
    expect(pa.d).not.toBe("");
    expect(missing.d).toBe("");
  });
});

describe("sequenceProfiles", () => {
  test("drops profiles with fewer than two points", () => {
    expect(sequenceProfiles([[1]], [undefined])).toEqual([]);
    expect(sequenceProfiles([], [])).toEqual([]);
  });

  test("shares one vertical scale across all profiles", () => {
    // Global min 0, max 100. The flat low profile reads near the bottom (ty≈0),
    // the tall profile reaches the top (ty=1).
    const [flat, tall] = sequenceProfiles(
      [
        [10, 10],
        [0, 100],
      ],
      [undefined, undefined]
    );
    expect(flat.pts[0][1]).toBeCloseTo(0.1, 5);
    expect(flat.pts[1][1]).toBeCloseTo(0.1, 5);
    expect(tall.pts[0][1]).toBeCloseTo(0, 5);
    expect(tall.pts[1][1]).toBeCloseTo(1, 5);
  });

  test("lays legs side by side, weighted, summing to the full width", () => {
    const [long, short] = sequenceProfiles(
      [
        [0, 1],
        [0, 1],
      ],
      [75, 25]
    );
    // Widths share the total (75 + 25) → 0.75 and 0.25, summing to 1.
    expect(long.widthFrac).toBeCloseTo(0.75, 5);
    expect(short.widthFrac).toBeCloseTo(0.25, 5);
    // The first leg starts at 0 and ends at 0.75; the next abuts it (no gap)
    // and runs to the full width.
    expect(long.pts[0][0]).toBeCloseTo(0, 5);
    expect(long.pts.at(-1)?.[0]).toBeCloseTo(0.75, 5);
    expect(short.pts[0][0]).toBeCloseTo(0.75, 5);
    expect(short.pts.at(-1)?.[0]).toBeCloseTo(1, 5);
  });

  test("inverts pace so faster (lower) reads higher", () => {
    const [c] = sequenceProfiles([[300, 240]], [undefined], false);
    // min 240, max 300; first point (slowest) sits low, second (fastest) high.
    expect(c.pts[0][1]).toBeCloseTo(0, 5);
    expect(c.pts[1][1]).toBeCloseTo(1, 5);
  });

  test("falls back to point count when weights are absent", () => {
    const [a, b] = sequenceProfiles(
      [
        [0, 1, 2, 3],
        [0, 1],
      ],
      [undefined, undefined]
    );
    // 4 points + 2 points → 6 total → 0.666… and 0.333…
    expect(a.widthFrac).toBeCloseTo(2 / 3, 5);
    expect(b.widthFrac).toBeCloseTo(1 / 3, 5);
  });
});

describe("sequencePaths", () => {
  test("each leg's area closes within its own slice (abutting, no gap)", () => {
    const curves = sequenceProfiles(
      [
        [0, 1],
        [0, 1],
      ],
      [50, 50]
    );
    const [a, b] = sequencePaths(curves, 100, 10);
    // First leg spans x 0→50, second 50→100; areas close to the baseline (y=10)
    // between each leg's own left/right edge.
    expect(a.endX).toBeCloseTo(50, 1);
    expect(a.area).toContain("L50.0 10.0 L0.0 10.0 Z");
    expect(b.endX).toBeCloseTo(100, 1);
    expect(b.area).toContain("L100.0 10.0 L50.0 10.0 Z");
  });
});

describe("mixHex / accentShades", () => {
  test("mixHex interpolates endpoints", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  test("mixHex expands 3-digit hex", () => {
    expect(mixHex("#fff", "#000", 0)).toBe("#ffffff");
  });

  test("accentShades returns the accent itself for n<=1", () => {
    expect(accentShades("#c45a2c", 1)).toEqual(["#c45a2c"]);
    expect(accentShades("#c45a2c", 0)).toEqual([]);
  });

  test("accentShades returns n distinct shades in order", () => {
    const shades = accentShades("#c45a2c", 3);
    expect(shades).toHaveLength(3);
    expect(new Set(shades).size).toBe(3);
  });
});
