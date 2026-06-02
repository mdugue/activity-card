// PATH — route silhouette is the hero, art-print energy.
// Type: Cormorant Garamond (display) + Manrope (body)
// Palette: warm off-white paper, deep ink, single rust accent

import { abstractLanes, routePath } from "@/lib/chart-helpers";
import {
  formatDateUpper,
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";
import { PhotoBackdrop } from "./photo-backdrop";
import type { ActivityCardProps } from "./types";

export function ThemePath({ data, photoUrl }: ActivityCardProps) {
  const isPool = data.sport === "swim";
  const sport = data.sport;

  let sportLabel = "A TRIATHLON";
  if (sport === "ride") {
    sportLabel = "A CYCLE";
  } else if (sport === "run") {
    sportLabel = "A RUN";
  } else if (sport === "swim") {
    sportLabel = "A SWIM";
  }

  let statTrio: [string, string][];
  if (sport === "ride") {
    statTrio = [
      ["DISTANCE", `${data.distanceKm.toFixed(1)} km`],
      ["ELEVATION", `${formatNumber(data.elevationGainM)} m`],
      ["AVG SPEED", `${formatNumber(data.avgSpeedKmh, 1)} km/h`],
    ];
  } else if (sport === "run") {
    statTrio = [
      ["DISTANCE", `${data.distanceKm.toFixed(1)} km`],
      ["DURATION", formatDuration(data.durationSec)],
      ["AVG PACE", `${formatPaceMin(data.avgPaceMinPerKm)} /km`],
    ];
  } else if (sport === "swim") {
    statTrio = [
      ["DISTANCE", `${(data.distanceKm * 1000).toFixed(0)} m`],
      ["DURATION", formatDuration(data.durationSec)],
      ["PACE", `${formatPaceSec(data.avgPacePer100m)} /100m`],
    ];
  } else {
    statTrio = [
      ["DISTANCE", `${data.distanceKm.toFixed(1)} km`],
      ["DURATION", formatDuration(data.durationSec)],
      ["ELEVATION", `${formatNumber(data.elevationGainM)} m`],
    ];
  }

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        background: "#ffffff",
        color: "#1a1714",
        fontFamily: "var(--font-manrope), sans-serif",
        position: "relative",
        padding: "90px 90px 80px 90px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {photoUrl ? <PhotoBackdrop photoUrl={photoUrl} treatment="path" /> : null}
      {/* Content sits above the backdrop layer. */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        {/* Top meta band */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            letterSpacing: "0.28em",
            fontSize: 24,
            fontWeight: 600,
          }}
        >
          <span>{sportLabel}</span>
          <span style={{ opacity: 0.55 }}>{formatDateUpper(data.date)}</span>
        </div>
        <div
          style={{
            height: 1,
            background: "#1a1714",
            opacity: 0.35,
            margin: "24px 0 0 0",
          }}
        />

        {/* Title */}
        <div style={{ marginTop: 38, marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: 76,
              lineHeight: 0.95,
              letterSpacing: "-0.01em",
              margin: 0,
              textWrap: "pretty",
              maxWidth: "90%",
            }}
          >
            {data.title}
          </h1>
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
        </div>

        {/* Route — the hero */}
        <div
          style={{
            flex: 1,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            aria-hidden="true"
            style={{ width: "100%", height: "100%" }}
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
            {isPool ? (
              <g>
                {abstractLanes(900, 720, 6, 60).map((l, i) => (
                  <g key={`path-lane-${i}-${l.y}`}>
                    <line
                      stroke="#1a1714"
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
                      stroke="#c45a2c"
                      strokeOpacity={0.55 - i * 0.05}
                      strokeWidth={2.5}
                    />
                  </g>
                ))}
              </g>
            ) : (
              <PathRoute coords={data.routeCoordinates} />
            )}
          </svg>
        </div>

        {/* Stats — quiet supporting characters */}
        <div style={{ marginTop: 30 }}>
          <div
            style={{
              height: 1,
              background: "#1a1714",
              opacity: 0.35,
              marginBottom: 22,
            }}
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 24,
            }}
          >
            {statTrio.map(([k, v]) => (
              <div key={k}>
                <div
                  style={{
                    fontSize: 24,
                    letterSpacing: "0.22em",
                    opacity: 0.55,
                    fontWeight: 600,
                  }}
                >
                  {k}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-cormorant), serif",
                    fontSize: 60,
                    fontWeight: 400,
                    marginTop: 10,
                    lineHeight: 1,
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
              fontSize: 24,
              letterSpacing: "0.2em",
              opacity: 0.55,
              fontWeight: 600,
            }}
          >
            <span>№ 01 — EFFORT</span>
            <span>
              {data.athleteName ? `— ${data.athleteName.toUpperCase()}` : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PathRoute({ coords }: { coords?: [number, number][] }) {
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
  const innerW = 900 - 120;
  const innerH = 720 - 120;
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
  const d = routePath(coords, 900, 720, 60);
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke="#1a1714"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={0.08}
        strokeWidth={18}
      />
      <path
        d={d}
        fill="none"
        stroke="#1a1714"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={4}
      />
      <circle cx={start[0]} cy={start[1]} fill="#c45a2c" r={9} />
      <circle cx={end[0]} cy={end[1]} fill="#1a1714" r={9} />
    </g>
  );
}
