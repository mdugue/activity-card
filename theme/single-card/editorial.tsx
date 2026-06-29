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
  isNum,
} from "@/lib/format";
import {
  isMultiActivity,
  type SegmentRoute,
  segmentRoutes,
} from "@/lib/multi-activity";
import { defineTheme, type ThemeProps } from "@/theme/core/theme-contract";
import { SafeArea, useFormat } from "../shared/format-context";
import { OverlayRoute } from "../shared/overlay-route";
import { PhotoBackdrop } from "../shared/photo-backdrop";

// No `elevationViz`/`splits`: Editorial never draws the profile chart or split
// tables, so the editor won't offer their toggles here. The sport-aware
// refinements mirror the figures table exactly (see the `Row`s below).
const USES = [
  "athleteName",
  "cadence",
  "date",
  "distance",
  "elevation",
  "heartRate",
  "location",
  "pace",
  "photo",
  "route",
  "speed",
  "time",
  "title",
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
        // Two tracks (key auto · value 1fr, right-aligned) instead of a
        // space-between flex: in a narrow 2-up landscape column the value wraps
        // WITHIN its own track instead of colliding with the key.
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        columnGap: 16,
        alignItems: "baseline",
        borderBottom: "1px solid rgba(26,24,22,0.18)",
        // Fluid row height: compresses on a short canvas so the full figures
        // table clears the foot. cqb resolves to the card (container-type:size).
        padding: "clamp(2px, 0.7cqb, 7px) 0",
      }}
    >
      <span style={{ opacity: 0.6, letterSpacing: "0.1em" }}>{k}</span>
      <span
        style={{ textAlign: "right", minWidth: 0, wordBreak: "break-word" }}
      >
        {v}
      </span>
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

  let dist = "";
  if (isNum(data.distanceKm)) {
    dist =
      sport === "swim"
        ? (data.distanceKm * 1000).toFixed(0)
        : data.distanceKm.toFixed(1);
  }
  const distUnit = sport === "swim" ? "meters" : "kilometres";

  // The closing sentence quotes the sport's signature metric, but only when the
  // activity carries it (and it isn't toggled off) — otherwise it falls back to
  // total time rather than printing a dash.
  let paceLabel = `${formatDuration(data.durationSec)} total time`;
  if (sport === "ride" && isNum(data.avgSpeedKmh)) {
    paceLabel = `${formatNumber(data.avgSpeedKmh, 1)} km/h average`;
  } else if (sport === "run" && isNum(data.avgPaceMinPerKm)) {
    paceLabel = `${formatPaceMin(data.avgPaceMinPerKm)} per kilometre`;
  } else if (sport === "swim" && isNum(data.avgPacePer100m)) {
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
        // The card itself is the named query container (`card`): the giant
        // numeral and the headings size against its width (cqi, narrow in a 2-up
        // landscape spread) and height (cqb, short in landscape/square), and the
        // A|B grid's `@container card` width breakpoint keys on it to go 2-up at
        // x-landscape — no per-aspect branch, the layout just reflows.
        containerType: "size",
        containerName: "card",
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
        {/* One self-reflowing grid, ONE markup: region A (numeral block) and
            region B (the body) STACK at 4:5 / 1:1 / 9:16 and sit 2-up side-by-side
            at x-landscape. The column count is an explicit container breakpoint —
            `@min-[1400px]/card:grid-cols-2` = "go 2-up once the card is wider than
            1400px" — which only the 1600px landscape canvas crosses; every other
            format is 1080px wide and stays stacked. `auto-rows-auto` (not
            `minmax(0,…)`/`fr`) so stacked rows take their content height and never
            overlap; the per-element clamps keep that height in budget on short
            canvases. */}
        <div
          className="grid flex-1 auto-rows-auto @min-[1400px]/card:grid-cols-2 grid-cols-1 content-start"
          style={{
            minHeight: 0,
            gap: "clamp(14px, 3cqi, 64px)",
          }}
        >
          {/* Region A — eyebrow + the massive distance numeral + subtitle */}
          <div style={{ minWidth: 0 }}>
            {/* Top eyebrow */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                // Size by the card HEIGHT (cqb), not width: in landscape the card
                // is short — the signal that region A is also narrow — so the
                // eyebrow shrinks just enough to sit on one line. Feed/story stay
                // 26px (cqb hits the cap). nowrap stops mid-token breaks.
                fontSize: "clamp(18px, 2.4cqb, 26px)",
                letterSpacing: "0.32em",
                opacity: 0.75,
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              <span>EFFORT · ISSUE №{issueNum}</span>
              <span>{formatDateUpper(data.date)}</span>
            </div>

            {/* Massive distance numeral as the visual anchor */}
            <div
              style={{
                marginTop: "clamp(16px, 3cqb, 96px)",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-instrument-serif), serif",
                  // Clamp HARD: full 320 on the roomy feed master, shrinking
                  // with the card's width (2-up landscape column) or height
                  // (short square / landscape canvas).
                  fontSize: "clamp(110px, min(34cqi, 18cqb), 320px)",
                  lineHeight: 0.85,
                  letterSpacing: "-0.04em",
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: INK,
                }}
              >
                {isNum(data.distanceKm) ? dist : "—"}
              </div>
              {isNum(data.distanceKm) ? (
                <div
                  style={{
                    fontFamily: "var(--font-instrument-serif), serif",
                    fontSize: "clamp(28px, min(6cqi, 7cqb), 52px)",
                    fontStyle: "italic",
                    marginTop: 14,
                    color: accent,
                  }}
                >
                  {distUnit}, and then —
                </div>
              ) : null}
            </div>
          </div>

          {/* Region B — THE EFFORT text · THE LINE route · THE FIGURES table */}
          <div
            style={{
              minWidth: 0,
              minHeight: 0,
              display: "grid",
              // The editorial 1.2/0.9 asymmetry kept; minmax(0,…) lets both
              // columns shrink below their content so a narrow region-B (the
              // 2-up landscape spread) compresses instead of overflowing.
              gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 0.9fr)",
              gap: "clamp(24px, 3cqi, 56px)",
              alignContent: "start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "clamp(18px, 2.2cqi, 24px)",
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
                  fontSize: "clamp(40px, min(8cqi, 12cqb), 76px)",
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
                  marginTop: "clamp(20px, 4cqb, 40px)",
                  fontSize: "clamp(18px, 2.2cqi, 24px)",
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
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                gap: "clamp(10px, 2.5cqb, 40px)",
              }}
            >
              {/* Tiny route */}
              <div style={{ minHeight: 0 }}>
                <div
                  style={{
                    fontSize: "clamp(18px, 2.2cqi, 24px)",
                    letterSpacing: "0.28em",
                    opacity: 0.7,
                    fontWeight: 600,
                  }}
                >
                  THE LINE
                </div>
                <svg
                  aria-hidden="true"
                  // Fluid height: tall on the roomy master, shrinking on a
                  // short landscape/square canvas so the figures table below it
                  // still clears the foot.
                  style={{
                    width: "100%",
                    height: "clamp(50px, 7cqb, 180px)",
                    marginTop: 10,
                    display: "block",
                  }}
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
              <div
                style={{
                  fontSize: "clamp(16px, min(2cqi, 2.6cqb), 24px)",
                  // Fluid leading in px: tight on a short canvas, airy on the
                  // tall feed master (clamp/cqb resolve to px before capture).
                  lineHeight: "clamp(20px, 2.5cqb, 44px)",
                  minHeight: 0,
                }}
              >
                <div
                  style={{
                    fontSize: "clamp(18px, 2.2cqi, 24px)",
                    letterSpacing: "0.28em",
                    opacity: 0.7,
                    marginBottom: "clamp(4px, 1.3cqb, 20px)",
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
                {sport === "ride" && isNum(data.elevationGainM) && (
                  <Row
                    k="Elevation"
                    v={`${formatNumber(data.elevationGainM)} m`}
                  />
                )}
                {sport === "ride" && isNum(data.avgSpeedKmh) && (
                  <Row
                    k="Speed"
                    v={`${formatNumber(data.avgSpeedKmh, 1)} km/h`}
                  />
                )}
                {sport === "run" && isNum(data.avgPaceMinPerKm) && (
                  <Row
                    k="Pace"
                    v={`${formatPaceMin(data.avgPaceMinPerKm)} /km`}
                  />
                )}
                {sport === "run" && isNum(data.avgCadence) && (
                  <Row k="Cadence" v={`${formatNumber(data.avgCadence)} spm`} />
                )}
                {sport === "swim" && isNum(data.avgPacePer100m) && (
                  <Row k="/100 m" v={formatPaceSec(data.avgPacePer100m)} />
                )}
                {sport === "swim" && isNum(data.swolf) && (
                  <Row k="SWOLF" v={formatNumber(data.swolf)} />
                )}
                {isNum(data.avgHeartRate) && (
                  <Row k="Heart" v={`${data.avgHeartRate} bpm`} />
                )}
                {data.athleteName && <Row k="By" v={data.athleteName} />}
              </div>
            </div>
          </div>
          {/* end region B */}
        </div>
        {/* end reflow grid */}

        {/* Foot */}
        <div
          style={{
            marginTop: "clamp(20px, 3cqb, 50px)",
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
