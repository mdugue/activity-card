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
import { defineTheme, type ThemeProps } from "@/theme/core/theme-contract";
import { SafeArea, useFormat } from "../shared/format-context";
import { OverlayRoute } from "../shared/overlay-route";
import { PhotoUnderlay } from "../shared/photo-underlay";

const USES = [
  "athleteName",
  "cadence",
  "date",
  "distance",
  "elevation",
  "elevationViz",
  "heartRate",
  "location",
  "pace",
  "photo",
  "power",
  "route",
  "speed",
  "splits",
  "time",
  "title",
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
        // Each cell is its own query container so its value numeral sizes to the
        // cell box — narrow cells (landscape, many columns) and short cells
        // (square) both shrink the numeral instead of overflowing.
        containerType: "size",
        border: `1.5px solid ${INK}`,
        padding: dense
          ? "clamp(8px, 3cqb, 16px) 18px"
          : "clamp(8px, 3cqb, 18px) 22px",
        background: PANEL,
        // No fixed minHeight: cells compress to share the body's vertical budget.
        minHeight: 0,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        // Label pinned at top, value beneath it: the label is always visible;
        // a too-tall value clips at the bottom (the lesser evil) rather than
        // pushing the label off the top of the cell.
        justifyContent: "flex-start",
        gap: "clamp(4px, 4cqb, 12px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          fontSize: "clamp(16px, min(7cqi, 22cqb), 24px)",
          lineHeight: 1.1,
          letterSpacing: "0.16em",
          opacity: 0.7,
          textTransform: "uppercase",
          fontWeight: 600,
          whiteSpace: "nowrap",
          flex: "0 0 auto",
        }}
      >
        {label}
      </div>
      {value !== undefined && (
        <div
          style={{
            fontFamily: "var(--font-archivo-narrow), sans-serif",
            fontWeight: 700,
            // Big numeral shrinks with cell width (cqi) and height (cqb); the cqb
            // term stays modest so label + value both clear the cell's padding.
            fontSize: "clamp(26px, min(26cqi, 30cqb), 64px)",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}
        >
          {value}
          {unit && (
            <span
              style={{
                fontSize: "clamp(15px, min(11cqi, 20cqb), 26px)",
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
  const { width, height } = useFormat();
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
        <Cell
          label="Distance"
          unit="km"
          value={formatNumber(data.distanceKm, 1)}
        />
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
        <Cell
          label="Distance"
          unit="km"
          value={formatNumber(data.distanceKm, 1)}
        />
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
          value={formatNumber(
            data.distanceKm === undefined ? undefined : data.distanceKm * 1000
          )}
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
        width,
        height,
        background: BG,
        color: INK,
        fontFamily: "var(--font-mono), monospace",
        position: "relative",
        // Named query container (`card`) for the whole card: type sizes to its
        // width (cqi) + height (cqb), and the grids' `@container card` width
        // breakpoints below key on it to add columns at x-landscape — the name
        // lets those breakpoints reach past the nested per-cell `size` containers.
        containerType: "size",
        containerName: "card",
        // Stacking context so the z-index:-1 photo underlay paints above the
        // solid background (not behind it) and below the dense content.
        isolation: "isolate",
        overflow: "hidden",
      }}
    >
      {photoUrl ? (
        <PhotoUnderlay imageTransform={imageTransform} photoUrl={photoUrl} />
      ) : null}
      <SafeArea pad={{ top: 60, right: 56, bottom: 52, left: 56 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderBottom: `3px solid ${INK}`,
            paddingBottom: "clamp(10px, 2cqb, 20px)",
            marginBottom: "clamp(10px, 2cqb, 22px)",
            flex: "0 0 auto",
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
                // Title shrinks on short (cqb) / narrow (cqi) canvases; the MAX
                // keeps the 4:5 feed master unchanged.
                fontSize: "clamp(46px, min(8cqi, 11cqb), 84px)",
                lineHeight: 0.95,
                letterSpacing: "-0.01em",
                margin: "clamp(6px, 1.5cqb, 14px) 0 0 0",
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

        {/* Two chart panels (route · profile): always side-by-side — every
            export format is ≥1080px wide, so `grid-cols-2`'s shrink-safe
            `minmax(0, 1fr)` tracks just narrow the SVGs rather than overflow. */}
        <div
          className="grid grid-cols-2"
          style={{
            gap: 14,
            marginBottom: 14,
            flex: "1 1 0",
            minHeight: 0,
          }}
        >
          <div
            style={{
              border: `1.5px solid ${INK}`,
              padding: "clamp(12px, 2.4cqb, 22px)",
              background: PANEL,
              position: "relative",
              minWidth: 0,
              minHeight: 0,
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
                flex: "0 0 auto",
              }}
            >
              ROUTE
            </div>
            <svg
              aria-hidden="true"
              preserveAspectRatio="xMidYMid meet"
              style={{
                width: "100%",
                flex: "1 1 0",
                minHeight: 0,
                marginTop: 8,
              }}
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
              padding: "clamp(12px, 2.4cqb, 22px)",
              background: PANEL,
              minWidth: 0,
              minHeight: 0,
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
                flex: "0 0 auto",
              }}
            >
              {chartLabel}
            </div>
            <svg
              aria-hidden="true"
              preserveAspectRatio="xMidYMid meet"
              style={{
                width: "100%",
                flex: "1 1 0",
                minHeight: 0,
                marginTop: 8,
              }}
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

        {/* Stat grid, ONE markup: 3-up at feed / square / 9:16, 5-up at
            x-landscape via `@min-[1400px]/card:grid-cols-5` (only the 1600px
            landscape canvas crosses 1400px). `minmax(0, 1fr)` (via grid-cols-*)
            lets cells shrink, not overflow. */}
        <div
          className="grid auto-rows-fr @min-[1400px]/card:grid-cols-5 grid-cols-3"
          style={{
            gap: 14,
            marginBottom: 14,
            flex: "1.6 1 0",
            minHeight: 0,
          }}
        >
          {cells}
        </div>

        {/* Zones | splits: always side-by-side (every format is ≥1080px wide).
            `grid-cols-2`'s shrink-safe `minmax(0, 1fr)` halves compress rather
            than overflow. */}
        <div
          className="grid grid-cols-2"
          style={{
            gap: 14,
            flex: "1.2 1 0",
            minHeight: 0,
          }}
        >
          <div
            style={{
              border: `1.5px solid ${INK}`,
              background: PANEL,
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
              // The zones panel is its OWN query container: labels + bar band
              // size to THIS panel's height (cqb), not the card's — so the short
              // x-landscape panel (~140px band) shrinks them to fit instead of
              // overflowing the title or clipping the Z labels.
              containerType: "size",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                // Padding sits on this inner wrapper so it ALSO resolves cqb
                // against the panel container above and shrinks on the short
                // canvas, freeing the vertical budget the chart needs.
                padding: "clamp(12px, 8cqb, 22px)",
                flex: 1,
                minHeight: 0,
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
                  flex: "0 0 auto",
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
                  marginTop: "clamp(8px, 7cqb, 22px)",
                  paddingBottom: 6,
                  minHeight: 0,
                }}
              >
                {(() => {
                  const maxPct = Math.max(...zones.map((z) => z.pct), 1);
                  return zones.map((z, i) => (
                    <div
                      key={`zone-${z.zone}-${i}`}
                      style={{
                        flex: 1,
                        height: "100%",
                        textAlign: "center",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        minHeight: 0,
                      }}
                    >
                      <div
                        style={{
                          // Panel-relative cqb: full size on the tall feed panel,
                          // shrinking to its floor on the short landscape one.
                          fontSize: "clamp(15px, 11cqb, 26px)",
                          fontWeight: 700,
                          marginBottom: 4,
                          flex: "0 0 auto",
                        }}
                      >
                        {z.pct}%
                      </div>
                      {/* The bar lives in its OWN flex track between the fixed
                          percentage and zone labels — so the tallest bar fills
                          this middle band (not the whole column) and the labels
                          always keep their space. Critical on a short
                          x-landscape panel: a 100%-of-column bar used to push its
                          % label up into the title. Bar height is a share of THIS
                          band, so it still scales fluidly to the panel height. */}
                      <div
                        style={{
                          flex: "1 1 0",
                          width: "100%",
                          minHeight: 0,
                          display: "flex",
                          alignItems: "flex-end",
                        }}
                      >
                        <div
                          style={{
                            background: i % 2 === 0 ? INK : accent,
                            height: `${(z.pct / maxPct) * 100}%`,
                            width: "100%",
                            minHeight: 6,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: "clamp(13px, 9cqb, 20px)",
                          marginTop: 6,
                          letterSpacing: "0.1em",
                          fontWeight: 700,
                          flex: "0 0 auto",
                        }}
                      >
                        {z.zone}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
          <div
            style={{
              border: `1.5px solid ${INK}`,
              padding: "clamp(12px, 2.4cqb, 22px)",
              background: PANEL,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontSize: 24,
                letterSpacing: "0.18em",
                opacity: 0.7,
                fontWeight: 600,
                flex: "0 0 auto",
              }}
            >
              {sport === "swim" ? "LAP LEDGER" : "KEY SPLITS"}
            </div>
            {/* Splits reflow with the CARD width, ONE markup: ~3-up (two rows) at
                feed / square / 9:16, 6-up (one row) at x-landscape. The column
                breakpoint `@min-[1400px]/card:grid-cols-6` keys on the named
                `card` query, reaching past this grid's own (unnamed) `size`
                container — which still sizes each split row's type to THIS grid's
                height (`cqb` below) so the splits stay inside the panel. */}
            <div
              className="grid auto-rows-fr @min-[1400px]/card:grid-cols-6 grid-cols-3"
              style={{
                marginTop: "clamp(8px, 2cqb, 18px)",
                gap: "clamp(6px, 1.6cqb, 14px) 14px",
                fontFamily: "var(--font-mono), monospace",
                flex: 1,
                minHeight: 0,
                containerType: "size",
              }}
            >
              {splitSample.slice(0, 6).map((s, i) => (
                <div
                  key={`split-${i}-${s.durationSec}`}
                  style={{
                    borderTop: `2px solid ${INK}`,
                    paddingTop: "clamp(3px, 1.4cqb, 8px)",
                    minHeight: 0,
                    minWidth: 0,
                    // Clip a split that can't fit its row instead of letting it
                    // overlap the row beneath it.
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      opacity: 0.65,
                      fontSize: "clamp(13px, 9cqb, 22px)",
                      fontWeight: 500,
                      letterSpacing: "0.06em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.km === undefined ? `LAP ${s.lap}` : `KM ${s.km}`}
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "clamp(20px, 13cqb, 32px)",
                      fontFamily: "var(--font-archivo-narrow), sans-serif",
                      lineHeight: 1,
                      marginTop: "clamp(2px, 1.6cqb, 4px)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatClock(s.durationSec)}
                  </div>
                  {s.avgSpeedKmh && (
                    <div
                      style={{
                        opacity: 0.65,
                        fontSize: "clamp(12px, 7cqb, 18px)",
                        marginTop: "clamp(2px, 1.6cqb, 4px)",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
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
            marginTop: "clamp(10px, 2cqb, 20px)",
            fontSize: 22,
            letterSpacing: "0.22em",
            opacity: 0.7,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 600,
            flex: "0 0 auto",
          }}
        >
          <span>EFF/2026/{sport.toUpperCase().slice(0, 3)}-04</span>
          <span style={{ color: accent }}>● DATA</span>
        </div>
      </SafeArea>
    </div>
  );
}

export const dataTheme = defineTheme({
  id: "data",
  label: "DATA",
  tagline: "dashboard poster",
  uses: USES,
  colors: { default: { primary: DEFAULT_ACCENT }, userAdjustable: true },
  photo: { defaultOn: false },
  Component: ThemeData,
});
