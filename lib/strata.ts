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

import type { ActivityData } from "@/components/app/sample-data";
import type { Coord } from "@/lib/chart-helpers";
import {
  isMultiActivity,
  segmentProfiles,
  segmentRoutes,
} from "@/lib/multi-activity";

/* ----------------------------- configuration ----------------------------- */

/** The light the card is bathed in: gradient atmosphere + highlight colours. */
export type StrataMood = "paper" | "dawn" | "dusk" | "midnight" | "alpine";

/** How finely the route is woven down into the profile (the layer count). */
export type StrataDensity = "fine" | "woven" | "bold";

export interface StrataConfig {
  /** How finely the field is woven — the number of strata layers. */
  density: StrataDensity;
  /** Draw the cartographic captions (ROUTE · ELEVATION) onto the field. */
  legend: boolean;
  /** Atmosphere preset: palette gradient and the two highlight colours. */
  mood: StrataMood;
}

export const DEFAULT_STRATA_CONFIG: StrataConfig = {
  mood: "dusk",
  density: "woven",
  legend: true,
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
  /** Start-dot / finish-arrow colour. */
  marker: string;
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
  paper: {
    label: "PAPER",
    bg: "#f3ede2",
    routeColor: "#1a1714",
    elevColor: "#c45a2c",
    text: "#1a1714",
    faint: "rgba(26,23,20,0.6)",
    lineAlpha: 0.3,
    heroW: 4.5,
    midW: 1.35,
    marker: "#c45a2c",
    scrim: "243,237,226",
    statBg: "rgba(255,253,248,0.7)",
    statBorder: "rgba(26,23,20,0.2)",
    inkStat: true,
  },
  dawn: {
    label: "DAWN",
    bg: "linear-gradient(180deg, #f6ddc2 0%, #f0c9c1 34%, #e6b4cd 66%, #c9b2da 100%)",
    routeColor: "#3a2b5c",
    elevColor: "#e0823a",
    text: "#2a2240",
    faint: "rgba(42,34,64,0.55)",
    lineAlpha: 0.34,
    heroW: 4.5,
    midW: 1.4,
    marker: "#e0823a",
    scrim: "246,221,194",
    statBg: "rgba(255,252,247,0.66)",
    statBorder: "rgba(42,34,64,0.16)",
    inkStat: true,
  },
  dusk: {
    label: "DUSK",
    bg: "linear-gradient(180deg, #241335 0%, #5e2450 32%, #b1402c 64%, #ec8a3c 100%)",
    routeColor: "#ffd98a",
    elevColor: "#ff6a3a",
    text: "#f8ead7",
    faint: "rgba(248,234,215,0.62)",
    lineAlpha: 0.4,
    heroW: 4.5,
    midW: 1.5,
    marker: "#ffd98a",
    scrim: "16,8,24",
    statBg: "rgba(26,10,22,0.4)",
    statBorder: "rgba(248,234,215,0.2)",
    inkStat: false,
  },
  midnight: {
    label: "MIDNIGHT",
    bg: "linear-gradient(180deg, #0a1230 0%, #142250 46%, #1d2f66 100%)",
    routeColor: "#82e3e0",
    elevColor: "#b89bff",
    text: "#e7edff",
    faint: "rgba(231,237,255,0.6)",
    lineAlpha: 0.42,
    heroW: 4.5,
    midW: 1.5,
    marker: "#82e3e0",
    scrim: "6,11,28",
    statBg: "rgba(6,11,28,0.5)",
    statBorder: "rgba(231,237,255,0.16)",
    inkStat: false,
  },
  alpine: {
    label: "ALPINE",
    bg: "linear-gradient(180deg, #dfeaf0 0%, #c3d7e2 52%, #e7ded2 100%)",
    routeColor: "#1f5a6b",
    elevColor: "#5a6470",
    text: "#16242c",
    faint: "rgba(22,36,44,0.5)",
    lineAlpha: 0.32,
    heroW: 4.5,
    midW: 1.4,
    marker: "#1f5a6b",
    scrim: "223,234,240",
    statBg: "rgba(255,255,255,0.66)",
    statBorder: "rgba(22,36,44,0.16)",
    inkStat: true,
  },
};

/** Layer count per density step — more layers read as a finer weave. */
export const STRATA_DENSITY_K: Record<StrataDensity, number> = {
  fine: 36,
  woven: 24,
  bold: 14,
};

/* --------------------- poetic wording (labels / blurbs) ------------------- */
// Surfaced in the story (and available to any future picker UI) so the moods and
// densities read as evocations rather than enum keys.

export const STRATA_MOOD_LABELS: Record<StrataMood, string> = {
  paper: "Paper",
  dawn: "Dawn",
  dusk: "Dusk",
  midnight: "Midnight",
  alpine: "Alpine",
};

export const STRATA_MOOD_BLURBS: Record<StrataMood, string> = {
  paper: "graphite on a folded map",
  dawn: "first light — rose into amber",
  dusk: "the sun going down in fire",
  midnight: "deep blue, lit from within",
  alpine: "cold haze over the range",
};

export const STRATA_DENSITY_LABELS: Record<StrataDensity, string> = {
  fine: "Fine",
  woven: "Woven",
  bold: "Bold",
};

export const STRATA_DENSITY_BLURBS: Record<StrataDensity, string> = {
  fine: "many gossamer layers",
  woven: "the balanced weave",
  bold: "a few bare ridges",
};

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

/** The profile that becomes the bottom ridge: elevation, then pace, then laps. */
function pickProfile(data: ActivityData): PickedProfile | null {
  const elev = data.elevationProfile;
  if (elev && elev.length > 1) {
    return {
      profile: elev,
      profileLabel: "ELEVATION",
      elevMax: Math.round(Math.max(...elev)),
    };
  }
  const pace = data.paceProfile;
  if (pace && pace.length > 1) {
    return { profile: pace, profileLabel: "PACE", elevMax: null };
  }
  const laps = data.lapPacesPer100m;
  if (laps && laps.length > 1) {
    return { profile: laps, profileLabel: "LAPS", elevMax: null };
  }
  return null;
}

/**
 * Resolve the two source curves the field morphs between. A single activity uses
 * its top-level route + profile; a multi-activity project (triathlon, brick)
 * keeps its geometry on the segments, so we concatenate the legs into one route
 * and one profile — the field then weaves the whole effort instead of rendering
 * empty. Returns `null` when there isn't enough geometry for a morph.
 */
export function resolveStrataSource(data: ActivityData): StrataSource | null {
  let routeCoords = data.routeCoordinates ?? [];
  let picked = pickProfile(data);

  if (isMultiActivity(data)) {
    if (routeCoords.length < 2) {
      routeCoords = segmentRoutes(data).flatMap((r) => r.coords);
    }
    if (!picked) {
      const seg = segmentProfiles(data);
      const profile = seg.profiles.flat();
      if (profile.length > 1) {
        picked = seg.useElevation
          ? {
              profile,
              profileLabel: "ELEVATION",
              elevMax: Math.round(Math.max(...profile)),
            }
          : { profile, profileLabel: "PACE", elevMax: null };
      }
    }
  }

  if (routeCoords.length < 2 || !picked) {
    return null;
  }
  return { routeCoords, ...picked };
}

/* ------------------------------ morph maths ------------------------------- */

/** Resample a 1-D series to exactly `n` points (linear interp by index). */
function resampleValues(arr: number[], n: number): number[] {
  const out: number[] = [];
  const len = arr.length;
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (len - 1);
    const i0 = Math.floor(t);
    const i1 = Math.min(len - 1, i0 + 1);
    const f = t - i0;
    out.push(arr[i0] * (1 - f) + arr[i1] * f);
  }
  return out;
}

/** Resample a point sequence to exactly `n` points (linear interp by index). */
function resamplePoints(pts: Coord[], n: number): Coord[] {
  const out: Coord[] = [];
  const len = pts.length;
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * (len - 1);
    const i0 = Math.floor(t);
    const i1 = Math.min(len - 1, i0 + 1);
    const f = t - i0;
    const a = pts[i0];
    const b = pts[i1];
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

/** Catmull-Rom → cubic-bezier path string, for silky curves through `pts`. */
export function smoothPath(pts: Coord[]): string {
  if (pts.length < 2) {
    return "";
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
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
}

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
export function buildStrata(opts: BuildStrataOptions): StrataGeometry {
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
    routePts = rc.map(
      (p): Coord => [
        px + ((p[0] - minX) / dx) * innerW,
        H * routeTop + ((p[1] - minY) / dy) * innerH,
      ]
    );
  } else {
    const sc = Math.min(innerW / dx, innerH / dy);
    const offX = px + (innerW - dx * sc) / 2;
    const offY = H * routeTop + (innerH - dy * sc) / 2;
    routePts = rc.map(
      (p): Coord => [offX + (p[0] - minX) * sc, offY + (p[1] - minY) * sc]
    );
  }

  // Profile fitted into the BOTTOM band — full width, profile shape.
  const minV = Math.min(...pr);
  const maxV = Math.max(...pr);
  const dv = maxV - minV || 1;
  const eTop = H * elevTop;
  const eH = H * elevBand;
  const elevPts: Coord[] = pr.map(
    (v, i): Coord => [
      px + (i / (N - 1)) * innerW,
      eTop + (1 - (v - minV) / dv) * eH,
    ]
  );

  const curves: StrataCurve[] = [];
  for (let k = 0; k <= K; k++) {
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
    curves.push({ t, pts });
  }
  return { curves, routePts, elevPts };
}
