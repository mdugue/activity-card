// Shared chart helpers. Pure functions — no theme styling baked in.

export type Coord = [number, number];

/**
 * Aspect-preserving route path string fitted into a w×h box. Thin wrapper over
 * `projectRoute` (which also returns the projected points / start / end); use
 * this when only the `d` string is needed.
 */
export function routePath(
  coords: Coord[] | undefined,
  w: number,
  h: number,
  pad = 0
): string {
  return projectRoute(coords, w, h, pad).d;
}

export function elevationPath(
  profile: number[] | undefined,
  w: number,
  h: number,
  pad = 0,
  close = false
): string {
  if (!profile || profile.length === 0) {
    return "";
  }
  const minV = Math.min(...profile);
  const maxV = Math.max(...profile);
  const dv = maxV - minV || 1;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  // Single-point profile: anchor at the left edge so stepX division below
  // can't blow up to Infinity and emit NaN coords.
  const stepX = profile.length > 1 ? innerW / (profile.length - 1) : 0;
  const pts: Coord[] = profile.map((v, i) => [
    pad + i * stepX,
    pad + innerH - ((v - minV) / dv) * innerH,
  ]);
  let d = pts
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`
    )
    .join(" ");
  if (close) {
    d += ` L${(pad + innerW).toFixed(2)} ${(pad + innerH).toFixed(2)}`;
    d += ` L${pad.toFixed(2)} ${(pad + innerH).toFixed(2)} Z`;
  }
  return d;
}

export function pacePath(
  profile: number[] | undefined,
  w: number,
  h: number,
  pad = 0,
  close = false
): string {
  // pace is "lower = faster" — invert so faster shows up higher
  if (!profile || profile.length === 0) {
    return "";
  }
  const minV = Math.min(...profile);
  const maxV = Math.max(...profile);
  const dv = maxV - minV || 1;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const stepX = profile.length > 1 ? innerW / (profile.length - 1) : 0;
  const pts: Coord[] = profile.map((v, i) => [
    pad + i * stepX,
    pad + ((v - minV) / dv) * innerH,
  ]);
  let d = pts
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`
    )
    .join(" ");
  if (close) {
    d += ` L${(pad + innerW).toFixed(2)} ${(pad + innerH).toFixed(2)}`;
    d += ` L${pad.toFixed(2)} ${(pad + innerH).toFixed(2)} Z`;
  }
  return d;
}

export interface Lane {
  h: number;
  w: number;
  x: number;
  y: number;
}

// generate an abstract "pool" or "track" pattern when no real route exists
export function abstractLanes(
  w: number,
  h: number,
  lanes = 6,
  pad = 40
): Lane[] {
  const stripeH = (h - pad * 2) / lanes;
  return Array.from({ length: lanes }, (_, i) => ({
    x: pad,
    y: pad + i * stripeH,
    w: w - pad * 2,
    h: stripeH,
  }));
}

export function fmtSec(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r < 10 ? "0" : ""}${r}`;
}

export interface ProjectedRoute {
  d: string;
  end: Coord | null;
  /** every coordinate projected into the w×h box, in order */
  points: Coord[];
  start: Coord | null;
}

/**
 * Project a route into a w×h box and return the path string plus the projected
 * points (needed for start/end markers and gradient stops). Always
 * aspect-preserving (same maths as `routePath`): a single uniform scale plus a
 * centring offset, so the silhouette keeps its true proportions and sits in the
 * middle of the box. Routes are never stretched per-axis to fill a container —
 * a smeared silhouette misrepresents the actual route. A wide box (e.g. the
 * seamless carousel strip) therefore shows the route centred at its real
 * proportions, not edge-to-edge.
 */
export function projectRoute(
  coords: Coord[] | undefined,
  w: number,
  h: number,
  pad = 0
): ProjectedRoute {
  return projectRoutes([coords], w, h, pad)[0];
}

/**
 * Project several routes into one **shared** w×h box: a single uniform scale and
 * centring offset computed over the combined bounding box of every route, so the
 * silhouettes keep their true proportions *and their real positions relative to
 * one another*. This is what a multi-activity project (e.g. a triathlon's swim /
 * bike / run legs) needs — each leg drawn in the same coordinate system rather
 * than each rescaled to its own box. Empty/absent routes map to an empty
 * `ProjectedRoute` so the return array stays index-aligned with the input.
 */
export function projectRoutes(
  routes: (Coord[] | undefined)[],
  w: number,
  h: number,
  pad = 0
): ProjectedRoute[] {
  const all: Coord[] = [];
  for (const r of routes) {
    if (r) {
      for (const c of r) {
        all.push(c);
      }
    }
  }
  const empty: ProjectedRoute = { d: "", points: [], start: null, end: null };
  if (all.length === 0) {
    return routes.map(() => ({ ...empty }));
  }
  const xs = all.map((c) => c[0]);
  const ys = all.map((c) => c[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const dx = Math.max(...xs) - minX || 1;
  const dy = Math.max(...ys) - minY || 1;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  // One uniform scale + centre offset over the combined bbox → every route keeps
  // its real aspect ratio and its true position relative to the others.
  const scale = Math.min(innerW / dx, innerH / dy);
  const offsetX = pad + (innerW - dx * scale) / 2;
  const offsetY = pad + (innerH - dy * scale) / 2;

  return routes.map((coords) => {
    if (!coords || coords.length === 0) {
      return { ...empty };
    }
    const points: Coord[] = coords.map((c) => [
      offsetX + (c[0] - minX) * scale,
      offsetY + (c[1] - minY) * scale,
    ]);
    const d = points
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`
      )
      .join(" ");
    return { d, points, start: points[0], end: points.at(-1) ?? null };
  });
}

export interface NormalizedCurve {
  /**
   * Fractional points. `x ∈ [offset, offset + widthFrac]` — each leg occupies
   * its own slice of the [0,1] axis, laid out left→right with no gaps; `y ∈
   * [0, 1]` where 1 is the highest value (drawn toward the top).
   */
  pts: Coord[];
  /** Share of the full width this leg occupies (all legs sum to 1). */
  widthFrac: number;
}

/**
 * Lay several profiles out **side by side** along one horizontal axis — for a
 * multi-activity project's elevation (or pace) legs shown end-to-end in a single
 * frame (swim · bike · run reading left→right), not stacked on top of each other.
 *
 * - **Shared height scale:** every leg is normalised against the global min/max
 *   across *all* profiles, so they're directly comparable and the seam between
 *   two legs can jump (a high climb meeting a flat run reads as a real step).
 * - **Shared width scale, no gaps:** each leg's width is proportional to its
 *   `weight` (distance) at one constant scale, and the legs abut — their widths
 *   sum to the full axis. A 90 km ride is ~4× as wide as a 21 km run.
 *
 * `weights[i]` is typically each leg's distance; when absent the point count is
 * used as a stand-in. Profiles with fewer than two points are dropped (and so
 * are their weights), keeping the result tight rather than index-aligned.
 */
export function sequenceProfiles(
  profiles: number[][],
  weights: (number | undefined)[],
  useElevation = true
): NormalizedCurve[] {
  const valid = profiles
    .map((p, i) => ({ p, weight: weights[i] }))
    .filter((e) => e.p.length > 1);
  if (valid.length === 0) {
    return [];
  }
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const { p } of valid) {
    for (const v of p) {
      if (v < min) {
        min = v;
      }
      if (v > max) {
        max = v;
      }
    }
  }
  const dv = max - min || 1;
  const widthOf = (e: { p: number[]; weight?: number }) =>
    e.weight !== undefined && e.weight > 0 ? e.weight : e.p.length;
  const total = valid.reduce((sum, e) => sum + widthOf(e), 0) || 1;
  let cursor = 0;
  return valid.map((e) => {
    const widthFrac = widthOf(e) / total;
    const offset = cursor;
    cursor += widthFrac;
    const n = e.p.length;
    const pts: Coord[] = e.p.map((v, i) => {
      const tx = offset + (n > 1 ? (i / (n - 1)) * widthFrac : 0);
      // 1 = highest point. Pace is "lower is better", so invert it.
      const ty = useElevation ? (v - min) / dv : (max - v) / dv;
      return [tx, ty];
    });
    return { pts, widthFrac };
  });
}

export interface OverlayPath {
  /** Filled-area path (line closed down to the baseline within the leg's slice). */
  area: string;
  /** This leg's right edge in box coordinates. */
  endX: number;
  /** Open line path. */
  line: string;
  widthFrac: number;
}

/**
 * Map sequenced curves into `line` + filled `area` path strings inside a w×h box
 * (y grows downward, the curve's highest point near the top). `reach` is a
 * vertical-exaggeration factor (1 = use the full height). Each area closes down
 * to the baseline between the leg's own left and right edges, so adjacent legs
 * abut cleanly (with a vertical step at the seam) rather than smearing fills.
 */
export function sequencePaths(
  curves: NormalizedCurve[],
  w: number,
  h: number,
  reach = 1
): OverlayPath[] {
  const clampReach = Math.min(1, Math.max(0, reach));
  return curves.map((c) => {
    const pts = c.pts.map(
      (p) => [p[0] * w, h - p[1] * h * clampReach] as Coord
    );
    const line = pts
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`
      )
      .join(" ");
    const startX = pts[0]?.[0] ?? 0;
    const endX = pts.at(-1)?.[0] ?? w;
    const area = `${line} L${endX.toFixed(1)} ${h.toFixed(1)} L${startX.toFixed(1)} ${h.toFixed(1)} Z`;
    return { line, area, endX, widthFrac: c.widthFrac };
  });
}

/* ------------- colour helpers (accent shades for overlaid routes) --------- */

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

const toHexByte = (n: number) =>
  Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0");

/** Linear blend of two hex colours; `t=0` → `a`, `t=1` → `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const m = (i: number) => toHexByte(pa[i] + (pb[i] - pa[i]) * t);
  return `#${m(0)}${m(1)}${m(2)}`;
}

/**
 * A coherent ramp of `n` shades in the accent's colour family — a bright tint
 * through to a deep shade — for distinguishing several overlaid routes without
 * leaving the accent hue. `n <= 1` returns the accent itself.
 */
export function accentShades(accent: string, n: number): string[] {
  if (n <= 0) {
    return [];
  }
  if (n === 1) {
    return [accent];
  }
  const light = mixHex(accent, "#ffffff", 0.5);
  const dark = mixHex(accent, "#000000", 0.4);
  return Array.from({ length: n }, (_, i) => mixHex(light, dark, i / (n - 1)));
}

/**
 * White legs at a gentle opacity ramp — the "over a photo" analogue of
 * `accentShades`, for distinguishing several overlaid routes/curves while staying
 * legible on an arbitrary image. `n <= 1` is solid white.
 */
export function whiteRamp(n: number): string[] {
  return Array.from({ length: n }, (_, i) =>
    n <= 1 ? "#ffffff" : `rgba(255,255,255,${Math.max(0.5, 1 - i * 0.25)})`
  );
}
