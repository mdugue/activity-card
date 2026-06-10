// MINIMAL — the photo is everything. Full-bleed background image, the route
// traced over it, and a quiet elevation curve + bar chart grounded at the
// bottom. No text, no stats — a pure, posterish frame the user can reposition.
//
// When no photo is loaded we fall back to a deep neutral gradient so the route
// and elevation still read while the user is choosing an image.

import {
  routePath,
  sequencePaths,
  sequenceProfiles,
  whiteRamp,
} from "@/lib/chart-helpers";
import {
  isMultiActivity,
  type SegmentRoute,
  segmentProfiles,
  segmentRoutes,
} from "@/lib/multi-activity";
import { defineTheme, type ThemeProps } from "@/lib/theme-contract";
import { OverlayRoute } from "../shared/overlay-route";
import { PhotoLayer } from "../shared/photo-layer";

const USES = ["elevationViz", "pace", "route"] as const;

type ThemeMinimalProps = ThemeProps<(typeof USES)[number]>;

const ROUTE_W = 720;
const ROUTE_H = 720;

// Number of bars in the elevation strip. Sampled down from the raw profile.
const BAR_COUNT = 56;

/** Bucket a profile into `count` normalised heights in [0, 1]. */
function sampleBars(profile: number[] | undefined, count: number): number[] {
  if (!profile || profile.length === 0) {
    return [];
  }
  const min = Math.min(...profile);
  const max = Math.max(...profile);
  const range = max - min || 1;
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const start = Math.floor((i / count) * profile.length);
    const end = Math.max(
      start + 1,
      Math.floor(((i + 1) / count) * profile.length)
    );
    let sum = 0;
    let n = 0;
    for (let j = start; j < end && j < profile.length; j++) {
      sum += profile[j];
      n++;
    }
    const avg = n > 0 ? sum / n : profile[start];
    out.push((avg - min) / range);
  }
  return out;
}

/** Smooth area + line path for the elevation curve across a w×h box. */
function curvePaths(
  profile: number[] | undefined,
  w: number,
  h: number
): { area: string; line: string } | null {
  if (!profile || profile.length < 2) {
    return null;
  }
  const min = Math.min(...profile);
  const max = Math.max(...profile);
  const range = max - min || 1;
  const step = w / (profile.length - 1);
  const pts = profile.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return [x, y] as const;
  });
  const line = pts
    .map(
      (p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`
    )
    .join(" ");
  const area = `${line} L${w.toFixed(1)} ${h.toFixed(1)} L0 ${h.toFixed(1)} Z`;
  return { area, line };
}

function RouteOverlay({ coords }: { coords?: [number, number][] }) {
  if (!coords || coords.length < 2) {
    return null;
  }
  const d = routePath(coords, ROUTE_W, ROUTE_H, 40);
  // Project start/end so we can dot them.
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  const inner = ROUTE_W - 80;
  const innerH = ROUTE_H - 80;
  const scale = Math.min(inner / dx, innerH / dy);
  const offX = 40 + (inner - dx * scale) / 2;
  const offY = 40 + (innerH - dy * scale) / 2;
  const project = (c: [number, number]): [number, number] => [
    offX + (c[0] - minX) * scale,
    offY + (c[1] - minY) * scale,
  ];
  const start = project(coords[0]);
  const end = project(coords[coords.length - 1]);

  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "11%",
        left: "13%",
        width: "74%",
        height: "52%",
        filter: "drop-shadow(0 2px 16px rgba(0,0,0,0.55))",
      }}
      viewBox={`0 0 ${ROUTE_W} ${ROUTE_H}`}
    >
      <title>Route</title>
      {/* Soft dark halo so the line reads on bright photos. */}
      <path
        d={d}
        fill="none"
        stroke="rgba(0,0,0,0.35)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={12}
      />
      <path
        d={d}
        fill="none"
        stroke="#ffffff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={5}
      />
      <circle cx={start[0]} cy={start[1]} fill="#ffffff" r={11} />
      <circle
        cx={end[0]}
        cy={end[1]}
        fill="none"
        r={10}
        stroke="#ffffff"
        strokeWidth={4}
      />
    </svg>
  );
}

// Every leg of a project traced in ONE shared coordinate system, white at a
// gentle opacity ramp with a soft halo + a start dot per leg.
function MultiRouteOverlay({ routes }: { routes: SegmentRoute[] }) {
  if (routes.length < 1) {
    return null;
  }
  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        top: "11%",
        left: "13%",
        width: "74%",
        height: "52%",
        filter: "drop-shadow(0 2px 16px rgba(0,0,0,0.55))",
      }}
      viewBox={`0 0 ${ROUTE_W} ${ROUTE_H}`}
    >
      <title>Routes</title>
      <OverlayRoute
        colors={whiteRamp(routes.length)}
        h={ROUTE_H}
        halo={{ color: "rgba(0,0,0,0.35)", width: 12 }}
        markerRadius={11}
        markers
        pad={40}
        routes={routes.map((r) => r.coords)}
        strokeWidth={5}
        w={ROUTE_W}
      />
    </svg>
  );
}

function renderRoute(
  multi: boolean,
  routes: SegmentRoute[],
  coords: [number, number][] | undefined
) {
  if (multi) {
    return <MultiRouteOverlay routes={routes} />;
  }
  return <RouteOverlay coords={coords} />;
}

export function ThemeMinimal({
  data,
  photoUrl,
  imageTransform,
}: ThemeMinimalProps) {
  const isPool = data.sport === "swim";
  const multi = isMultiActivity(data);
  const routes = multi ? segmentRoutes(data) : [];
  const segProf = multi ? segmentProfiles(data) : null;
  const curves =
    segProf && segProf.profiles.length > 0
      ? sequenceProfiles(
          segProf.profiles,
          segProf.distances,
          segProf.useElevation
        )
      : [];

  // Single activity: full-width curve + bar texture. Project: the legs laid out
  // side by side (the bars assume one profile, so they sit out for a project).
  const singleProfile = data.elevationProfile ?? data.paceProfile;
  const bars = multi ? [] : sampleBars(singleProfile, BAR_COUNT);
  const curve = multi ? null : curvePaths(singleProfile, 1000, 150);
  const overlay = multi ? sequencePaths(curves, 1000, 150) : [];
  const overlayShades = whiteRamp(overlay.length);
  const hasStrip = multi ? overlay.length > 0 : bars.length > 0;

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        position: "relative",
        overflow: "hidden",
        background:
          "radial-gradient(120% 90% at 50% 18%, #2a3340 0%, #161b22 55%, #0c0f14 100%)",
        fontFamily: "var(--font-manrope), sans-serif",
      }}
    >
      {photoUrl ? (
        <PhotoLayer imageTransform={imageTransform} photoUrl={photoUrl} />
      ) : null}

      {/* Top + bottom scrims: lift the route off bright skies and ground the
          elevation strip. Kept gentle so the photo stays the hero. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 56%, rgba(0,0,0,0.62) 100%)",
        }}
      />

      {isPool ? null : renderRoute(multi, routes, data.routeCoordinates)}

      {/* Elevation strip — quiet, glued to the bottom edge. */}
      {hasStrip ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 300,
          }}
        >
          {/* Bars */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 70,
              right: 70,
              bottom: 70,
              height: 150,
              display: "flex",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            {bars.map((hgt, i) => (
              <div
                key={`bar-${i}-${hgt.toFixed(3)}`}
                style={{
                  flex: 1,
                  height: `${Math.max(4, hgt * 100)}%`,
                  background: "rgba(255,255,255,0.22)",
                  borderRadius: 1,
                }}
              />
            ))}
          </div>

          {/* Curve(s) over the bars — one for a single activity, every leg laid
              out side by side (shared scale, distance-weighted width) for a
              project. */}
          {curve || overlay.length > 0 ? (
            <svg
              aria-hidden="true"
              preserveAspectRatio="none"
              style={{
                position: "absolute",
                left: 70,
                right: 70,
                bottom: 70,
                width: "calc(100% - 140px)",
                height: 150,
              }}
              viewBox="0 0 1000 150"
            >
              <title>Elevation profile</title>
              <defs>
                <linearGradient id="min-elev-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {curve ? (
                <>
                  <path d={curve.area} fill="url(#min-elev-fill)" />
                  <path
                    d={curve.line}
                    fill="none"
                    stroke="#ffffff"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeOpacity={0.92}
                    strokeWidth={2.5}
                  />
                </>
              ) : null}
              {overlay.map((op, i) => (
                <g key={`curve-${i}-${op.endX.toFixed(0)}`}>
                  <path d={op.area} fill="url(#min-elev-fill)" />
                  <path
                    d={op.line}
                    fill="none"
                    stroke={overlayShades[i]}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                  />
                </g>
              ))}
            </svg>
          ) : null}

          {/* Baseline rule */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: 70,
              right: 70,
              bottom: 70,
              height: 1,
              background: "rgba(255,255,255,0.28)",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export const minimalTheme = defineTheme({
  id: "minimal",
  label: "MINIMAL",
  tagline: "photo, pure",
  uses: USES,
  colors: { default: { primary: "#ffffff" }, userAdjustable: false },
  photo: { defaultOn: true },
  Component: ThemeMinimal,
});
