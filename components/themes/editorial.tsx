// EDITORIAL — typography-led, most restrained. Magazine spread feel.
// Type: Instrument Serif (display) + Geist Mono (small caps)
// Cream paper, soft black, single deep-forest accent

import { routePath } from "@/lib/chart-helpers";
import {
  formatDate,
  formatDateUpper,
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";
import { PhotoBackdrop } from "./photo-backdrop";
import type { ActivityCardProps } from "./types";

const ACCENT = "#1d3a2e";
const INK = "#1a1816";
// Soft warm paper — a gentle, low-chroma off-white so the editorial layout
// reads as printed on a sheet, lifted off the lighter page. Much cleaner than
// the original cream; see the white-canvas siblings (path/data/triathlon).
const PAPER = "#f9f4ee";

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
      ? (data.distanceKm * 1000).toFixed(0)
      : data.distanceKm.toFixed(1);
  const distUnit = sport === "swim" ? "meters" : "kilometres";

  let paceLabel = `${formatDuration(data.durationSec)} total time`;
  if (sport === "ride") {
    paceLabel = `${formatNumber(data.avgSpeedKmh, 1)} km/h average`;
  } else if (sport === "run") {
    paceLabel = `${formatPaceMin(data.avgPaceMinPerKm)} per kilometre`;
  } else if (sport === "swim") {
    paceLabel = `${formatPaceSec(data.avgPacePer100m)} per 100 metres`;
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
  const friendlyDate = formatDate(data.date);

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
          <span>{formatDateUpper(data.date)}</span>
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
              {data.title}.
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
                    d={routePath(data.routeCoordinates, 280, 200, 16)}
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
              <Row k="Date" v={friendlyDate} />
              <Row k="Place" v={data.location} />
              <Row k="Time" v={formatDuration(data.durationSec)} />
              {sport === "ride" && (
                <Row
                  k="Elevation"
                  v={`${formatNumber(data.elevationGainM)} m`}
                />
              )}
              {sport === "ride" && (
                <Row
                  k="Speed"
                  v={`${formatNumber(data.avgSpeedKmh, 1)} km/h`}
                />
              )}
              {sport === "run" && (
                <Row
                  k="Pace"
                  v={`${formatPaceMin(data.avgPaceMinPerKm)} /km`}
                />
              )}
              {sport === "run" && (
                <Row k="Cadence" v={`${formatNumber(data.avgCadence)} spm`} />
              )}
              {sport === "swim" && (
                <Row k="/100 m" v={formatPaceSec(data.avgPacePer100m)} />
              )}
              {sport === "swim" && (
                <Row k="SWOLF" v={formatNumber(data.swolf)} />
              )}
              {data.avgHeartRate && (
                <Row k="Heart" v={`${data.avgHeartRate} bpm`} />
              )}
              {data.athleteName && <Row k="By" v={data.athleteName} />}
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
            alignItems: "center",
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
