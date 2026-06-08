// STRATA — a generative card built from the activity alone, no photo needed.
// The route's wander (top) is morphed point-by-point down through a woven field
// of strata into the elevation / pace profile (bottom); both source curves stay
// highlighted, the layers between are the abstraction. Parameterised by `config`
// (mood · density · legend) — the model and the morph maths live in
// `lib/strata.ts`. Type: Space Grotesk (display) + JetBrains Mono (cartographic
// labels / data). Renders to plain inline SVG (no CSS filters) so it rasterises
// cleanly via html-to-image.

import type { ActivityData } from "@/components/app/sample-data";
import { mixHex } from "@/lib/chart-helpers";
import {
  formatDateUpper,
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";
import {
  buildStrata,
  DEFAULT_STRATA_CONFIG,
  resolveStrataSource,
  STRATA_DENSITY_K,
  STRATA_MOODS,
  type StrataConfig,
  smoothPath,
} from "@/lib/strata";
import type { ActivityCardProps } from "./types";

const DISPLAY = "var(--font-space-grotesk), sans-serif";
const MONO = "var(--font-mono), monospace";

// The morph field's internal coordinate space; the SVG scales to fill the hero.
const FIELD_W = 920;
const FIELD_H = 880;

interface ThemeStrataProps extends ActivityCardProps {
  config?: StrataConfig;
}

/** The reusable strata SVG: the woven field plus the two highlighted heroes. */
function StrataField({
  data,
  config,
}: {
  config: StrataConfig;
  data: ActivityData;
}) {
  const tokens = STRATA_MOODS[config.mood];
  const source = resolveStrataSource(data);
  if (!source) {
    return null;
  }

  const { curves } = buildStrata({
    routeCoords: source.routeCoords,
    profile: source.profile,
    W: FIELD_W,
    H: FIELD_H,
    K: STRATA_DENSITY_K[config.density],
  });
  if (curves.length < 2) {
    return null;
  }
  const hero0 = curves[0];
  const heroN = curves[curves.length - 1];
  const rStart = hero0.pts[0];
  const rEnd = hero0.pts[hero0.pts.length - 1];
  if (!(rStart && rEnd)) {
    return null;
  }

  const routeTopY = Math.min(...hero0.pts.map((p) => p[1]));
  const elevBotY = Math.max(...heroN.pts.map((p) => p[1]));
  const haloW = tokens.heroW + 8;

  return (
    <svg
      aria-hidden="true"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        overflow: "visible",
      }}
      viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
    >
      <title>Strata — the route morphing into the elevation profile</title>

      {/* The woven in-between layers — back to front, the route unfurling. */}
      {curves.map((c, k) => {
        if (k === 0 || k === curves.length - 1) {
          return null;
        }
        const col = mixHex(tokens.routeColor, tokens.elevColor, c.t);
        // Airy waist: faintest at mid-morph, firmer near the two heroes.
        const alpha = tokens.lineAlpha * (0.6 + 0.55 * Math.abs(2 * c.t - 1));
        return (
          <path
            d={smoothPath(c.pts)}
            fill="none"
            key={c.t}
            stroke={col}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={alpha}
            strokeWidth={tokens.midW}
          />
        );
      })}

      {/* HERO — the elevation / pace profile (bottom), with a soft halo. */}
      <path
        d={smoothPath(heroN.pts)}
        fill="none"
        stroke={tokens.elevColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.18}
        strokeWidth={haloW}
      />
      <path
        d={smoothPath(heroN.pts)}
        fill="none"
        stroke={tokens.elevColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={tokens.heroW}
      />
      {/* HERO — the real route (top). */}
      <path
        d={smoothPath(hero0.pts)}
        fill="none"
        stroke={tokens.routeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.18}
        strokeWidth={haloW}
      />
      <path
        d={smoothPath(hero0.pts)}
        fill="none"
        stroke={tokens.routeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={tokens.heroW}
      />

      {/* Start dot + finish arrow ride on the real route. */}
      <circle cx={rStart[0]} cy={rStart[1]} fill={tokens.routeColor} r={9} />
      <g transform={`translate(${rEnd[0]}, ${rEnd[1]})`}>
        <path d="M-4 -8 L10 0 L-4 8 Z" fill={tokens.marker} />
      </g>

      {config.legend ? (
        <g fill={tokens.text} fontFamily={MONO} fontWeight={600}>
          <text fontSize={22} letterSpacing={3} x={6} y={routeTopY - 16}>
            ROUTE
          </text>
          <text fontSize={22} letterSpacing={3} x={6} y={elevBotY + 36}>
            {source.profileLabel}
            {source.elevMax ? `  ·  ${source.elevMax} M` : ""}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

/** Sport-appropriate [label, value, unit] trio for the foot of the card. */
function statRow(data: ActivityData): [string, string, string][] {
  const time: [string, string, string] = [
    "TIME",
    formatDuration(data.durationSec),
    "",
  ];
  if (data.sport === "run") {
    return [
      ["DST", data.distanceKm.toFixed(1), "km"],
      ["PACE", formatPaceMin(data.avgPaceMinPerKm), "/km"],
      time,
    ];
  }
  if (data.sport === "swim") {
    return [
      ["DST", (data.distanceKm * 1000).toFixed(0), "m"],
      ["/100", formatPaceSec(data.avgPacePer100m), ""],
      time,
    ];
  }
  // ride, triathlon, and anything else: distance · elevation · time.
  return [
    ["DST", data.distanceKm.toFixed(1), "km"],
    ["ELEV", formatNumber(data.elevationGainM), "m"],
    time,
  ];
}

function sportLabel(sport: ActivityData["sport"]): string {
  if (sport === "ride") {
    return "A CYCLE";
  }
  if (sport === "run") {
    return "A RUN";
  }
  if (sport === "swim") {
    return "A SWIM";
  }
  if (sport === "triathlon") {
    return "A TRIATHLON";
  }
  return "AN EFFORT";
}

export function ThemeStrata({
  data,
  config = DEFAULT_STRATA_CONFIG,
}: ThemeStrataProps) {
  const tokens = STRATA_MOODS[config.mood];
  const stats = statRow(data);
  const statText = tokens.inkStat ? tokens.text : "#fff";
  const metaParts = [
    (data.location || "").toUpperCase(),
    formatDateUpper(data.date),
  ].filter(Boolean);

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        background: tokens.bg,
        color: tokens.text,
        fontFamily: MONO,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        padding: "78px 80px 0 80px",
        boxSizing: "border-box",
      }}
    >
      {/* Meta band. */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "0.26em",
        }}
      >
        <span>STRATA · {sportLabel(data.sport)}</span>
        <span style={{ opacity: 0.6 }}>{tokens.label}</span>
      </div>
      <div
        style={{
          height: 1.5,
          background: "currentColor",
          opacity: 0.28,
          marginTop: 22,
        }}
      />

      {/* Title + place / date. */}
      <h1
        style={{
          fontFamily: DISPLAY,
          fontWeight: 700,
          fontSize: 82,
          lineHeight: 0.94,
          letterSpacing: "-0.02em",
          margin: "34px 0 14px 0",
          maxWidth: "94%",
          textWrap: "pretty",
        }}
      >
        {data.title}
      </h1>
      <div
        style={{
          fontSize: 25,
          letterSpacing: "0.16em",
          opacity: 0.7,
          fontWeight: 500,
        }}
      >
        {metaParts.join(" · ")}
      </div>

      {/* The strata field — the hero. */}
      <div
        style={{
          flex: 1,
          position: "relative",
          margin: "20px 0 8px 0",
          minHeight: 0,
        }}
      >
        <StrataField config={config} data={data} />
      </div>

      {/* Stat strip. */}
      <div
        style={{
          margin: "0 -80px",
          background: tokens.statBg,
          borderTop: `1.5px solid ${tokens.statBorder}`,
          padding: "30px 80px",
          display: "flex",
          justifyContent: "space-between",
          gap: 24,
          color: statText,
          alignItems: "flex-end",
        }}
      >
        {stats.map(([k, v, u]) => (
          <div key={k}>
            <div
              style={{
                fontSize: 23,
                letterSpacing: "0.22em",
                opacity: 0.7,
                fontWeight: 600,
              }}
            >
              {k}
            </div>
            <div
              style={{
                marginTop: 8,
                fontFamily: DISPLAY,
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {v}
              {u ? (
                <span
                  style={{
                    fontSize: 26,
                    opacity: 0.65,
                    marginLeft: 6,
                    fontFamily: MONO,
                  }}
                >
                  {u}
                </span>
              ) : null}
            </div>
          </div>
        ))}
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.2em",
            opacity: 0.6,
            fontWeight: 600,
            textAlign: "right",
          }}
        >
          № 01
          <br />
          EFFORT
        </div>
      </div>
    </div>
  );
}
