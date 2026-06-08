// CAROUSEL · STRATA hero — the woven morph-field that spans the whole seamless
// strip: the route ridge along the top, the elevation ridge along the bottom,
// the abstraction woven between, so a swipe walks across the entire topography.
//
// Built from the SHARED pure geometry in `lib/strata` (resample · positional
// route→profile morph · Catmull-Rom smoothing) — NOT the single-card
// `components/themes/strata` component — so the two theme families stay
// decoupled (they only share `lib`). Colours come from the carousel token
// (route = accent, elevation = accent2).
//
// The field is `stretch`ed to span the panorama. Unlike a faithful route
// silhouette (which the carousel always keeps aspect-true and centred), the
// strata field is a deliberate abstraction whose whole identity is the
// continuous weave across the strip — so it fills the width by design.

import type { ActivityData } from "@/components/app/sample-data";
import { mixHex } from "@/lib/chart-helpers";
import { buildStrata, resolveStrataSource, smoothPath } from "@/lib/strata";

interface StrataCanvasProps {
  data: ActivityData;
  /** elevation ridge (bottom hero) colour */
  elevColor: string;
  h: number;
  /** base opacity of the woven in-between layers */
  lineAlpha?: number;
  /** route ridge (top hero) colour */
  routeColor: string;
  w: number;
}

export function StrataCanvas({
  data,
  w,
  h,
  routeColor,
  elevColor,
  lineAlpha = 0.4,
}: StrataCanvasProps) {
  const source = resolveStrataSource(data);
  if (!source) {
    return null;
  }
  const { curves } = buildStrata({
    routeCoords: source.routeCoords,
    profile: source.profile,
    W: w,
    H: h,
    K: 26,
    stretch: true,
  });
  if (curves.length < 2) {
    return null;
  }
  const hero0 = curves[0];
  const heroN = curves.at(-1);
  if (!heroN) {
    return null;
  }
  const heroW = 7;
  const haloW = heroW + 7;

  return (
    <svg
      aria-hidden="true"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        overflow: "visible",
      }}
      viewBox={`0 0 ${w} ${h}`}
    >
      <title>Strata field — route woven into the elevation profile</title>

      {/* Woven in-between layers, back to front. */}
      {curves.map((c, k) => {
        if (k === 0 || k === curves.length - 1) {
          return null;
        }
        const col = mixHex(routeColor, elevColor, c.t);
        const alpha = lineAlpha * (0.6 + 0.55 * Math.abs(2 * c.t - 1));
        return (
          <path
            d={smoothPath(c.pts)}
            fill="none"
            key={c.t}
            stroke={col}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={alpha}
            strokeWidth={2.2}
          />
        );
      })}

      {/* HERO — elevation profile (bottom), soft halo for legibility. */}
      <path
        d={smoothPath(heroN.pts)}
        fill="none"
        stroke={elevColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.22}
        strokeWidth={haloW}
      />
      <path
        d={smoothPath(heroN.pts)}
        fill="none"
        stroke={elevColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={heroW}
      />
      {/* HERO — the real route (top). */}
      <path
        d={smoothPath(hero0.pts)}
        fill="none"
        stroke={routeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.22}
        strokeWidth={haloW}
      />
      <path
        d={smoothPath(hero0.pts)}
        fill="none"
        stroke={routeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={heroW}
      />
    </svg>
  );
}
