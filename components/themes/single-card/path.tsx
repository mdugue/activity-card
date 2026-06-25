// PATH — route silhouette is the hero, art-print energy.
// Type: Cormorant Garamond (display) + Manrope (body)
// Palette: warm off-white paper, deep ink, single rust accent

import { abstractLanes, accentShades, routePath } from "@/lib/chart-helpers";
import {
  formatDateUpper,
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";
import {
  isMultiActivity,
  type SegmentRoute,
  segmentRoutes,
} from "@/lib/multi-activity";
import { defineTheme, type ThemeProps } from "@/lib/theme-contract";
import { SafeArea, useFormat } from "../shared/format-context";
import { OverlayRoute } from "../shared/overlay-route";
import { PhotoBackdrop } from "../shared/photo-backdrop";

const INK = "#1a1714";
const DEFAULT_ACCENT = "#c45a2c";
const ROUTE_W = 900;
const ROUTE_H = 720;

const USES = [
  "athleteName",
  "elevation",
  "location",
  "pace",
  "route",
  "speed",
] as const;

export function ThemePath({
  data,
  photoUrl,
  imageTransform,
  colors,
}: ThemeProps<(typeof USES)[number]>) {
  const { width, height } = useFormat();
  const accent = colors?.primary ?? DEFAULT_ACCENT;
  const isPool = data.sport === "swim";
  const sport = data.sport;
  const multi = isMultiActivity(data);
  const routes = multi ? segmentRoutes(data) : [];

  let sportLabel = "A TRIATHLON";
  if (sport === "ride") {
    sportLabel = "A CYCLE";
  } else if (sport === "run") {
    sportLabel = "A RUN";
  } else if (sport === "swim") {
    sportLabel = "A SWIM";
  }

  // Cells whose datum is missing (or toggled off — `applyVisibility` strips the
  // field) are omitted entirely rather than rendered as a dashed placeholder.
  const has = (n: number | undefined): n is number =>
    n !== undefined && Number.isFinite(n);
  const statTrio: [string, string][] = [];
  if (sport === "ride") {
    statTrio.push(["DISTANCE", `${data.distanceKm.toFixed(1)} km`]);
    if (has(data.elevationGainM)) {
      statTrio.push(["ELEVATION", `${formatNumber(data.elevationGainM)} m`]);
    }
    if (has(data.avgSpeedKmh)) {
      statTrio.push(["AVG SPEED", `${formatNumber(data.avgSpeedKmh, 1)} km/h`]);
    }
  } else if (sport === "run") {
    statTrio.push(
      ["DISTANCE", `${data.distanceKm.toFixed(1)} km`],
      ["DURATION", formatDuration(data.durationSec)]
    );
    if (has(data.avgPaceMinPerKm)) {
      statTrio.push(["AVG PACE", `${formatPaceMin(data.avgPaceMinPerKm)} /km`]);
    }
  } else if (sport === "swim") {
    statTrio.push(
      ["DISTANCE", `${(data.distanceKm * 1000).toFixed(0)} m`],
      ["DURATION", formatDuration(data.durationSec)]
    );
    if (has(data.avgPacePer100m)) {
      statTrio.push(["PACE", `${formatPaceSec(data.avgPacePer100m)} /100m`]);
    }
  } else {
    statTrio.push(
      ["DISTANCE", `${data.distanceKm.toFixed(1)} km`],
      ["DURATION", formatDuration(data.durationSec)]
    );
    if (has(data.elevationGainM)) {
      statTrio.push(["ELEVATION", `${formatNumber(data.elevationGainM)} m`]);
    }
  }

  return (
    <div
      style={{
        width,
        height,
        background: "#ffffff",
        color: "#1a1714",
        fontFamily: "var(--font-manrope), sans-serif",
        position: "relative",
        overflow: "hidden",
        // Named query container (`card`): big/fixed type sizes to the card box —
        // narrow in a landscape column (cqi), short in a square card (cqb) — and
        // the region grid's `@container card` width breakpoint keys on it to go
        // 3-up at x-landscape. The name skips the nested per-stat containers.
        containerType: "size",
        containerName: "card",
      }}
    >
      {photoUrl ? (
        <PhotoBackdrop
          imageTransform={imageTransform}
          photoUrl={photoUrl}
          treatment="path"
        />
      ) : null}
      {/* Content sits above the backdrop layer, inset by the safe area. */}
      <SafeArea
        pad={{ top: 90, right: 90, bottom: 80, left: 90 }}
        style={{ flex: 1, zIndex: 1 }}
      >
        {/* One self-reflowing grid, ONE markup, holds the three regions —
            [meta+title], [route hero], [stats]. They STACK 1-up at feed / square /
            9:16 (today's master) and sit 3-up side-by-side at x-landscape, with
            the route staying centred in the MIDDLE region either way. The column
            count is an explicit container breakpoint —
            `@min-[1400px]/card:grid-cols-3` = "go 3-up once the card is wider
            than 1400px" — which only the 1600px landscape canvas crosses; every
            other format is 1080px wide and stays 1-up (square's `clamp` type
            shrinks to fit). States the intent directly, no auto-fit MIN to tune. */}
        <div className="grid min-h-0 flex-1 auto-rows-fr @min-[1400px]/card:grid-cols-3 grid-cols-1 items-stretch gap-10">
          {/* Region 1 — meta band + title */}
          <div
            style={{
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                letterSpacing: "0.28em",
                fontSize: 24,
                fontWeight: 600,
                gap: 16,
              }}
            >
              <span>{sportLabel}</span>
              <span style={{ opacity: 0.55 }}>
                {formatDateUpper(data.date)}
              </span>
            </div>
            <div
              style={{
                height: 1,
                background: "#1a1714",
                opacity: 0.35,
                margin: "24px 0 0 0",
              }}
            />
            <div style={{ marginTop: 38 }}>
              <h1
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontWeight: 400,
                  fontStyle: "italic",
                  // Fluid headline: shrinks with the card width (cqi → narrow
                  // landscape column) or height (cqb → short square card); caps
                  // at the original 76px so the feed master is unchanged.
                  fontSize: "clamp(40px, min(8cqi, 9cqb), 76px)",
                  lineHeight: 0.95,
                  letterSpacing: "-0.01em",
                  margin: 0,
                  textWrap: "pretty",
                  maxWidth: "90%",
                }}
              >
                {data.title}
              </h1>
              {data.location ? (
                <div
                  style={{
                    marginTop: 18,
                    fontSize: 26,
                    letterSpacing: "0.18em",
                    opacity: 0.62,
                  }}
                >
                  {data.location.toUpperCase()}
                </div>
              ) : null}
            </div>
          </div>

          {/* Region 2 — route hero, centred in its region. The grid row
              (gridAutoRows: minmax(0,1fr)) gives it height in both the 1-col
              stack (a full middle third) and the 3-col landscape row (the full
              content height). No aspectRatio here on purpose: an aspect ratio
              would impose a min-width from the stretched row height (730×9/7),
              blowing the centre column out to ~939px and crushing its
              neighbours. minHeight keeps it from collapsing in edge cases. */}
          <div
            style={{
              minWidth: 0,
              minHeight: 220,
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              aria-hidden="true"
              style={{ width: "100%", height: "100%", minHeight: 0 }}
              viewBox="0 0 900 720"
            >
              <title>Route silhouette</title>
              <defs>
                <radialGradient cx="50%" cy="50%" id="path-grain" r="60%">
                  <stop offset="0%" stopColor="#c45a2c" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#c45a2c" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect
                fill="url(#path-grain)"
                height="720"
                width="900"
                x="0"
                y="0"
              />
              <RouteHero
                accent={accent}
                coords={data.routeCoordinates}
                isPool={isPool}
                multi={multi}
                routes={routes}
              />
            </svg>
          </div>

          {/* Region 3 — stats, quiet supporting characters */}
          <div
            style={{
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                height: 1,
                background: "#1a1714",
                opacity: 0.35,
                marginBottom: 22,
              }}
            />
            {/* Always three stat columns (not a reflow). `grid-cols-3` is the
                shrink-safe `repeat(3, minmax(0, 1fr))`, so a narrow 3-up
                landscape stats column compresses instead of overflowing. */}
            <div className="grid grid-cols-3 gap-6">
              {statTrio.map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    minWidth: 0,
                    // Inline-size container so the label sizes to THIS stat
                    // cell's width (narrow in a 3-up landscape stats column),
                    // while the value's cqb still resolves to the card height.
                    containerType: "inline-size",
                  }}
                >
                  <div
                    style={{
                      // Fluid label: stays 24px on roomy cards (feed cell ≈300px:
                      // 11cqi caps at 24) but shrinks enough in a narrow landscape
                      // cell (≈149px → ~16px) that 9-char labels like "ELEVATION"
                      // and "AVG SPEED" keep a gap instead of touching.
                      fontSize: "clamp(13px, 11cqi, 24px)",
                      letterSpacing: "0.18em",
                      opacity: 0.55,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {k}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-cormorant), serif",
                      // Fluid stat value: 21cqi reads THIS cell's width (feed cell
                      // ≈284px → 60px, master unchanged), shrinking in a narrow
                      // landscape cell; cqb caps it against a short card. Floor 28
                      // keeps it legible; wrapping handles the tightest cells.
                      fontSize: "clamp(28px, min(21cqi, 7cqb), 60px)",
                      fontWeight: 400,
                      marginTop: 10,
                      lineHeight: 1.05,
                    }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 32,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 24,
                letterSpacing: "0.2em",
                opacity: 0.55,
                fontWeight: 600,
                gap: 16,
              }}
            >
              <span>№ 01 — EFFORT</span>
              <span>
                {data.athleteName ? `— ${data.athleteName.toUpperCase()}` : ""}
              </span>
            </div>
          </div>
        </div>
      </SafeArea>
    </div>
  );
}

// The route hero: pool lanes for a swim, every leg overlaid for a project,
// otherwise a single silhouette.
function RouteHero({
  accent,
  isPool,
  multi,
  routes,
  coords,
}: {
  accent: string;
  coords?: [number, number][];
  isPool: boolean;
  multi: boolean;
  routes: SegmentRoute[];
}) {
  if (isPool) {
    return <PoolLanes accent={accent} />;
  }
  if (multi) {
    return <MultiPathRoute accent={accent} routes={routes} />;
  }
  return <PathRoute accent={accent} coords={coords} />;
}

function PoolLanes({ accent }: { accent: string }) {
  return (
    <g>
      {abstractLanes(ROUTE_W, ROUTE_H, 6, 60).map((l, i) => (
        <g key={`path-lane-${i}-${l.y}`}>
          <line
            stroke={INK}
            strokeDasharray="4 14"
            strokeOpacity={0.15}
            strokeWidth={1}
            x1={l.x}
            x2={l.x + l.w}
            y1={l.y + l.h / 2}
            y2={l.y + l.h / 2}
          />
          <path
            d={`M${l.x} ${l.y + l.h / 2} Q${l.x + l.w / 4} ${l.y + l.h / 2 - 18}, ${l.x + l.w / 2} ${l.y + l.h / 2} T${l.x + l.w} ${l.y + l.h / 2}`}
            fill="none"
            stroke={accent}
            strokeOpacity={0.55 - i * 0.05}
            strokeWidth={2.5}
          />
        </g>
      ))}
    </g>
  );
}

function PathRoute({
  accent,
  coords,
}: {
  accent: string;
  coords?: [number, number][];
}) {
  if (!coords || coords.length === 0) {
    return null;
  }
  const xs = coords.map((c) => c[0]);
  const ys = coords.map((c) => c[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  const innerW = ROUTE_W - 120;
  const innerH = ROUTE_H - 120;
  const scale = Math.min(innerW / dx, innerH / dy);
  const offX = 60 + (innerW - dx * scale) / 2;
  const offY = 60 + (innerH - dy * scale) / 2;
  const start: [number, number] = [
    offX + (coords[0][0] - minX) * scale,
    offY + (coords[0][1] - minY) * scale,
  ];
  const last = coords[coords.length - 1];
  const end: [number, number] = [
    offX + (last[0] - minX) * scale,
    offY + (last[1] - minY) * scale,
  ];
  const d = routePath(coords, ROUTE_W, ROUTE_H, 60);
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={INK}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.08}
        strokeWidth={18}
      />
      <path
        d={d}
        fill="none"
        stroke={INK}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={4}
      />
      <circle cx={start[0]} cy={start[1]} fill={accent} r={9} />
      <circle cx={end[0]} cy={end[1]} fill={INK} r={9} />
    </g>
  );
}

// A multi-activity project (triathlon, brick, …): every leg's route drawn in
// the SAME coordinate system — one shared bbox + uniform scale — so the legs
// keep their true positions relative to one another, each tinted a different
// shade of the accent so they read apart without leaving the palette. Delegates
// the projection + per-leg draw to the shared OverlayRoute.
function MultiPathRoute({
  accent,
  routes,
}: {
  accent: string;
  routes: SegmentRoute[];
}) {
  if (routes.length === 0) {
    return null;
  }
  return (
    <OverlayRoute
      colors={accentShades(accent, routes.length)}
      h={ROUTE_H}
      // soft ink halo keeps every leg legible over a photo backdrop
      halo={{ color: "rgba(26,23,20,0.07)", width: 16 }}
      markerRadius={9}
      markers
      pad={60}
      routes={routes.map((r) => r.coords)}
      strokeWidth={4.5}
      w={ROUTE_W}
    />
  );
}

export const pathTheme = defineTheme({
  id: "path",
  label: "PATH",
  tagline: "route is the hero",
  uses: USES,
  colors: { default: { primary: DEFAULT_ACCENT }, userAdjustable: true },
  photo: { defaultOn: true },
  Component: ThemePath,
});
