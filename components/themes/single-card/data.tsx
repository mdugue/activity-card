// DATA — maximalist, info-dense, dashboard-as-poster.
// Type: Archivo Narrow (display) + JetBrains Mono (data labels)
// Light cream bg with a single graphite ink + signal red
// IG-safe: all text >= 24px on the 1080-wide canvas.

import type { ReactNode } from "react";
import type { Coord } from "@/lib/activity";
import {
  abstractLanes,
  accentShades,
  elevationPath,
  pacePath,
  routePath,
  sequencePaths,
  sequenceProfiles,
} from "@/lib/chart-helpers";
import {
  formatClock,
  formatDateUpper,
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";
import {
  isMultiActivity,
  type SegmentRoute,
  segmentProfiles,
  segmentRoutes,
} from "@/lib/multi-activity";
import { defineTheme, type ThemeProps } from "@/lib/theme-contract";
import { OverlayRoute } from "../shared/overlay-route";
import { PhotoUnderlay } from "../shared/photo-underlay";

const USES = [
  "athleteName",
  "cadence",
  "elevation",
  "elevationViz",
  "heartRate",
  "location",
  "pace",
  "power",
  "route",
  "speed",
  "splits",
] as const;

const INK = "#0e0e0e";
const DEFAULT_ACCENT = "#d23f1d";
const BG = "#ffffff";
const PANEL = "#ffffff";
const GRID = "rgba(14, 14, 14, 0.1)";

interface CellProps {
  children?: ReactNode;
  dense?: boolean;
  label: string;
  span?: number;
  unit?: string;
  value?: string | number;
}

function Cell({ children, dense, label, span = 1, unit, value }: CellProps) {
  return (
    <div
      style={{
        gridColumn: `span ${span}`,
        border: `1.5px solid ${INK}`,
        padding: dense ? "20px 22px" : "24px 26px",
        background: PANEL,
        minHeight: 110,
        position: "relative",
      }}
    >
      <div
        style={{
          fontSize: 24,
          letterSpacing: "0.18em",
          opacity: 0.7,
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      {value !== undefined && (
        <div
          style={{
            marginTop: 10,
            fontFamily: "var(--font-archivo-narrow), sans-serif",
            fontWeight: 700,
            fontSize: 64,
            lineHeight: 1,
          }}
        >
          {value}
          {unit && (
            <span
              style={{
                fontSize: 26,
                opacity: 0.6,
                marginLeft: 8,
                fontFamily: "var(--font-mono), monospace",
              }}
            >
              {unit}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

const DEFAULT_ZONES = [
  { zone: "EASY", pct: 55 },
  { zone: "STDY", pct: 30 },
  { zone: "HARD", pct: 15 },
];

// Route glyph: pool lanes for a swim, every leg overlaid (accent shades) for a
// project, otherwise the single ink silhouette.
function DataRoute({
  accent,
  sport,
  multi,
  routes,
  coords,
}: {
  accent: string;
  coords?: Coord[];
  multi: boolean;
  routes: SegmentRoute[];
  sport: string;
}) {
  if (sport === "swim") {
    return (
      <g>
        {abstractLanes(460, 200, 5, 14).map((l, i) => (
          <path
            d={`M${l.x} ${l.y + l.h / 2} Q${l.x + l.w / 4} ${l.y + l.h / 2 - 10}, ${l.x + l.w / 2} ${l.y + l.h / 2} T${l.x + l.w} ${l.y + l.h / 2}`}
            fill="none"
            key={`lane-${i}`}
            opacity={0.75}
            stroke={accent}
            strokeWidth={2}
          />
        ))}
      </g>
    );
  }
  if (multi) {
    return (
      <OverlayRoute
        colors={accentShades(accent, routes.length)}
        h={200}
        pad={14}
        routes={routes.map((r) => r.coords)}
        strokeWidth={2.2}
        w={460}
      />
    );
  }
  return (
    <path
      d={routePath(coords, 460, 200, 14)}
      fill="none"
      stroke={INK}
      strokeLinejoin="round"
      strokeWidth={2.2}
    />
  );
}

export function ThemeData({
  data,
  photoUrl,
  imageTransform,
  colors,
}: ThemeProps<(typeof USES)[number]>) {
  const accent = colors?.primary ?? DEFAULT_ACCENT;
  const sport = data.sport;
  const multi = isMultiActivity(data);
  const routes = multi ? segmentRoutes(data) : [];
  const segProf = multi ? segmentProfiles(data) : null;
  const elevCurves =
    segProf && segProf.profiles.length > 0
      ? sequenceProfiles(
          segProf.profiles,
          segProf.distances,
          segProf.useElevation
        )
      : [];
  const elevShades = accentShades(accent, elevCurves.length);

  let cells: ReactNode = null;
  if (sport === "ride") {
    cells = (
      <>
        <Cell label="Distance" unit="km" value={data.distanceKm.toFixed(1)} />
        <Cell label="Time" value={formatDuration(data.durationSec)} />
        <Cell
          label="Elevation"
          unit="m"
          value={formatNumber(data.elevationGainM)}
        />
        <Cell
          label="Avg"
          unit="km/h"
          value={formatNumber(data.avgSpeedKmh, 1)}
        />
        <Cell
          label="Norm Power"
          unit="W"
          value={formatNumber(data.normalizedPowerW)}
        />
        <Cell label="VAM" unit="m/h" value={formatNumber(data.vamMph)} />
        <Cell
          label="Max Speed"
          unit="km/h"
          value={formatNumber(data.maxSpeedKmh, 1)}
        />
        <Cell
          label="Avg HR"
          unit="bpm"
          value={formatNumber(data.avgHeartRate)}
        />
        <Cell
          label="Cadence"
          unit="rpm"
          value={formatNumber(data.avgCadence)}
        />
      </>
    );
  } else if (sport === "run") {
    cells = (
      <>
        <Cell label="Distance" unit="km" value={data.distanceKm.toFixed(1)} />
        <Cell label="Time" value={formatDuration(data.durationSec)} />
        <Cell
          label="Pace"
          unit="/km"
          value={formatPaceMin(data.avgPaceMinPerKm)}
        />
        <Cell
          label="Elevation"
          unit="m"
          value={formatNumber(data.elevationGainM)}
        />
        <Cell
          label="Avg HR"
          unit="bpm"
          value={formatNumber(data.avgHeartRate)}
        />
        <Cell
          label="Cadence"
          unit="spm"
          value={formatNumber(data.avgCadence)}
        />
      </>
    );
  } else if (sport === "swim") {
    cells = (
      <>
        <Cell
          label="Distance"
          unit="m"
          value={(data.distanceKm * 1000).toFixed(0)}
        />
        <Cell label="Time" value={formatDuration(data.durationSec)} />
        <Cell label="/100 m" value={formatPaceSec(data.avgPacePer100m)} />
        <Cell label="SWOLF" value={formatNumber(data.swolf)} />
        <Cell label="Strokes/L" value={formatNumber(data.strokeCountAvg)} />
        <Cell
          label="Avg HR"
          unit="bpm"
          value={formatNumber(data.avgHeartRate)}
        />
      </>
    );
  }

  // Splits: show fewer, bigger.
  const splitSample = (() => {
    const all = data.splits || [];
    if (all.length === 0) {
      return [];
    }
    if (all.length <= 6) {
      return all;
    }
    const step = Math.floor(all.length / 6);
    return Array.from(
      { length: 6 },
      (_, i) => all[Math.min(i * step, all.length - 1)]
    );
  })();

  let chartLabel = "ELEVATION (m)";
  if (multi) {
    chartLabel = segProf?.useElevation ? "ELEVATION (m)" : "PACE (s/km)";
  } else if (sport === "run" && data.paceProfile) {
    chartLabel = "PACE (s/km)";
  } else if (sport === "swim") {
    chartLabel = "LAP PACE (s/100m)";
  }

  let zonesLabel = "EFFORT MIX";
  if (sport === "ride") {
    zonesLabel = "POWER ZONES";
  } else if (sport === "run") {
    zonesLabel = "HR ZONES";
  }

  let zones = DEFAULT_ZONES;
  if (sport === "ride" && data.powerZones) {
    zones = data.powerZones;
  } else if (sport === "run" && data.hrZones) {
    zones = data.hrZones;
  }

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        background: BG,
        color: INK,
        fontFamily: "var(--font-mono), monospace",
        padding: "60px 56px 52px 56px",
        boxSizing: "border-box",
        position: "relative",
        // Stacking context so the z-index:-1 photo underlay paints above the
        // solid background (not behind it) and below the dense content.
        isolation: "isolate",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {photoUrl ? (
        <PhotoUnderlay imageTransform={imageTransform} photoUrl={photoUrl} />
      ) : null}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderBottom: `3px solid ${INK}`,
          paddingBottom: 20,
          marginBottom: 22,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ fontSize: 24, letterSpacing: "0.3em", fontWeight: 600 }}
          >
            EFFORT · {sport.toUpperCase()}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-archivo-narrow), sans-serif",
              fontWeight: 700,
              fontSize: 84,
              lineHeight: 0.95,
              letterSpacing: "-0.01em",
              margin: "14px 0 0 0",
              textTransform: "uppercase",
              textWrap: "pretty",
            }}
          >
            {data.title}
          </h1>
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: 22,
            letterSpacing: "0.16em",
            lineHeight: 1.45,
            fontWeight: 600,
            flex: "0 0 auto",
            marginLeft: 24,
          }}
        >
          <div>{formatDateUpper(data.date)}</div>
          <div style={{ opacity: 0.7 }}>
            {data.location.split(",")[0].toUpperCase()}
          </div>
          {data.athleteName && (
            <div style={{ marginTop: 8 }}>
              ATH · {data.athleteName.toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            border: `1.5px solid ${INK}`,
            padding: 22,
            background: PANEL,
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 24,
              letterSpacing: "0.18em",
              opacity: 0.7,
              fontWeight: 600,
            }}
          >
            ROUTE
          </div>
          <svg
            aria-hidden="true"
            style={{ width: "100%", height: 180, marginTop: 8 }}
            viewBox="0 0 460 200"
          >
            <title>Route</title>
            {Array.from({ length: 10 }, (_, i) => (
              <line
                key={`v-${i}`}
                stroke={GRID}
                strokeWidth={0.5}
                x1={i * 46}
                x2={i * 46}
                y1={0}
                y2={200}
              />
            ))}
            {Array.from({ length: 5 }, (_, i) => (
              <line
                key={`h-${i}`}
                stroke={GRID}
                strokeWidth={0.5}
                x1={0}
                x2={460}
                y1={i * 50}
                y2={i * 50}
              />
            ))}
            <DataRoute
              accent={accent}
              coords={data.routeCoordinates}
              multi={multi}
              routes={routes}
              sport={sport}
            />
          </svg>
        </div>
        <div
          style={{
            border: `1.5px solid ${INK}`,
            padding: 22,
            background: PANEL,
          }}
        >
          <div
            style={{
              fontSize: 24,
              letterSpacing: "0.18em",
              opacity: 0.7,
              fontWeight: 600,
            }}
          >
            {chartLabel}
          </div>
          <svg
            aria-hidden="true"
            style={{ width: "100%", height: 180, marginTop: 8 }}
            viewBox="0 0 460 200"
          >
            <title>{chartLabel}</title>
            {Array.from({ length: 5 }, (_, i) => (
              <line
                key={`h-${i}`}
                stroke={GRID}
                strokeWidth={0.5}
                x1={0}
                x2={460}
                y1={i * 50}
                y2={i * 50}
              />
            ))}
            {multi
              ? sequencePaths(elevCurves, 460, 200).map((op, i) => {
                  const shade = elevShades[i];
                  return (
                    <g key={`elev-${i}-${op.endX.toFixed(0)}`}>
                      <path d={op.area} fill={shade} fillOpacity={0.18} />
                      <path
                        d={op.line}
                        fill="none"
                        stroke={shade}
                        strokeLinejoin="round"
                        strokeWidth={2.2}
                      />
                    </g>
                  );
                })
              : null}
            {!multi && sport === "run" && data.paceProfile && (
              <path
                d={pacePath(data.paceProfile, 460, 200, 8, true)}
                fill={accent}
                fillOpacity={0.22}
                stroke={accent}
                strokeWidth={2.2}
              />
            )}
            {!multi &&
              sport === "swim" &&
              (() => {
                const bars = data.lapPacesPer100m || [];
                if (bars.length === 0) {
                  return null;
                }
                const max = Math.max(...bars);
                const min = Math.min(...bars);
                const dv = max - min || 1;
                const w = 440 / bars.length;
                return bars.map((v, i) => {
                  const h = 30 + ((v - min) / dv) * 150;
                  return (
                    <rect
                      fill={accent}
                      height={h}
                      key={`bar-${i}-${v}`}
                      opacity={0.6 + ((v - min) / dv) * 0.4}
                      width={w - 2}
                      x={10 + i * w}
                      y={190 - h}
                    />
                  );
                });
              })()}
            {!multi &&
              sport !== "run" &&
              sport !== "swim" &&
              data.elevationProfile && (
                <path
                  d={elevationPath(data.elevationProfile, 460, 200, 8, true)}
                  fill={INK}
                  fillOpacity={0.85}
                />
              )}
            {!multi &&
              sport === "run" &&
              !data.paceProfile &&
              data.elevationProfile && (
                <path
                  d={elevationPath(data.elevationProfile, 460, 200, 8, true)}
                  fill={INK}
                  fillOpacity={0.85}
                />
              )}
          </svg>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          marginBottom: 14,
        }}
      >
        {cells}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.5fr",
          gap: 14,
          flex: 1,
          minHeight: 0,
        }}
      >
        <div
          style={{
            border: `1.5px solid ${INK}`,
            padding: 22,
            background: PANEL,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 24,
              letterSpacing: "0.18em",
              opacity: 0.7,
              fontWeight: 600,
            }}
          >
            {zonesLabel}
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              marginTop: 22,
              paddingBottom: 6,
            }}
          >
            {zones.map((z, i) => (
              <div
                key={`zone-${z.zone}-${i}`}
                style={{
                  flex: 1,
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  minHeight: 0,
                }}
              >
                <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
                  {z.pct}%
                </div>
                <div
                  style={{
                    background: i % 2 === 0 ? INK : accent,
                    height: z.pct * 3.2,
                    width: "100%",
                    minHeight: 6,
                  }}
                />
                <div
                  style={{
                    fontSize: 20,
                    marginTop: 8,
                    letterSpacing: "0.1em",
                    fontWeight: 700,
                  }}
                >
                  {z.zone}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            border: `1.5px solid ${INK}`,
            padding: 22,
            background: PANEL,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 24,
              letterSpacing: "0.18em",
              opacity: 0.7,
              fontWeight: 600,
            }}
          >
            {sport === "swim" ? "LAP LEDGER" : "KEY SPLITS"}
          </div>
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "14px 18px",
              fontFamily: "var(--font-mono), monospace",
              flex: 1,
            }}
          >
            {splitSample.slice(0, 6).map((s, i) => (
              <div
                key={`split-${i}-${s.durationSec}`}
                style={{ borderTop: `2px solid ${INK}`, paddingTop: 8 }}
              >
                <div
                  style={{
                    opacity: 0.65,
                    fontSize: 22,
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                  }}
                >
                  {s.km === undefined ? `LAP ${s.lap}` : `KM ${s.km}`}
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 32,
                    fontFamily: "var(--font-archivo-narrow), sans-serif",
                    lineHeight: 1,
                    marginTop: 4,
                  }}
                >
                  {formatClock(s.durationSec)}
                </div>
                {s.avgSpeedKmh && (
                  <div
                    style={{
                      opacity: 0.65,
                      fontSize: 18,
                      marginTop: 4,
                      fontWeight: 500,
                    }}
                  >
                    {s.avgSpeedKmh.toFixed(1)} km/h
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          fontSize: 22,
          letterSpacing: "0.22em",
          opacity: 0.7,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: 600,
        }}
      >
        <span>EFF/2026/{sport.toUpperCase().slice(0, 3)}-04</span>
        <span style={{ color: accent }}>● DATA</span>
      </div>
    </div>
  );
}

export const dataTheme = defineTheme({
  id: "data",
  label: "DATA",
  tagline: "dashboard poster",
  uses: USES,
  colors: { default: { primary: DEFAULT_ACCENT }, userAdjustable: true },
  // Poster: stays opaque; the frame mattes its white bg into the bands.
  frame: { backdrop: "#ffffff" },
  photo: { defaultOn: false },
  Component: ThemeData,
});
