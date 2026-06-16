// EDITORIAL — typography-led, most restrained. Magazine spread feel.
// Type: Instrument Serif (display) + Geist Mono (small caps)
// Cream paper, soft black, single deep-forest accent

import type { Coord } from "@/lib/activity";
import { accentShades, routePath } from "@/lib/chart-helpers";
import {
  formatDate,
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

// No `elevationViz`/`splits`: Editorial never draws the profile chart or split
// tables, so the editor won't offer their toggles here. The sport-aware
// refinements mirror the figures table exactly (see the `Row`s below).
const USES = [
  "athleteName",
  "cadence",
  "elevation",
  "heartRate",
  "location",
  "pace",
  "route",
  "speed",
] as const;

const DEFAULT_ACCENT = "#1d3a2e";
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

// "THE LINE" glyph: pool lanes for a swim, every leg overlaid for a project,
// otherwise a single silhouette — all in the deep-forest accent.
function EditorialRoute({
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
      <>
        {Array.from({ length: 5 }, (_, i) => (
          <line
            key={`lane-${i}`}
            opacity={0.5 + i * 0.1}
            stroke={accent}
            strokeDasharray="2 8"
            strokeWidth={1.4}
            x1={20}
            x2={260}
            y1={40 + i * 28}
            y2={40 + i * 28}
          />
        ))}
      </>
    );
  }
  if (multi) {
    return (
      <OverlayRoute
        colors={accentShades(accent, routes.length)}
        h={200}
        pad={16}
        routes={routes.map((r) => r.coords)}
        strokeWidth={2}
        w={280}
      />
    );
  }
  return (
    <path
      d={routePath(coords, 280, 200, 16)}
      fill="none"
      stroke={accent}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    />
  );
}

export function ThemeEditorial({
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

  const dist =
    sport === "swim"
      ? (data.distanceKm * 1000).toFixed(0)
      : data.distanceKm.toFixed(1);
  const distUnit = sport === "swim" ? "meters" : "kilometres";

  // The closing sentence quotes the sport's signature metric, but only when the
  // activity carries it (and it isn't toggled off) — otherwise it falls back to
  // total time rather than printing a dash.
  const has = (n: number | undefined): n is number =>
    n !== undefined && Number.isFinite(n);
  let paceLabel = `${formatDuration(data.durationSec)} total time`;
  if (sport === "ride" && has(data.avgSpeedKmh)) {
    paceLabel = `${formatNumber(data.avgSpeedKmh, 1)} km/h average`;
  } else if (sport === "run" && has(data.avgPaceMinPerKm)) {
    paceLabel = `${formatPaceMin(data.avgPaceMinPerKm)} per kilometre`;
  } else if (sport === "swim" && has(data.avgPacePer100m)) {
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
        width,
        height,
        background: PAPER,
        color: INK,
        fontFamily: "var(--font-geist-mono), monospace",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {photoUrl ? (
        <PhotoBackdrop
          imageTransform={imageTransform}
          photoUrl={photoUrl}
          treatment="editorial"
        />
      ) : null}
      {/* Content sits above the backdrop layer, inset by the safe area. */}
      <SafeArea
        pad={{ top: 110, right: 110, bottom: 90, left: 110 }}
        style={{ flex: 1, zIndex: 1 }}
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
              color: accent,
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
              {data.location
                ? `Recorded in ${data.location.split(",")[0]}, on a ${morningWord} morning.`
                : `Recorded on a ${morningWord} morning.`}{" "}
              {paceLabel}.
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
                <EditorialRoute
                  accent={accent}
                  coords={data.routeCoordinates}
                  multi={multi}
                  routes={routes}
                  sport={sport}
                />
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
              {/* Every row gates on its datum: a field the file lacks (or the
                  user toggled off) drops the whole row, never a dashed value. */}
              {data.date ? <Row k="Date" v={friendlyDate} /> : null}
              {data.location ? <Row k="Place" v={data.location} /> : null}
              <Row k="Time" v={formatDuration(data.durationSec)} />
              {sport === "ride" && has(data.elevationGainM) && (
                <Row
                  k="Elevation"
                  v={`${formatNumber(data.elevationGainM)} m`}
                />
              )}
              {sport === "ride" && has(data.avgSpeedKmh) && (
                <Row
                  k="Speed"
                  v={`${formatNumber(data.avgSpeedKmh, 1)} km/h`}
                />
              )}
              {sport === "run" && has(data.avgPaceMinPerKm) && (
                <Row
                  k="Pace"
                  v={`${formatPaceMin(data.avgPaceMinPerKm)} /km`}
                />
              )}
              {sport === "run" && has(data.avgCadence) && (
                <Row k="Cadence" v={`${formatNumber(data.avgCadence)} spm`} />
              )}
              {sport === "swim" && has(data.avgPacePer100m) && (
                <Row k="/100 m" v={formatPaceSec(data.avgPacePer100m)} />
              )}
              {sport === "swim" && has(data.swolf) && (
                <Row k="SWOLF" v={formatNumber(data.swolf)} />
              )}
              {has(data.avgHeartRate) && (
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
          <span style={{ color: accent }}>EFFORT · PRINTED MMXXVI</span>
        </div>
      </SafeArea>
    </div>
  );
}

export const editorialTheme = defineTheme({
  id: "editorial",
  label: "EDITORIAL",
  tagline: "typography led",
  uses: USES,
  usesWhen: {
    // The figures table is sport-specific: elevation + speed rows are ride-only,
    // cadence is run-only, pace appears for runs and swims.
    cadence: (d) => d.sport === "run",
    elevation: (d) => d.sport === "ride",
    pace: (d) => d.sport === "run" || d.sport === "swim",
    speed: (d) => d.sport === "ride",
  },
  colors: { default: { primary: DEFAULT_ACCENT }, userAdjustable: true },
  photo: { defaultOn: true },
  Component: ThemeEditorial,
});
