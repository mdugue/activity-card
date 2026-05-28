// EDITORIAL — typography-led, most restrained. Magazine spread feel.
// Type: Instrument Serif (display) + Geist Mono (small caps)
// Cream paper, soft black, single deep-forest accent

import { routePath } from "@/lib/chart-helpers";
import { PhotoBackdrop } from "./photo-backdrop";
import type { ActivityCardProps } from "./types";

const ACCENT = "#1d3a2e";
const INK = "#1a1816";
const PAPER = "#efe9dc";

interface RowProps {
  k: string;
  v: string | number;
}

function Row({ k, v }: RowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        borderBottom: "1px solid rgba(26,24,22,0.18)",
        padding: "7px 0",
      }}
    >
      <span style={{ opacity: 0.6, letterSpacing: "0.1em" }}>{k}</span>
      <span>{v}</span>
    </div>
  );
}

const MORNING_WORDS = ["quiet", "gentle", "steady", "still", "clear"] as const;

export function ThemeEditorial({ data, photoUrl }: ActivityCardProps) {
  const sport = data.sport;

  const dist =
    sport === "swim"
      ? (data.distance_km * 1000).toFixed(0)
      : data.distance_km.toFixed(1);
  const distUnit = sport === "swim" ? "meters" : "kilometres";

  let paceLabel = `${data.duration} total time`;
  if (sport === "ride") {
    paceLabel = `${data.avg_speed_kmh ?? "—"} km/h average`;
  } else if (sport === "run") {
    paceLabel = `${data.avg_pace_min_per_km ?? "—"} per kilometre`;
  } else if (sport === "swim") {
    paceLabel = `${data.avg_pace_per_100m ?? "—"} per 100 metres`;
  }

  let issueNum = "07";
  if (sport === "ride") {
    issueNum = "04";
  } else if (sport === "run") {
    issueNum = "03";
  } else if (sport === "swim") {
    issueNum = "02";
  }

  let intro = "";
  if (sport === "ride") {
    intro = "A long Saturday in the saddle. ";
  } else if (sport === "run") {
    intro = "A wind-pushed coastal run. ";
  } else if (sport === "swim") {
    intro = "Pre-dawn open-water laps. ";
  } else if (sport === "triathlon") {
    intro = "Three sports, one continuous effort. ";
  }

  const morningWord = MORNING_WORDS[data.date.length % MORNING_WORDS.length];

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        background: PAPER,
        color: INK,
        fontFamily: "var(--font-geist-mono), monospace",
        padding: "110px 110px 90px 110px",
        boxSizing: "border-box",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {photoUrl ? (
        <PhotoBackdrop photoUrl={photoUrl} treatment="editorial" />
      ) : null}
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
        {/* Top eyebrow */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 26,
            letterSpacing: "0.32em",
            opacity: 0.75,
            fontWeight: 500,
          }}
        >
          <span>EFFORT · ISSUE №{issueNum}</span>
          <span>{data.date.toUpperCase()}</span>
        </div>

        {/* Massive distance numeral as the visual anchor */}
        <div style={{ marginTop: 96, position: "relative" }}>
          <div
            style={{
              fontFamily: "var(--font-instrument-serif), serif",
              fontSize: 320,
              lineHeight: 0.85,
              letterSpacing: "-0.04em",
              fontWeight: 400,
              fontStyle: "italic",
              color: INK,
            }}
          >
            {dist}
          </div>
          <div
            style={{
              fontFamily: "var(--font-instrument-serif), serif",
              fontSize: 52,
              fontStyle: "italic",
              marginTop: 14,
              color: ACCENT,
            }}
          >
            {distUnit}, and then —
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            marginTop: 70,
            display: "grid",
            gridTemplateColumns: "1.2fr 0.9fr",
            gap: 56,
            flex: 1,
            minHeight: 0,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 24,
                letterSpacing: "0.28em",
                opacity: 0.7,
                marginBottom: 20,
                fontWeight: 600,
              }}
            >
              THE EFFORT
            </div>
            <h2
              style={{
                fontFamily: "var(--font-instrument-serif), serif",
                fontSize: 76,
                lineHeight: 1,
                letterSpacing: "-0.015em",
                fontWeight: 400,
                margin: 0,
                textWrap: "pretty",
              }}
            >
              {data.ride_name}.
            </h2>
            <div
              style={{
                marginTop: 40,
                fontSize: 24,
                lineHeight: 1.55,
                opacity: 0.8,
                maxWidth: 460,
              }}
            >
              {intro}
              Recorded in {data.location.split(",")[0]}, on a {morningWord}{" "}
              morning. {paceLabel}.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            {/* Tiny route */}
            <div>
              <div
                style={{
                  fontSize: 24,
                  letterSpacing: "0.28em",
                  opacity: 0.7,
                  fontWeight: 600,
                }}
              >
                THE LINE
              </div>
              <svg
                aria-hidden="true"
                style={{ width: "100%", height: 180, marginTop: 10 }}
                viewBox="0 0 280 200"
              >
                <title>Route silhouette</title>
                {sport === "swim" ? (
                  Array.from({ length: 5 }, (_, i) => (
                    <line
                      key={`lane-${i}`}
                      opacity={0.5 + i * 0.1}
                      stroke={ACCENT}
                      strokeDasharray="2 8"
                      strokeWidth={1.4}
                      x1={20}
                      x2={260}
                      y1={40 + i * 28}
                      y2={40 + i * 28}
                    />
                  ))
                ) : (
                  <path
                    d={routePath(data.route_coordinates, 280, 200, 16)}
                    fill="none"
                    stroke={ACCENT}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                )}
              </svg>
            </div>

            {/* Metadata table */}
            <div style={{ fontSize: 24, lineHeight: 1.8 }}>
              <div
                style={{
                  fontSize: 24,
                  letterSpacing: "0.28em",
                  opacity: 0.7,
                  marginBottom: 20,
                  fontWeight: 600,
                }}
              >
                THE FIGURES
              </div>
              <Row k="Date" v={data.date} />
              <Row k="Place" v={data.location} />
              <Row k="Time" v={data.duration} />
              {sport === "ride" && (
                <Row k="Elevation" v={`${data.elevation_gain_m ?? "—"} m`} />
              )}
              {sport === "ride" && (
                <Row k="Speed" v={`${data.avg_speed_kmh ?? "—"} km/h`} />
              )}
              {sport === "run" && (
                <Row k="Pace" v={`${data.avg_pace_min_per_km ?? "—"} /km`} />
              )}
              {sport === "run" && (
                <Row k="Cadence" v={`${data.avg_cadence ?? "—"} spm`} />
              )}
              {sport === "swim" && (
                <Row k="/100 m" v={data.avg_pace_per_100m ?? "—"} />
              )}
              {sport === "swim" && <Row k="SWOLF" v={data.swolf ?? "—"} />}
              {data.avg_heart_rate && (
                <Row k="Heart" v={`${data.avg_heart_rate} bpm`} />
              )}
              {data.athlete_name && <Row k="By" v={data.athlete_name} />}
            </div>
          </div>
        </div>

        {/* Foot */}
        <div
          style={{
            marginTop: 50,
            paddingTop: 26,
            borderTop: `1px solid ${INK}`,
            opacity: 0.85,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 24,
            letterSpacing: "0.28em",
            fontWeight: 600,
          }}
        >
          <span>— FIN —</span>
          <span style={{ color: ACCENT }}>EFFORT · PRINTED MMXXVI</span>
        </div>
      </div>
    </div>
  );
}
