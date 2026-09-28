/**
 * STRATA theme — configuration model, mood palettes, and the pure morph
 * geometry.
 *
 * Kept JSX-free (mirrors `lib/altitude.ts`) so the generative field maths —
 * resampling, the route→profile positional morph, the Catmull-Rom smoothing — is
 * unit-testable under `bun:test`. The component in `components/themes/strata.tsx`
 * consumes these; `mood` / `density` / `legend` are exposed as theme props
 * (defaulted by `DEFAULT_STRATA_CONFIG`) and showcased in the colocated story.
 *
 * The concept: the activity's route polyline (top) is morphed point-by-point
 * down into its elevation (or pace) profile (bottom). Each in-between layer
 * interpolates every point's POSITION between the two, so the real route
 * literally unfurls into the profile — abstract enough to be art, legible enough
 * to read where it came from. Both source curves stay highlighted; the woven
 * layers between are the abstraction.
 */

import type { Coord } from "@/lib/chart-helpers";
import { isMultiActivity } from "@/lib/multi-activity";
import {
  legSeries,
  profileSignal,
  segmentProfileMetric,
} from "@/lib/profile-signal";
import type { ParamDef } from "@/theme/core/params/kinds";
import type { ActivityView } from "@/theme/core/theme-contract";

/* ----------------------------- configuration ----------------------------- */

/** The light the card is bathed in: gradient atmosphere + highlight colours. */
export type StrataMood = "paper" | "dawn" | "dusk" | "midnight" | "alpine";

/** How finely the route is woven down into the profile (the layer count). */
export type StrataDensity = "fine" | "woven" | "bold";

// Extends Record so the config flows through the generic param registry /
// coercer without casts; declared keys keep their precise types.
export interface StrataConfig extends Record<string, unknown> {
  /** How finely the field is woven — the number of strata layers. */
  density: StrataDensity;
  /** Mark the peak height + a direction arrow on the field. */
  legend: boolean;
  /** Atmosphere preset: palette gradient and the two highlight colours. */
  mood: StrataMood;
}

export const DEFAULT_STRATA_CONFIG: StrataConfig = {
  density: "woven",
  legend: true,
  mood: "dusk",
};

/* ------------------------------- the moods ------------------------------- */

export interface StrataMoodTokens {
  /** CSS background — a gradient (atmosphere) or a flat paper tone. */
  bg: string;
  /** The bottom hero: the elevation / pace profile. */
  elevColor: string;
  faint: string;
  /** Stroke width of the two hero curves. */
  heroW: number;
  /** Stat text uses `text` (true) or white (false). */
  inkStat: boolean;
  /** Uppercase name shown in the corner of the card. */
  label: string;
  /** Base opacity of the woven in-between layers. */
  lineAlpha: number;
  /** Stroke width of the woven in-between layers. */
  midW: number;
  /** The top hero: the real route. */
  routeColor: string;
  /** `r,g,b` tone for the legibility scrim drawn over a background photo. */
  scrim: string;
  statBg: string;
  statBorder: string;
  text: string;
}

export const STRATA_MOODS: Record<StrataMood, StrataMoodTokens> = {
  alpine: {
    bg: "linear-gradient(180deg, #dfeaf0 0%, #c3d7e2 52%, #e7ded2 100%)",
    elevColor: "#5a6470",
    faint: "rgba(22,36,44,0.5)",
    heroW: 4.5,
    inkStat: true,
    label: "ALPINE",
    lineAlpha: 0.32,
    midW: 1.4,
    routeColor: "#1f5a6b",
    scrim: "223,234,240",
    statBg: "rgba(255,255,255,0.66)",
    statBorder: "rgba(22,36,44,0.16)",
    text: "#16242c",
  },
  dawn: {
    bg: "linear-gradient(180deg, #f6ddc2 0%, #f0c9c1 34%, #e6b4cd 66%, #c9b2da 100%)",
    elevColor: "#e0823a",
    faint: "rgba(42,34,64,0.55)",
    heroW: 4.5,
    inkStat: true,
    label: "DAWN",
    lineAlpha: 0.34,
    midW: 1.4,
    routeColor: "#3a2b5c",
    scrim: "246,221,194",
    statBg: "rgba(255,252,247,0.66)",
    statBorder: "rgba(42,34,64,0.16)",
    text: "#2a2240",
  },
  dusk: {
    bg: "linear-gradient(180deg, #241335 0%, #5e2450 32%, #b1402c 64%, #ec8a3c 100%)",
    elevColor: "#ff6a3a",
    faint: "rgba(248,234,215,0.62)",
    heroW: 4.5,
    inkStat: false,
    label: "DUSK",
    lineAlpha: 0.4,
    midW: 1.5,
    routeColor: "#ffd98a",
    scrim: "16,8,24",
    statBg: "rgba(26,10,22,0.4)",
    statBorder: "rgba(248,234,215,0.2)",
    text: "#f8ead7",
  },
  midnight: {
    bg: "linear-gradient(180deg, #0a1230 0%, #142250 46%, #1d2f66 100%)",
    elevColor: "#b89bff",
    faint: "rgba(231,237,255,0.6)",
    heroW: 4.5,
    inkStat: false,
    label: "MIDNIGHT",
    lineAlpha: 0.42,
    midW: 1.5,
    routeColor: "#82e3e0",
    scrim: "6,11,28",
    statBg: "rgba(6,11,28,0.5)",
    statBorder: "rgba(231,237,255,0.16)",
    text: "#e7edff",
  },
  paper: {
    bg: "#f3ede2",
    elevColor: "#c45a2c",
    faint: "rgba(26,23,20,0.6)",
    heroW: 4.5,
    inkStat: true,
    label: "PAPER",
    lineAlpha: 0.3,
    midW: 1.35,
    routeColor: "#1a1714",
    scrim: "243,237,226",
    statBg: "rgba(255,253,248,0.7)",
    statBorder: "rgba(26,23,20,0.2)",
    text: "#1a1714",
  },
};

/** Layer count per density step — more layers read as a finer weave. */
export const STRATA_DENSITY_K: Record<StrataDensity, number> = {
  bold: 14,
  fine: 36,
  woven: 24,
};

/* --------------------- poetic wording (labels / blurbs) ------------------- */
// Surfaced in the story (and available to any future picker UI) so the moods and
// densities read as evocations rather than enum keys.

export const STRATA_MOOD_LABELS: Record<StrataMood, string> = {
  alpine: "Alpine",
  dawn: "Dawn",
  dusk: "Dusk",
  midnight: "Midnight",
  paper: "Paper",
};

export const STRATA_MOOD_BLURBS: Record<StrataMood, string> = {
  alpine: "cold haze over the range",
  dawn: "first light — rose into amber",
  dusk: "the sun going down in fire",
  midnight: "deep blue, lit from within",
  paper: "graphite on a folded map",
};

export const STRATA_DENSITY_LABELS: Record<StrataDensity, string> = {
  bold: "Bold",
  fine: "Fine",
  woven: "Woven",
};

export const STRATA_DENSITY_BLURBS: Record<StrataDensity, string> = {
  bold: "a few bare ridges",
  fine: "many gossamer layers",
  woven: "the balanced weave",
};

/* ---------------------------- parameter schema ---------------------------- */
// The editor renders these generically (grouped by `group`). Atmosphere is a
// STYLE choice; density is a LAYOUT choice; the legend markers file under MARKS.

const MOOD_ORDER: StrataMood[] = [
  "paper",
  "dawn",
  "dusk",
  "midnight",
  "alpine",
];
const DENSITY_ORDER: StrataDensity[] = ["fine", "woven", "bold"];

export const STRATA_PARAMS: ParamDef[] = [
  {
    default: DEFAULT_STRATA_CONFIG.mood,
    group: "style",
    id: "mood",
    kind: "segmented",
    label: "ATMOSPHERE",
    options: MOOD_ORDER.map((m) => ({
      blurb: STRATA_MOOD_BLURBS[m],
      id: m,
      label: STRATA_MOOD_LABELS[m],
    })),
  },
  {
    default: DEFAULT_STRATA_CONFIG.density,
    group: "layout",
    id: "density",
    kind: "segmented",
    label: "DENSITY",
    options: DENSITY_ORDER.map((d) => ({
      blurb: STRATA_DENSITY_BLURBS[d],
      id: d,
      label: STRATA_DENSITY_LABELS[d],
    })),
  },
  {
    default: DEFAULT_STRATA_CONFIG.legend,
    group: "marks",
    id: "legend",
    kind: "toggle",
    label: "Peak height & direction arrow",
  },
];

/* --------------------------- source resolution ---------------------------- */

export interface StrataSource {
  /** Peak elevation (m) for the caption, when the profile is elevation. */
  elevMax: number | null;
  profile: number[];
  /** Caption for the bottom ridge: "ELEVATION" | "PACE" | "LAPS". */
  profileLabel: string;
  routeCoords: Coord[];
}

type PickedProfile = Pick<StrataSource, "profile" | "profileLabel" | "elevMax">;

/** The profile that becomes the bottom ridge — the shared profile-signal rule
 *  (`lib/profile-signal.ts`): elevation, then pace, then laps. */
const pickProfile = (data: ActivityView): PickedProfile | null => {
  const signal = profileSignal(data);
  if (signal.mode === "none") {
    return null;
  }
  return {
    elevMax:
      signal.mode === "elevation"
        ? Math.round(Math.max(...signal.series))
        : null,
    profile: signal.series,
    profileLabel: signal.label,
  };
};

/**
 * Multi-activity: keep only legs that carry BOTH a route and the project's
 * chosen profile metric (elevation when any leg has it, else pace), and
 * concatenate them in order. Pairing each route with its own leg's profile keeps
 * the morph progress-aligned — a swim leg with a route but no elevation is
 * skipped rather than smearing the route's swim third against the bike's climb.
 */
const resolveMultiStrataSource = (data: ActivityView): StrataSource | null => {
  const segs = data.segments ?? [];
  const metric = segmentProfileMetric(segs);
  const useElevation = metric === "elevation";
  const routeCoords: Coord[] = [];
  const profile: number[] = [];
  for (const s of segs) {
    const prof = legSeries(s, metric);
    const legRoute = s.routeCoordinates;
    if (legRoute && legRoute.length > 1 && prof) {
      for (const c of legRoute) {
        routeCoords.push(c);
      }
      for (const v of prof) {
        profile.push(v);
      }
    }
  }
  if (routeCoords.length < 2 || profile.length < 2) {
    return null;
  }
  return {
    elevMax: useElevation ? Math.round(Math.max(...profile)) : null,
    profile,
    profileLabel: useElevation ? "ELEVATION" : "PACE",
    routeCoords,
  };
};

/**
 * Resolve the two source curves the field morphs between. A single activity uses
 * its top-level route + profile (both indexed by the same progress). A
 * multi-activity project (triathlon, brick) keeps its geometry on the segments,
 * so it pairs each leg's route with that SAME leg's profile and concatenates in
 * order — see `resolveMultiStrataSource`. Returns `null` without enough geometry.
 */
export const resolveStrataSource = (
  data: ActivityView
): StrataSource | null => {
  const route = data.routeCoordinates;
  const picked = pickProfile(data);
  if (route && route.length > 1 && picked) {
    return { routeCoords: route, ...picked };
  }
  if (isMultiActivity(data)) {
    return resolveMultiStrataSource(data);
  }
  return null;
};

/* ------------------------------ morph maths ------------------------------- */

/** Resample a 1-D series to exactly `n` points (linear interp by index). */
const resampleValues = (arr: number[], n: number): number[] => {
  const out: number[] = [];
  const len = arr.length;
  for (let i = 0; i < n; i += 1) {
    const t = (i / (n - 1)) * (len - 1);
    const i0 = Math.floor(t);
    const i1 = Math.min(len - 1, i0 + 1);
    const f = t - i0;
    out.push(arr[i0] * (1 - f) + arr[i1] * f);
  }
  return out;
};

/** Resample a point sequence to exactly `n` points (linear interp by index). */
const resamplePoints = (pts: Coord[], n: number): Coord[] => {
  const out: Coord[] = [];
  const len = pts.length;
  for (let i = 0; i < n; i += 1) {
    const t = (i / (n - 1)) * (len - 1);
    const i0 = Math.floor(t);
    const i1 = Math.min(len - 1, i0 + 1);
    const f = t - i0;
    const a = pts[i0];
    const b = pts[i1];
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
};

/** Catmull-Rom → cubic-bezier path string, for silky curves through `pts`. */
export const smoothPath = (pts: Coord[]): string => {
  if (pts.length < 2) {
    return "";
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i + 2 < pts.length ? pts[i + 2] : p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
};

export interface BuildStrataOptions {
  elevBand?: number;
  elevTop?: number;
  H: number;
  /** Number of woven layers; the field has `K + 1` curves (route → profile). */
  K: number;
  /** Resampling resolution — both source curves are resampled to `N` points. */
  N?: number;
  padX?: number;
  profile: number[];
  routeBand?: number;
  routeCoords: Coord[];
  routeTop?: number;
  /** Fill the full width (wide panoramas) instead of keeping the map aspect. */
  stretch?: boolean;
  W: number;
}

export interface StrataCurve {
  pts: Coord[];
  /** Layer position: 0 = the route, 1 = the profile. */
  t: number;
}

export interface StrataGeometry {
  /** `K + 1` curves, route (`t = 0`) → profile (`t = 1`). */
  curves: StrataCurve[];
  elevPts: Coord[];
  routePts: Coord[];
}

/**
 * Morph the route polyline (top band) into the elevation/pace profile (bottom
 * band). Both are resampled to `N` points and indexed by the same parameter
 * (progress along the activity); each layer `t` interpolates every point's
 * POSITION from where it sits on the real map to where it sits on the profile,
 * so the route unfurls into the profile. A round-trip naturally fans out from
 * its shared start/finish (one place on the map → the full width of the
 * profile). The route keeps its true aspect (centred) unless `stretch` is set.
 */
export const buildStrata = (opts: BuildStrataOptions): StrataGeometry => {
  const {
    routeCoords,
    profile,
    W,
    H,
    K,
    N = 220,
    stretch = false,
    routeTop = 0.04,
    routeBand = 0.42,
    elevTop = 0.6,
    elevBand = 0.32,
    padX = 0.05,
  } = opts;

  const rc = resamplePoints(routeCoords, N);
  const pr = resampleValues(profile, N);

  // Route fitted into the TOP band.
  const xs = rc.map((p) => p[0]);
  const ys = rc.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  const px = W * padX;
  const innerW = W - px * 2;
  const innerH = H * routeBand;
  let routePts: Coord[];
  if (stretch) {
    routePts = rc.map((p): Coord => [
      px + ((p[0] - minX) / dx) * innerW,
      H * routeTop + ((p[1] - minY) / dy) * innerH,
    ]);
  } else {
    const sc = Math.min(innerW / dx, innerH / dy);
    const offX = px + (innerW - dx * sc) / 2;
    const offY = H * routeTop + (innerH - dy * sc) / 2;
    routePts = rc.map((p): Coord => [
      offX + (p[0] - minX) * sc,
      offY + (p[1] - minY) * sc,
    ]);
  }

  // Profile fitted into the BOTTOM band — full width, profile shape.
  const minV = Math.min(...pr);
  const maxV = Math.max(...pr);
  const dv = maxV - minV || 1;
  const eTop = H * elevTop;
  const eH = H * elevBand;
  const elevPts: Coord[] = pr.map((v, i): Coord => [
    px + (i / (N - 1)) * innerW,
    eTop + (1 - (v - minV) / dv) * eH,
  ]);

  const curves: StrataCurve[] = [];
  for (let k = 0; k <= K; k += 1) {
    const t = k / K;
    // The two heroes ARE the source bands — assign them exactly rather than
    // lerp-rounded (`rp + (ep - rp) * 1` drifts by a float ULP from `ep`).
    let pts: Coord[];
    if (k === 0) {
      pts = routePts;
    } else if (k === K) {
      pts = elevPts;
    } else {
      pts = routePts.map((rp, i): Coord => {
        const ep = elevPts[i];
        return [rp[0] + (ep[0] - rp[0]) * t, rp[1] + (ep[1] - rp[1]) * t];
      });
    }
    curves.push({ pts, t });
  }
  return { curves, elevPts, routePts };
};

/* ------------------------------- markers ---------------------------------- */
// Subtle annotations the `legend` toggle reveals: the peak height pinned beside
// the highest point of the elevation ridge, and a direction arrow set beside the
// route. Pure geometry (the SVG is drawn by each theme family) so both the
// single card and the carousel place them identically.

export interface StrataPeak {
  /** e.g. "302 M" */
  label: string;
  x: number;
  y: number;
}

/**
 * The highest point of the elevation ridge + its label, or `null` when there's
 * no elevation peak to mark (pace / lap-pace profiles carry no metre height).
 */
export const strataPeakMarker = (
  elevPts: Coord[],
  elevMax: number | null
): StrataPeak | null => {
  if (elevMax === null || elevPts.length === 0) {
    return null;
  }
  let [peak] = elevPts;
  for (const p of elevPts) {
    if (p[1] < peak[1]) {
      peak = p;
    }
  }
  return { label: `${elevMax} M`, x: peak[0], y: peak[1] };
};

export interface StrataArrow {
  /** rotation in degrees, aligned with the direction of travel */
  angle: number;
  x: number;
  y: number;
}

/**
 * A direction arrow placed BESIDE the route (offset perpendicular, pointing
 * along travel). Picks the clearest of a few candidate progress points — the one
 * whose neighbourhood is least crowded by other parts of the track, so the
 * arrow's relation to the path reads cleanly — and falls back to `preferredT`
 * (default 30%). The anchor is clamped to stay inside the W×H field.
 */
export const strataDirectionArrow = (
  routePts: Coord[],
  w: number,
  h: number,
  offset: number,
  preferredT = 0.3
): StrataArrow | null => {
  const n = routePts.length;
  if (n < 4) {
    return null;
  }
  const gap = Math.max(4, Math.floor(n * 0.07));
  const idxOf = (t: number) =>
    Math.max(gap, Math.min(n - 1 - gap, Math.round(t * (n - 1))));

  const clearanceAt = (i: number): number => {
    const p = routePts[i];
    let min = Number.POSITIVE_INFINITY;
    for (let j = 0; j < n; j += 1) {
      if (Math.abs(j - i) < gap) {
        continue;
      }
      const d = Math.hypot(routePts[j][0] - p[0], routePts[j][1] - p[1]);
      if (d < min) {
        min = d;
      }
    }
    return min;
  };

  // Prefer the requested point, but take a clearly more open one if offered.
  let bestI = idxOf(preferredT);
  let best = clearanceAt(bestI);
  for (const t of [0.45, 0.6, 0.25, 0.7, 0.5, 0.38]) {
    const i = idxOf(t);
    const c = clearanceAt(i);
    if (c > best * 1.15) {
      best = c;
      bestI = i;
    }
  }

  const i = bestI;
  const a = routePts[Math.max(0, i - gap)];
  const b = routePts[Math.min(n - 1, i + gap)];
  const tl = Math.hypot(b[0] - a[0], b[1] - a[1]);
  // A (near-)stationary track has no meaningful heading — skip the arrow rather
  // than draw one with an arbitrary angle at a single point.
  if (tl < 1e-6) {
    return null;
  }
  const ux = (b[0] - a[0]) / tl;
  const uy = (b[1] - a[1]) / tl;

  // Perpendicular, pointing away from the route's centre so the arrow lands in
  // the open space beside the path rather than over it.
  let nx = -uy;
  let ny = ux;
  let cx = 0;
  let cy = 0;
  for (const p of routePts) {
    cx += p[0];
    cy += p[1];
  }
  cx /= n;
  cy /= n;
  const anchor = routePts[i];
  if ((anchor[0] - cx) * nx + (anchor[1] - cy) * ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const margin = offset + 16;
  return {
    angle: (Math.atan2(uy, ux) * 180) / Math.PI,
    x: Math.max(margin, Math.min(w - margin, anchor[0] + nx * offset)),
    y: Math.max(margin, Math.min(h - margin, anchor[1] + ny * offset)),
  };
};
