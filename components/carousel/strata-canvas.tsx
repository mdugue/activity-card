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
import type { EffectiveStyle } from "@/lib/carousel/resolve";
import { mixHex } from "@/lib/chart-helpers";
import {
  buildStrata,
  resolveStrataSource,
  STRATA_DENSITY_K,
  STRATA_MOODS,
  type StrataConfig,
  smoothPath,
  strataDirectionArrow,
  strataPeakMarker,
} from "@/lib/strata";

interface StrataCanvasProps {
  data: ActivityData;
  /** number of woven in-between layers (the density lever) */
  densityK: number;
  /** elevation ridge (bottom hero) colour */
  elevColor: string;
  h: number;
  /** peak-label fill colour */
  ink: string;
  /** reveal the peak-height + direction markers */
  legend: boolean;
  /** base opacity of the woven in-between layers */
  lineAlpha?: number;
  /** firmer hero halos so the ridges read over a background photo */
  overPhoto?: boolean;
  /** route ridge (top hero) colour */
  routeColor: string;
  /** `r,g,b` tone for marker halos */
  scrim: string;
  w: number;
}

export function StrataCanvas({
  data,
  w,
  h,
  routeColor,
  elevColor,
  densityK,
  legend,
  ink,
  scrim,
  overPhoto = false,
  lineAlpha = 0.4,
}: StrataCanvasProps) {
  const source = resolveStrataSource(data);
  if (!source) {
    return null;
  }
  const { curves, routePts, elevPts } = buildStrata({
    routeCoords: source.routeCoords,
    profile: source.profile,
    W: w,
    H: h,
    K: densityK,
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
  const haloOpacity = overPhoto ? 0.36 : 0.22;

  // Markers, revealed by `legend` — sized for the wide panorama viewBox.
  const peak = legend ? strataPeakMarker(elevPts, source.elevMax) : null;
  const arrow = legend ? strataDirectionArrow(routePts, w, h, 52) : null;
  const peakHalfW = peak ? peak.label.length * 9.5 : 0;
  const peakLabelX = peak
    ? Math.max(20 + peakHalfW, Math.min(w - 20 - peakHalfW, peak.x))
    : 0;

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
        strokeOpacity={haloOpacity}
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
        strokeOpacity={haloOpacity}
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

      {/* Direction arrow beside the route — a clean line + chevron. */}
      {arrow ? (
        <g
          transform={`translate(${arrow.x} ${arrow.y}) rotate(${arrow.angle})`}
        >
          <g
            fill="none"
            stroke={`rgba(${scrim},0.5)`}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={11}
          >
            <path d="M-24 0 L13 0" />
            <path d="M0 -11 L15 0 L0 11" />
          </g>
          <g
            fill="none"
            stroke={routeColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={4.5}
          >
            <path d="M-24 0 L13 0" />
            <path d="M0 -11 L15 0 L0 11" />
          </g>
        </g>
      ) : null}

      {/* Peak height pinned beside the highest point of the elevation ridge. */}
      {peak ? (
        <g>
          <line
            stroke={elevColor}
            strokeLinecap="round"
            strokeWidth={3.5}
            x1={peak.x}
            x2={peak.x}
            y1={peak.y - 5}
            y2={peak.y - 26}
          />
          <text
            fill={ink}
            fontFamily="var(--font-mono), monospace"
            fontSize={32}
            fontWeight={600}
            letterSpacing={1}
            paintOrder="stroke"
            stroke={`rgba(${scrim},0.72)`}
            strokeWidth={6}
            textAnchor="middle"
            x={peakLabelX}
            y={peak.y - 38}
          >
            {peak.label}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

/**
 * The full STRATA carousel hero: the spanning field plus a mood-tinted vertical
 * scrim so the standard panels stay legible over the weave. Returns `null` for
 * any non-STRATA deck (so the renderer can drop it in unconditionally). `style`
 * is the mood-resolved deck style (route = accent, elevation = accent2).
 */
export function StrataHero({
  cfg,
  data,
  w,
  h,
  style,
  overPhoto = false,
}: {
  cfg: StrataConfig | null;
  data: ActivityData;
  h: number;
  /** firmer hero halos when the field rides over a background photo */
  overPhoto?: boolean;
  style: EffectiveStyle;
  w: number;
}) {
  if (!cfg) {
    return null;
  }
  const mood = STRATA_MOODS[cfg.mood];
  return (
    <>
      <div style={{ position: "absolute", inset: 0 }}>
        <StrataCanvas
          data={data}
          densityK={STRATA_DENSITY_K[cfg.density]}
          elevColor={style.accent2}
          h={h}
          ink={style.ink}
          legend={cfg.legend}
          overPhoto={overPhoto}
          routeColor={style.accent}
          scrim={mood.scrim}
          w={w}
        />
      </div>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, rgba(${mood.scrim},0.6) 0%, rgba(${mood.scrim},0.12) 24%, rgba(${mood.scrim},0) 46%, rgba(${mood.scrim},0.1) 66%, rgba(${mood.scrim},0.56) 100%)`,
        }}
      />
    </>
  );
}
