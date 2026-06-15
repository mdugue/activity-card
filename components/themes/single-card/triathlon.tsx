// TRIATHLON / MULTI-SPORT — three sports as one coherent piece.
// Type: Bricolage Grotesque (display) + IBM Plex Mono (data)
// Three vertical bands w/ shared identity; transitions as design beats.

import type { TriSegment } from "@/lib/activity";
import { elevationPath, routePath } from "@/lib/chart-helpers";
import {
  formatClock,
  formatDateUpper,
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";
import { defineTheme, type ThemeProps } from "@/lib/theme-contract";
import { PhotoUnderlay } from "../shared/photo-underlay";

// The bands render per-segment data (`segments`/`transitions` — core fields,
// not capabilities), so only the identity overlays are declared here.
const USES = ["athleteName", "location"] as const;

const INK = "#11151a";
const PAPER = "#ffffff";

interface StatProps {
  label: string;
  v: string | number;
}

function Stat({ label, v }: StatProps) {
  return (
    <div>
      <div
        style={{
          fontSize: 22,
          letterSpacing: "0.22em",
          opacity: 0.7,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-bricolage), sans-serif",
          fontWeight: 700,
          fontSize: 38,
          lineHeight: 1,
          marginTop: 6,
        }}
      >
        {v}
      </div>
    </div>
  );
}

type TriSport = TriSegment["sport"];

function accentFor(s: TriSport): string {
  if (s === "swim") {
    return "#1e6fa0";
  }
  if (s === "bike") {
    return "#c2410c";
  }
  return "#15803d";
}

function labelFor(s: TriSport): string {
  if (s === "swim") {
    return "SWIM";
  }
  if (s === "bike") {
    return "BIKE";
  }
  return "RUN";
}

function heroFor(seg: TriSegment): string {
  if (seg.sport === "swim") {
    return `${formatPaceSec(seg.avgPacePer100m)} /100m`;
  }
  if (seg.sport === "bike") {
    return `${formatNumber(seg.avgSpeedKmh, 1)} km/h`;
  }
  return `${formatPaceMin(seg.avgPaceMinPerKm)} /km`;
}

export function ThemeTriathlon({
  data,
  photoUrl,
  imageTransform,
}: ThemeProps<(typeof USES)[number]>) {
  const sports = data.segments || [];
  const transitions = data.transitions || [];

  if (data.sport !== "triathlon" || sports.length === 0) {
    return (
      <div
        style={{
          width: 1080,
          height: 1350,
          background: PAPER,
          color: INK,
          fontFamily: "var(--font-ibm-plex-mono), monospace",
          padding: "120px 90px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: "0.3em",
            opacity: 0.5,
            marginBottom: 28,
            fontWeight: 600,
          }}
        >
          TRIATHLON / MULTI-SPORT THEME
        </div>
        <div
          style={{
            fontFamily: "var(--font-bricolage), sans-serif",
            fontWeight: 600,
            fontSize: 56,
            lineHeight: 1.1,
            maxWidth: 700,
          }}
        >
          Single-sport activity.
          <br />
          <span style={{ opacity: 0.4 }}>
            Switch to a multi-sport file to see this theme.
          </span>
        </div>
      </div>
    );
  }

  // Alternating segments + transitions, widths proportional to duration.
  type TimelineItem =
    | { kind: "seg"; seg: TriSegment }
    | { kind: "t"; t: { name: string; durationSec: number } };

  const items: TimelineItem[] = [];
  sports.forEach((seg, i) => {
    items.push({ kind: "seg", seg });
    if (transitions[i]) {
      items.push({ kind: "t", t: transitions[i] });
    }
  });
  const totals = items.map((it) =>
    it.kind === "seg" ? it.seg.durationSec : it.t.durationSec
  );
  const sum = totals.reduce((a, b) => a + b, 0) || 1;

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        background: PAPER,
        color: INK,
        fontFamily: "var(--font-ibm-plex-mono), monospace",
        position: "relative",
        // Stacking context so the z-index:-1 photo underlay paints above the
        // solid background (not behind it) and below the content.
        isolation: "isolate",
        padding: "70px 70px 50px 70px",
        boxSizing: "border-box",
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
          paddingBottom: 22,
          borderBottom: `2px solid ${INK}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 24,
              letterSpacing: "0.3em",
              opacity: 0.75,
              fontWeight: 600,
            }}
          >
            TRIATHLON · MULTI-SPORT
          </div>
          <h1
            style={{
              fontFamily: "var(--font-bricolage), sans-serif",
              fontSize: 72,
              lineHeight: 0.95,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              margin: "10px 0 0 0",
              maxWidth: 700,
              textWrap: "pretty",
            }}
          >
            {data.title}
          </h1>
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: 24,
            letterSpacing: "0.18em",
            lineHeight: 1.5,
            fontWeight: 600,
          }}
        >
          <div>{formatDateUpper(data.date)}</div>
          <div style={{ opacity: 0.7 }}>{data.location.toUpperCase()}</div>
          <div
            style={{
              marginTop: 12,
              fontFamily: "var(--font-bricolage), sans-serif",
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            {formatDuration(data.durationSec)}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22, marginBottom: 22 }}>
        <div
          style={{
            fontSize: 24,
            letterSpacing: "0.28em",
            opacity: 0.7,
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          EFFORT TIMELINE
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            height: 56,
            border: `1px solid ${INK}`,
          }}
        >
          {items.map((it, i) => {
            const flex = totals[i] / sum;
            const isSeg = it.kind === "seg";
            const bg = isSeg ? accentFor(it.seg.sport) : "#11151a";
            const label = isSeg
              ? `${labelFor(it.seg.sport)} · ${formatClock(it.seg.durationSec)}`
              : `${it.t.name} ${formatClock(it.t.durationSec)}`;
            return (
              <div
                key={`tl-${i}-${label}`}
                style={{
                  flex,
                  background: bg,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  letterSpacing: "0.18em",
                  fontWeight: 700,
                  borderRight:
                    i < items.length - 1
                      ? "1px solid rgba(255,255,255,0.4)"
                      : "none",
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          minHeight: 0,
        }}
      >
        {sports.map((seg, idx) => {
          const accent = accentFor(seg.sport);
          return (
            <div
              key={`seg-${idx}-${seg.sport}`}
              style={{
                flex: 1,
                position: "relative",
                border: `1px solid ${INK}`,
                background: "#ffffff",
                padding: "18px 22px",
                display: "grid",
                gridTemplateColumns: "0.55fr 1fr 0.5fr",
                gap: 18,
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: -1,
                  left: -1,
                  width: 84,
                  height: 48,
                  background: accent,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-bricolage), sans-serif",
                  fontWeight: 700,
                  fontSize: 26,
                  letterSpacing: "0.1em",
                }}
              >
                0{idx + 1}
              </div>

              <div
                style={{
                  paddingTop: 38,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 24,
                      letterSpacing: "0.3em",
                      color: accent,
                      fontWeight: 700,
                    }}
                  >
                    {labelFor(seg.sport)}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-bricolage), sans-serif",
                      fontWeight: 700,
                      fontSize: 80,
                      lineHeight: 0.95,
                      letterSpacing: "-0.02em",
                      marginTop: 10,
                    }}
                  >
                    {seg.distanceKm}
                    <span
                      style={{
                        fontSize: 30,
                        opacity: 0.55,
                        marginLeft: 6,
                      }}
                    >
                      km
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      opacity: 0.8,
                      marginTop: 10,
                      letterSpacing: "0.06em",
                      fontWeight: 600,
                    }}
                  >
                    {formatClock(seg.durationSec)}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 22,
                    letterSpacing: "0.24em",
                    opacity: 0.7,
                    fontWeight: 600,
                  }}
                >
                  HERO · {heroFor(seg)}
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                <svg
                  aria-hidden="true"
                  preserveAspectRatio="none"
                  style={{ width: "100%", height: "100%" }}
                  viewBox="0 0 360 160"
                >
                  <title>{labelFor(seg.sport)} trace</title>
                  {seg.sport === "bike" && seg.elevationProfile && (
                    <>
                      <path
                        d={elevationPath(
                          seg.elevationProfile,
                          360,
                          160,
                          0,
                          true
                        )}
                        fill={accent}
                        fillOpacity={0.85}
                      />
                      <path
                        d={elevationPath(seg.elevationProfile, 360, 160, 0)}
                        fill="none"
                        stroke={INK}
                        strokeWidth={1}
                      />
                    </>
                  )}
                  {seg.sport === "swim" && (
                    <g>
                      {Array.from({ length: 4 }, (_, i) => (
                        <path
                          d={`M0 ${30 + i * 30} Q90 ${30 + i * 30 - 14}, 180 ${30 + i * 30} T360 ${30 + i * 30}`}
                          fill="none"
                          key={`swim-wave-${i}`}
                          opacity={0.55 + i * 0.12}
                          stroke={accent}
                          strokeWidth={2}
                        />
                      ))}
                    </g>
                  )}
                  {seg.sport === "run" && (
                    <path
                      d={routePath(seg.routeCoordinates, 360, 160, 8)}
                      fill="none"
                      stroke={accent}
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                    />
                  )}
                  {seg.sport === "bike" && !seg.elevationProfile && (
                    <path
                      d={routePath(seg.routeCoordinates, 360, 160, 8)}
                      fill="none"
                      stroke={accent}
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                    />
                  )}
                </svg>
              </div>

              <div
                style={{
                  borderLeft: "1px solid rgba(17,21,26,0.2)",
                  paddingLeft: 18,
                  paddingTop: 32,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {seg.sport === "bike" && (
                  <>
                    <Stat label="ELEV" v={`${seg.elevationGainM ?? 0} m`} />
                    <Stat
                      label="AVG"
                      v={`${formatNumber(seg.avgSpeedKmh, 1)} km/h`}
                    />
                  </>
                )}
                {seg.sport === "swim" && (
                  <>
                    <Stat label="/100m" v={formatPaceSec(seg.avgPacePer100m)} />
                    <Stat label="STROKE" v="freestyle" />
                  </>
                )}
                {seg.sport === "run" && (
                  <>
                    <Stat
                      label="PACE"
                      v={`${formatPaceMin(seg.avgPaceMinPerKm)} /km`}
                    />
                    <Stat label="ELEV" v={`${seg.elevationGainM ?? 0} m`} />
                  </>
                )}
              </div>

              {idx < sports.length - 1 && transitions[idx] && (
                <div
                  style={{
                    position: "absolute",
                    bottom: -16,
                    right: 24,
                    background: INK,
                    color: PAPER,
                    padding: "8px 16px",
                    fontSize: 22,
                    letterSpacing: "0.2em",
                    fontWeight: 700,
                    zIndex: 2,
                  }}
                >
                  {transitions[idx].name} →{" "}
                  {formatClock(transitions[idx].durationSec)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 22,
          paddingTop: 18,
          borderTop: "1px solid rgba(17,21,26,0.4)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 24,
          letterSpacing: "0.24em",
          opacity: 0.75,
          fontWeight: 600,
        }}
      >
        <span>EFFORT · TRIATHLON CARD</span>
        <span>{data.athleteName ? data.athleteName.toUpperCase() : ""}</span>
      </div>
    </div>
  );
}

export const triathlonTheme = defineTheme({
  id: "triathlon",
  label: "TRIATHLON",
  tagline: "multi-sport",
  uses: USES,
  // Fixed: the per-discipline swim/bike/run colour identity IS the theme.
  colors: { default: { primary: "#11151a" }, userAdjustable: false },
  // Poster: stays opaque; the frame mattes its white bg into the bands.
  frame: { backdrop: "#ffffff" },
  photo: { defaultOn: false },
  Component: ThemeTriathlon,
});
