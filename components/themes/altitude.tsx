// ALTITUDE / PACE — profile dominates. Sky above, profile below.
// Type: Space Grotesk (display) + JetBrains Mono (data)
// Parameterized by `mood`: night | dawn | day | heat | rain | snow

import { StravaAttribution } from "@/components/app/strava-attribution";
import { elevationPath, pacePath } from "@/lib/chart-helpers";
import {
  formatDateUpper,
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";
import { PhotoBackdrop } from "./photo-backdrop";
import type { ActivityCardProps } from "./types";

export type AltitudeMood = "night" | "dawn" | "day" | "heat" | "rain" | "snow";

interface DiskSpec {
  cx: number;
  cy: number;
  fill: string;
  glow: string;
  kind: "moon" | "sun" | "cloud";
  r: number;
}

interface MoodSpec {
  backFill: string;
  backStops: [string, string];
  disk: DiskSpec;
  extras: "stars" | "clouds" | "haze" | "rain" | "snow" | null;
  frontFill: string;
  frontStops: [string, string];
  inkOnStat?: boolean;
  label: string;
  midFill: string;
  midStops: [string, string];
  paceFill: string;
  paceStroke: string;
  sky: string;
  statBg: string;
  statBorder: string;
  swimBar: string;
  text: string;
}

export const ALTITUDE_MOODS: Record<AltitudeMood, MoodSpec> = {
  night: {
    label: "NIGHT",
    sky: "linear-gradient(180deg, #1d2430 0%, #28354a 38%, #3e4a63 64%, #5b6478 88%, #6f7280 100%)",
    text: "#e8e2d6",
    statBg: "rgba(8, 10, 14, 0.85)",
    statBorder: "rgba(232, 226, 214, 0.15)",
    disk: {
      kind: "moon",
      cx: 940,
      cy: 220,
      r: 65,
      fill: "radial-gradient(circle at 35% 35%, #f0e0c2 0%, #d9b487 55%, #b78a5a 100%)",
      glow: "rgba(240, 220, 180, 0.25)",
    },
    backFill: "linear",
    backStops: ["#3e4a63", "#2a3344"],
    midFill: "linear",
    midStops: ["#2a3344", "#1a2030"],
    frontFill: "linear",
    frontStops: ["#13171f", "#0a0d13"],
    paceStroke: "#f0d0a8",
    paceFill: "#c97b4d",
    swimBar: "#c97b4d",
    extras: "stars",
  },
  dawn: {
    label: "DAWN",
    sky: "linear-gradient(180deg, #2a1a3a 0%, #6e3a5e 25%, #c46a6e 50%, #e89e7a 72%, #f4c89b 92%, #c9885a 100%)",
    text: "#f5ead8",
    statBg: "rgba(40, 18, 32, 0.78)",
    statBorder: "rgba(245, 234, 216, 0.18)",
    disk: {
      kind: "sun",
      cx: 880,
      cy: 460,
      r: 90,
      fill: "radial-gradient(circle, #fff2c8 0%, #ffd089 45%, #ff8e57 100%)",
      glow: "rgba(255, 196, 130, 0.55)",
    },
    backFill: "linear",
    backStops: ["#7a4566", "#4a253c"],
    midFill: "linear",
    midStops: ["#4a253c", "#2c1626"],
    frontFill: "linear",
    frontStops: ["#1c0d18", "#0a0408"],
    paceStroke: "#ffd089",
    paceFill: "#ff8e57",
    swimBar: "#ff8e57",
    extras: null,
  },
  day: {
    label: "DAY",
    sky: "linear-gradient(180deg, #5fb5d8 0%, #82c8e0 30%, #b4dfeb 55%, #e0eef0 82%, #cfd6cc 100%)",
    text: "#0e1620",
    statBg: "rgba(255, 255, 255, 0.88)",
    statBorder: "rgba(14, 22, 32, 0.18)",
    disk: {
      kind: "sun",
      cx: 880,
      cy: 200,
      r: 70,
      fill: "radial-gradient(circle, #fff8d8 0%, #ffe888 60%, #fdc94a 100%)",
      glow: "rgba(255, 232, 136, 0.55)",
    },
    backFill: "linear",
    backStops: ["#a8c7d8", "#7ba1b8"],
    midFill: "linear",
    midStops: ["#6a8aa3", "#4a6781"],
    frontFill: "linear",
    frontStops: ["#2c4258", "#1a2838"],
    paceStroke: "#0e1620",
    paceFill: "#6e8aa8",
    swimBar: "#4a6781",
    extras: "clouds",
    inkOnStat: true,
  },
  heat: {
    label: "HEAT",
    sky: "linear-gradient(180deg, #2c0808 0%, #6f1a14 22%, #c44518 48%, #e8722a 72%, #f9b85e 92%, #c08a4c 100%)",
    text: "#fde9c8",
    statBg: "rgba(20, 6, 4, 0.82)",
    statBorder: "rgba(253, 233, 200, 0.18)",
    disk: {
      kind: "sun",
      cx: 540,
      cy: 480,
      r: 130,
      fill: "radial-gradient(circle, #fff2ca 0%, #ffc070 35%, #ff5a1a 100%)",
      glow: "rgba(255, 130, 50, 0.75)",
    },
    backFill: "linear",
    backStops: ["#7a2418", "#481008"],
    midFill: "linear",
    midStops: ["#3a0e08", "#1a0604"],
    frontFill: "linear",
    frontStops: ["#0e0402", "#000000"],
    paceStroke: "#ffc070",
    paceFill: "#ff5a1a",
    swimBar: "#ff5a1a",
    extras: "haze",
  },
  rain: {
    label: "RAIN",
    sky: "linear-gradient(180deg, #2a3038 0%, #3a434c 25%, #525b65 55%, #6c747d 82%, #7c828a 100%)",
    text: "#e0e4e8",
    statBg: "rgba(14, 18, 22, 0.82)",
    statBorder: "rgba(224, 228, 232, 0.15)",
    disk: {
      kind: "cloud",
      cx: 880,
      cy: 240,
      r: 110,
      fill: "radial-gradient(ellipse 110% 70% at 50% 60%, #8a929a 0%, #6c747d 60%, #4a5158 100%)",
      glow: "rgba(120, 130, 140, 0.4)",
    },
    backFill: "linear",
    backStops: ["#404750", "#2c3138"],
    midFill: "linear",
    midStops: ["#2c3138", "#1a1e23"],
    frontFill: "linear",
    frontStops: ["#161a1f", "#0a0c0f"],
    paceStroke: "#9eb4c8",
    paceFill: "#5c768c",
    swimBar: "#5c768c",
    extras: "rain",
  },
  snow: {
    label: "SNOW",
    sky: "linear-gradient(180deg, #3a4458 0%, #6a7a90 30%, #a8b8cc 60%, #d8e0e8 90%, #e0d8d0 100%)",
    text: "#1a2030",
    statBg: "rgba(255, 255, 255, 0.88)",
    statBorder: "rgba(26, 32, 48, 0.15)",
    disk: {
      kind: "sun",
      cx: 880,
      cy: 200,
      r: 55,
      fill: "radial-gradient(circle, #fff8e8 0%, #ffe8b0 60%, #f0c068 100%)",
      glow: "rgba(255, 232, 176, 0.4)",
    },
    backFill: "linear",
    backStops: ["#c4ccd8", "#a0a8b8"],
    midFill: "linear",
    midStops: ["#8088a0", "#5a6280"],
    frontFill: "linear",
    frontStops: ["#3a4258", "#1c2238"],
    paceStroke: "#1a2030",
    paceFill: "#5a6280",
    swimBar: "#5a6280",
    extras: "snow",
    inkOnStat: true,
  },
};

interface ThemeAltitudeProps extends ActivityCardProps {
  mood?: AltitudeMood;
}

type StatTuple = [string, string | number, string];

export function ThemeAltitude({
  data,
  mood = "night",
  photoUrl,
}: ThemeAltitudeProps) {
  const M = ALTITUDE_MOODS[mood] || ALTITUDE_MOODS.night;
  const sport = data.sport;

  const usePace = sport === "run" && data.paceProfile;
  const useLapBars = sport === "swim";
  const useElev = !(usePace || useLapBars) && data.elevationProfile;

  let statRow: StatTuple[];
  if (sport === "ride") {
    statRow = [
      ["DST", data.distanceKm.toFixed(1), "km"],
      ["ELEV", formatNumber(data.elevationGainM), "m"],
      ["VAM", formatNumber(data.vamMph), "m/h"],
      ["AVG", formatNumber(data.avgSpeedKmh, 1), "km/h"],
    ];
  } else if (sport === "run") {
    statRow = [
      ["DST", data.distanceKm.toFixed(1), "km"],
      ["TIME", formatDuration(data.durationSec), ""],
      ["PACE", formatPaceMin(data.avgPaceMinPerKm), "/km"],
      ["HR", formatNumber(data.avgHeartRate), "bpm"],
    ];
  } else if (sport === "swim") {
    statRow = [
      ["DST", (data.distanceKm * 1000).toFixed(0), "m"],
      ["TIME", formatDuration(data.durationSec), ""],
      ["/100", formatPaceSec(data.avgPacePer100m), ""],
      ["SWOLF", formatNumber(data.swolf), ""],
    ];
  } else {
    statRow = [
      ["DST", data.distanceKm.toFixed(1), "km"],
      ["TIME", formatDuration(data.durationSec), ""],
      ["ELEV", formatNumber(data.elevationGainM), "m"],
      ["HR", formatNumber(data.avgHeartRate), "bpm"],
    ];
  }

  const peakInfo =
    useElev && data.elevationProfile
      ? (() => {
          const max = Math.max(...data.elevationProfile);
          const min = Math.min(...data.elevationProfile);
          return { max, min };
        })()
      : null;

  const gid = `alt-${mood}`;
  const statText = M.inkOnStat ? M.text : "#fff";

  let portraitLabel = "EFFORT PORTRAIT";
  if (sport === "ride") {
    portraitLabel = "MOUNTAIN PORTRAIT";
  } else if (sport === "run") {
    portraitLabel = "RHYTHM PORTRAIT";
  } else if (sport === "swim") {
    portraitLabel = "LAP PORTRAIT";
  }

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        background: M.sky,
        color: M.text,
        fontFamily: "var(--font-mono), monospace",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {photoUrl ? (
        <PhotoBackdrop photoUrl={photoUrl} treatment="altitude" />
      ) : null}
      <div
        style={{
          position: "absolute",
          top: M.disk.cy - M.disk.r,
          left: M.disk.cx - M.disk.r,
          width: M.disk.r * 2,
          height: M.disk.r * 2,
          borderRadius: "50%",
          background: M.disk.fill,
          boxShadow: `0 0 100px ${M.disk.glow}`,
        }}
      />

      {M.extras === "stars" && (
        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <title>Stars</title>
          {Array.from({ length: 22 }, (_, i) => {
            const x = (i * 137) % 1080;
            const y = (i * 89) % 500;
            return (
              <circle
                cx={x}
                cy={y}
                fill="#fff"
                key={`star-${i}-${x}-${y}`}
                opacity={0.3 + (i % 5) * 0.1}
                r={1 + (i % 3) * 0.5}
              />
            );
          })}
        </svg>
      )}
      {M.extras === "clouds" && (
        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            opacity: 0.6,
          }}
        >
          <title>Clouds</title>
          {(
            [
              [200, 320, 180, 40],
              [620, 380, 220, 50],
              [120, 460, 240, 38],
            ] as const
          ).map(([x, y, w, h]) => (
            <ellipse
              cx={x}
              cy={y}
              fill="#fff"
              key={`cloud-${x}-${y}`}
              opacity={0.55}
              rx={w}
              ry={h}
            />
          ))}
        </svg>
      )}
      {M.extras === "haze" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 60%, rgba(255,120,40,0.18) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />
      )}
      {M.extras === "rain" && (
        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <title>Rain</title>
          {Array.from({ length: 90 }, (_, i) => {
            const x = (i * 53 + 11) % 1100;
            const y = (i * 73) % 1100;
            const len = 14 + (i % 3) * 6;
            return (
              <line
                key={`rain-${i}-${x}-${y}`}
                opacity={0.4 + (i % 5) * 0.05}
                stroke="#cfd9e3"
                strokeWidth={1.2}
                x1={x}
                x2={x - 4}
                y1={y}
                y2={y + len}
              />
            );
          })}
        </svg>
      )}
      {M.extras === "snow" && (
        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <title>Snow</title>
          {Array.from({ length: 70 }, (_, i) => {
            const x = (i * 67 + 17) % 1080;
            const y = (i * 51) % 950;
            const r = 1.5 + (i % 4) * 1.2;
            return (
              <circle
                cx={x}
                cy={y}
                fill="#fff"
                key={`snow-${i}-${x}-${y}`}
                opacity={0.6 + (i % 3) * 0.15}
                r={r}
              />
            );
          })}
        </svg>
      )}

      {/* Header */}
      <div
        style={{
          padding: "80px 80px 0 80px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: "0.28em",
            opacity: 0.85,
            fontWeight: 600,
          }}
        >
          {M.label} · {portraitLabel}
        </div>
        <div
          style={{
            fontSize: 24,
            letterSpacing: "0.22em",
            opacity: 0.7,
            marginTop: 8,
            fontWeight: 500,
          }}
        >
          {formatDateUpper(data.date)}
        </div>
        <h1
          style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontWeight: 500,
            fontSize: 88,
            lineHeight: 0.95,
            letterSpacing: "-0.02em",
            margin: "24px 0 12px 0",
            maxWidth: "88%",
          }}
        >
          {data.title}
        </h1>
        <div
          style={{
            fontSize: 26,
            letterSpacing: "0.14em",
            opacity: 0.75,
            fontWeight: 500,
          }}
        >
          {data.location}
        </div>
      </div>

      {/* Profile */}
      <div style={{ flex: 1, position: "relative", marginTop: 40 }}>
        <svg
          aria-hidden="true"
          preserveAspectRatio="none"
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            bottom: 0,
          }}
          viewBox="0 0 1080 700"
        >
          <title>Altitude profile</title>
          <defs>
            <linearGradient id={`${gid}-back`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={M.backStops[0]} />
              <stop offset="100%" stopColor={M.backStops[1]} />
            </linearGradient>
            <linearGradient id={`${gid}-mid`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={M.midStops[0]} />
              <stop offset="100%" stopColor={M.midStops[1]} />
            </linearGradient>
            <linearGradient id={`${gid}-front`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={M.frontStops[0]} />
              <stop offset="100%" stopColor={M.frontStops[1]} />
            </linearGradient>
            <linearGradient id={`${gid}-pace`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={M.paceFill} stopOpacity="0.7" />
              <stop offset="100%" stopColor={M.paceFill} stopOpacity="0" />
            </linearGradient>
          </defs>
          {useElev && data.elevationProfile && (
            <>
              <path
                d={`${elevationPath(
                  data.elevationProfile
                    .filter((_, i) => i % 3 === 0)
                    .map((v) => v * 0.6),
                  1080,
                  320,
                  0,
                  true
                )} Z`}
                fill={`url(#${gid}-back)`}
                transform="translate(0, 280)"
              />
              <path
                d={`${elevationPath(
                  data.elevationProfile
                    .filter((_, i) => i % 2 === 0)
                    .map((v) => v * 0.8),
                  1080,
                  420,
                  0,
                  true
                )} Z`}
                fill={`url(#${gid}-mid)`}
                transform="translate(0, 260)"
              />
              <path
                d={`${elevationPath(data.elevationProfile, 1080, 540, 0, true)} Z`}
                fill={`url(#${gid}-front)`}
                transform="translate(0, 160)"
              />
            </>
          )}
          {usePace && data.paceProfile && (
            <>
              <path
                d={pacePath(data.paceProfile, 1080, 480, 40, true)}
                fill={`url(#${gid}-pace)`}
                transform="translate(0, 180)"
              />
              <path
                d={pacePath(data.paceProfile, 1080, 480, 40)}
                fill="none"
                stroke={M.paceStroke}
                strokeWidth={3}
                transform="translate(0, 180)"
              />
            </>
          )}
          {useLapBars &&
            (() => {
              const bars = data.lapPacesPer100m || [];
              if (bars.length === 0) {
                return null;
              }
              const max = Math.max(...bars);
              const min = Math.min(...bars);
              const dv = max - min || 1;
              const w = (1080 - 160) / bars.length;
              return bars.map((v, i) => {
                const h = 80 + ((v - min) / dv) * 380;
                return (
                  <g key={`alt-bar-${i}-${v}`}>
                    <rect
                      fill={M.swimBar}
                      height={h}
                      opacity={0.55 + ((v - min) / dv) * 0.45}
                      width={w - 4}
                      x={80 + i * w}
                      y={680 - h}
                    />
                  </g>
                );
              });
            })()}
        </svg>

        {useElev && peakInfo && (
          <div
            style={{
              position: "absolute",
              bottom: 280,
              left: 80,
              fontSize: 26,
              letterSpacing: "0.2em",
              opacity: 0.9,
              fontWeight: 600,
              color: M.text,
            }}
          >
            <div
              style={{
                width: 1.5,
                height: 60,
                background: M.text,
                opacity: 0.5,
                marginBottom: 8,
              }}
            />
            <div>PEAK · {peakInfo.max} m</div>
          </div>
        )}
      </div>

      {data.source === "strava" ? (
        <div
          style={{
            position: "absolute",
            top: 28,
            right: 60,
            zIndex: 3,
            opacity: 0.85,
            color: M.text,
          }}
        >
          <StravaAttribution
            variant={M.inkOnStat ? "dark" : "brand"}
            width={120}
          />
        </div>
      ) : null}

      {/* Stat strip at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: M.statBg,
          borderTop: `1px solid ${M.statBorder}`,
          padding: "28px 80px",
          display: "flex",
          justifyContent: "space-between",
          gap: 24,
          color: statText,
        }}
      >
        {statRow.map(([k, v, u]) => (
          <div key={`alt-stat-${k}`}>
            <div
              style={{
                fontSize: 24,
                letterSpacing: "0.24em",
                opacity: 0.7,
                fontWeight: 600,
              }}
            >
              {k}
            </div>
            <div
              style={{
                marginTop: 8,
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: 54,
                fontWeight: 600,
              }}
            >
              {v}
              {u && (
                <span
                  style={{
                    fontSize: 26,
                    opacity: 0.7,
                    marginLeft: 6,
                  }}
                >
                  {u}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
