// TRIATHLON / MULTI-SPORT — three sports as one coherent piece.
// Type: Bricolage Grotesque (display) + IBM Plex Mono (data)
// Three vertical bands w/ shared identity; transitions as design beats.

import type { CSSProperties } from "react";

import type { Transition, TriSegment } from "@/lib/activity";
import { elevationPath, routePath } from "@/lib/chart-helpers";
import {
  formatClock,
  formatDateUpper,
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";
import type { ThemeProps } from "@/theme/core/theme-contract";

import { SafeArea, useFormat } from "../shared/format-context";
import { hasText } from "../shared/has-text";
import { PhotoUnderlay } from "../shared/photo-underlay";
import type { TriathlonCapability } from "./triathlon.theme";

// The bands render per-segment data (`segments`/`transitions` — core fields,
// not capabilities), so only the identity overlays are declared here.

const INK = "#11151a";
const PAPER = "#ffffff";
const DISPLAY = "var(--font-bricolage), sans-serif";
const MONO = "var(--font-ibm-plex-mono), monospace";
const SPACE_BETWEEN = "space-between";
// The leg card's small label rows: full size on a roomy card, shrinking with its
// height (cqb → the card's size container) on a short square card.
const LEG_LABEL_SIZE = "clamp(17px, 10cqb, 24px)";

type TriathlonActivity = ThemeProps<TriathlonCapability>["data"];

const STAT_VALUE_STYLE = {
  fontFamily: DISPLAY,
  // Fluid against BOTH the stat column's width (cqi → the parent's
  // container-type:inline-size: shrinks in a narrow 3-up landscape
  // column so `920 m` stays one line) AND the card's height (cqb → the
  // card's container-type:size: shrinks in a short square card so the
  // two-stat swim column doesn't overflow).
  fontSize: "clamp(20px, min(22cqi, 18cqb), 38px)",
  fontWeight: 700,
  lineHeight: 1,
  marginTop: 6,
} satisfies CSSProperties;

interface StatProps {
  label: string;
  v: string | number;
}

const Stat = ({ label, v }: StatProps) => (
  <div>
    <div
      style={{
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: "0.22em",
        opacity: 0.7,
      }}
    >
      {label}
    </div>
    <div style={STAT_VALUE_STYLE}>{v}</div>
  </div>
);

type TriSport = TriSegment["sport"];

const accentFor = (s: TriSport): string => {
  if (s === "swim") {
    return "#1e6fa0";
  }
  if (s === "bike") {
    return "#c2410c";
  }
  return "#15803d";
};

const labelFor = (s: TriSport): string => {
  if (s === "swim") {
    return "SWIM";
  }
  if (s === "bike") {
    return "BIKE";
  }
  return "RUN";
};

const heroFor = (seg: TriSegment): string => {
  if (seg.sport === "swim") {
    return `${formatPaceSec(seg.avgPacePer100m)} /100m`;
  }
  if (seg.sport === "bike") {
    return `${formatNumber(seg.avgSpeedKmh, 1)} km/h`;
  }
  return `${formatPaceMin(seg.avgPaceMinPerKm)} /km`;
};

const PLAIN_ROOT_STYLE = {
  background: PAPER,
  color: INK,
  fontFamily: MONO,
  overflow: "hidden",
  position: "relative",
} satisfies CSSProperties;

// Shown for a single-sport activity: this theme needs segments to draw.
const SingleSportNotice = ({
  height,
  width,
}: {
  height: number;
  width: number;
}) => (
  <div style={{ ...PLAIN_ROOT_STYLE, height, width }}>
    <SafeArea
      anchor="center"
      pad={{ bottom: 120, left: 90, right: 90, top: 120 }}
      style={{ alignItems: "center", textAlign: "center" }}
    >
      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          letterSpacing: "0.3em",
          marginBottom: 28,
          opacity: 0.5,
        }}
      >
        TRIATHLON / MULTI-SPORT THEME
      </div>
      <div
        style={{
          fontFamily: DISPLAY,
          fontSize: 56,
          fontWeight: 600,
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
    </SafeArea>
  </div>
);

const TITLE_STYLE = {
  fontFamily: DISPLAY,
  fontSize: 72,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  lineHeight: 0.95,
  margin: "10px 0 0 0",
  maxWidth: 700,
  textWrap: "pretty",
} satisfies CSSProperties;

const Header = ({ data }: { data: TriathlonActivity }) => (
  <div
    style={{
      alignItems: "flex-end",
      borderBottom: `2px solid ${INK}`,
      display: "flex",
      justifyContent: SPACE_BETWEEN,
      paddingBottom: 22,
    }}
  >
    <div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "0.3em",
          opacity: 0.75,
        }}
      >
        TRIATHLON · MULTI-SPORT
      </div>
      <h1 style={TITLE_STYLE}>{data.title}</h1>
    </div>
    <div
      style={{
        fontSize: 24,
        fontWeight: 600,
        letterSpacing: "0.18em",
        lineHeight: 1.5,
        textAlign: "right",
      }}
    >
      <div>{formatDateUpper(data.date)}</div>
      <div style={{ opacity: 0.7 }}>{data.location.toUpperCase()}</div>
      <div
        style={{
          fontFamily: DISPLAY,
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.01em",
          marginTop: 12,
        }}
      >
        {formatDuration(data.durationSec)}
      </div>
    </div>
  </div>
);

interface TimelineBar {
  background: string;
  durationSec: number;
  key: string;
  label: string;
}

// Alternating segments + transitions (a transition follows the leg it closes).
const timelineBars = (
  legs: TriSegment[],
  transitions: Transition[]
): TimelineBar[] => {
  const bars: TimelineBar[] = [];
  for (const [i, seg] of legs.entries()) {
    bars.push({
      background: accentFor(seg.sport),
      durationSec: seg.durationSec,
      key: `leg-${i + 1}`,
      label: `${labelFor(seg.sport)} · ${formatClock(seg.durationSec)}`,
    });
    const t = transitions.at(i);
    if (t !== undefined) {
      bars.push({
        background: INK,
        durationSec: t.durationSec,
        key: `after-leg-${i + 1}`,
        label: `${t.name} ${formatClock(t.durationSec)}`,
      });
    }
  }
  return bars;
};

const TIMELINE_BAR_STYLE = {
  alignItems: "center",
  color: "#fff",
  display: "flex",
  fontSize: 22,
  fontWeight: 700,
  justifyContent: "center",
  letterSpacing: "0.18em",
} satisfies CSSProperties;

// The effort timeline: one band, widths proportional to duration.
const Timeline = ({
  legs,
  transitions,
}: {
  legs: TriSegment[];
  transitions: Transition[];
}) => {
  const bars = timelineBars(legs, transitions);
  const sum = bars.reduce((a, b) => a + b.durationSec, 0) || 1;
  return (
    <div style={{ marginBottom: 16, marginTop: 16 }}>
      <div
        style={{
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "0.28em",
          marginBottom: 12,
          opacity: 0.7,
        }}
      >
        EFFORT TIMELINE
      </div>
      <div
        style={{
          alignItems: "stretch",
          border: `1px solid ${INK}`,
          display: "flex",
          height: 56,
        }}
      >
        {bars.map((bar, i) => (
          <div
            key={bar.key}
            style={{
              ...TIMELINE_BAR_STYLE,
              background: bar.background,
              borderRight:
                i < bars.length - 1
                  ? "1px solid rgba(255,255,255,0.4)"
                  : "none",
              flex: bar.durationSec / sum,
            }}
          >
            {bar.label}
          </div>
        ))}
      </div>
    </div>
  );
};

// A leg's trace: the bike's elevation silhouette (when recorded), stylised
// waves for the swim, otherwise the leg's route line.
const LegTrace = ({ accent, seg }: { accent: string; seg: TriSegment }) => {
  if (seg.sport === "bike" && seg.elevationProfile) {
    return (
      <>
        <path
          d={elevationPath(seg.elevationProfile, 360, 160, 0, true)}
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
    );
  }
  if (seg.sport === "swim") {
    return (
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
    );
  }
  return (
    <path
      d={routePath(seg.routeCoordinates, 360, 160, 8)}
      fill="none"
      stroke={accent}
      strokeLinejoin="round"
      strokeWidth={2.5}
    />
  );
};

// The two supporting stats for a leg, per discipline.
const LegStats = ({ seg }: { seg: TriSegment }) => {
  if (seg.sport === "bike") {
    return (
      <>
        <Stat label="ELEV" v={`${seg.elevationGainM ?? 0} m`} />
        <Stat label="AVG" v={`${formatNumber(seg.avgSpeedKmh, 1)} km/h`} />
      </>
    );
  }
  if (seg.sport === "swim") {
    return (
      <>
        <Stat label="/100m" v={formatPaceSec(seg.avgPacePer100m)} />
        <Stat label="STROKE" v="freestyle" />
      </>
    );
  }
  return (
    <>
      <Stat label="PACE" v={`${formatPaceMin(seg.avgPaceMinPerKm)} /km`} />
      <Stat label="ELEV" v={`${seg.elevationGainM ?? 0} m`} />
    </>
  );
};

const LEG_CARD_STYLE = {
  alignItems: "stretch",
  background: "#ffffff",
  border: `1px solid ${INK}`,
  // A query container so the card's own type (numerals, stats)
  // scales to the card box — narrow in landscape, short in square.
  containerType: "size",
  display: "grid",
  gap: 14,
  // minmax(0, …) lets the columns shrink below their content so a
  // tight card compresses instead of overflowing the card border.
  gridTemplateColumns: "minmax(0, 0.55fr) minmax(0, 1fr) minmax(0, 0.55fr)",
  padding: "12px 22px",
  position: "relative",
} satisfies CSSProperties;

const LEG_BADGE_STYLE = {
  alignItems: "center",
  color: "#fff",
  display: "flex",
  fontFamily: DISPLAY,
  fontSize: 26,
  fontWeight: 700,
  height: 48,
  justifyContent: "center",
  left: -1,
  letterSpacing: "0.1em",
  position: "absolute",
  top: -1,
  width: 84,
} satisfies CSSProperties;

const LEG_MAIN_STYLE = {
  display: "flex",
  flexDirection: "column",
  justifyContent: SPACE_BETWEEN,
  minWidth: 0,
  // Clears the 48px corner badge (card pad 12 + 36 ≈ 48).
  paddingTop: 36,
} satisfies CSSProperties;

const LEG_NUMERAL_STYLE = {
  fontFamily: DISPLAY,
  // The hero numeral: full size on a roomy card, shrinking
  // with the card's width (landscape) or height (square).
  fontSize: "clamp(40px, min(15cqi, 26cqb), 80px)",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  lineHeight: 0.95,
  marginTop: 10,
} satisfies CSSProperties;

const LEG_STATS_STYLE = {
  borderLeft: "1px solid rgba(17,21,26,0.2)",
  // Its own query container so the Stat values size to this
  // column's width (narrow in a 3-up landscape card).
  containerType: "inline-size",
  display: "flex",
  flexDirection: "column",
  gap: 14,
  minWidth: 0,
  paddingLeft: 18,
  // Aligns with the badge-clearing left column on roomy cards,
  // but collapses in a short square card so the swim card's
  // two stats don't overflow. cqb → the card's size container.
  paddingTop: "clamp(14px, 9cqb, 32px)",
} satisfies CSSProperties;

const TRANSITION_TAG_STYLE = {
  background: INK,
  bottom: -16,
  color: PAPER,
  fontSize: 22,
  fontWeight: 700,
  letterSpacing: "0.2em",
  padding: "8px 16px",
  position: "absolute",
  right: 24,
  zIndex: 2,
} satisfies CSSProperties;

// One leg's card: numbered corner badge, distance / time / hero metric, the
// trace, the supporting stats, and the transition that follows (if any).
const LegCard = ({
  leg,
  seg,
  transition,
}: {
  leg: number;
  seg: TriSegment;
  transition?: Transition;
}) => {
  const accent = accentFor(seg.sport);
  return (
    <div style={LEG_CARD_STYLE}>
      <div style={{ ...LEG_BADGE_STYLE, background: accent }}>0{leg}</div>

      <div style={LEG_MAIN_STYLE}>
        <div>
          <div
            style={{
              color: accent,
              fontSize: LEG_LABEL_SIZE,
              fontWeight: 700,
              letterSpacing: "0.3em",
            }}
          >
            {labelFor(seg.sport)}
          </div>
          <div style={LEG_NUMERAL_STYLE}>
            {seg.distanceKm}
            <span
              style={{
                fontSize: "clamp(18px, min(7cqi, 14cqb), 30px)",
                marginLeft: 6,
                opacity: 0.55,
              }}
            >
              km
            </span>
          </div>
          <div
            style={{
              fontSize: LEG_LABEL_SIZE,
              fontWeight: 600,
              letterSpacing: "0.06em",
              marginTop: 10,
              opacity: 0.8,
            }}
          >
            {formatClock(seg.durationSec)}
          </div>
        </div>
        <div
          style={{
            fontSize: "clamp(15px, 8cqb, 22px)",
            fontWeight: 600,
            letterSpacing: "0.24em",
            opacity: 0.7,
          }}
        >
          HERO · {heroFor(seg)}
        </div>
      </div>

      <div style={{ minWidth: 0 }}>
        <svg
          aria-hidden="true"
          preserveAspectRatio="none"
          style={{ height: "100%", width: "100%" }}
          viewBox="0 0 360 160"
        >
          <title>{labelFor(seg.sport)} trace</title>
          <LegTrace accent={accent} seg={seg} />
        </svg>
      </div>

      <div style={LEG_STATS_STYLE}>
        <LegStats seg={seg} />
      </div>

      {transition === undefined ? null : (
        <div style={TRANSITION_TAG_STYLE}>
          {transition.name} → {formatClock(transition.durationSec)}
        </div>
      )}
    </div>
  );
};

const ROOT_STYLE = {
  ...PLAIN_ROOT_STYLE,
  // Named query container (`card`): the segment band's `@container card`
  // breakpoint below keys on the card's WIDTH to go 3-up at x-landscape.
  // `size` (not inline-size) so it also answers any height-driven `cqb`;
  // the name skips the nested per-segment `size` containers cleanly.
  containerName: "card",
  containerType: "size",
  // Stacking context so the z-index:-1 photo underlay paints above the
  // solid background (not behind it) and below the content.
  isolation: "isolate",
} satisfies CSSProperties;

const FOOTER_STYLE = {
  alignItems: "center",
  borderTop: "1px solid rgba(17,21,26,0.4)",
  display: "flex",
  fontSize: 24,
  fontWeight: 600,
  justifyContent: SPACE_BETWEEN,
  letterSpacing: "0.24em",
  marginTop: 16,
  opacity: 0.75,
  paddingTop: 14,
} satisfies CSSProperties;

export const ThemeTriathlon = ({
  data,
  photoUrl,
  imageTransform,
}: ThemeProps<TriathlonCapability>) => {
  const { width, height } = useFormat();
  const sports = data.segments ?? [];
  const transitions = data.transitions ?? [];

  if (data.sport !== "triathlon" || sports.length === 0) {
    return <SingleSportNotice height={height} width={width} />;
  }

  // Each leg with its ordinal (printed on its badge) and the transition that
  // closes it — the last leg has none.
  const legs = sports.map((seg, idx) => ({
    leg: idx + 1,
    seg,
    transition: idx < sports.length - 1 ? transitions.at(idx) : undefined,
  }));

  return (
    <div style={{ ...ROOT_STYLE, height, width }}>
      {hasText(photoUrl) ? (
        <PhotoUnderlay imageTransform={imageTransform} photoUrl={photoUrl} />
      ) : null}
      <SafeArea pad={{ bottom: 50, left: 70, right: 70, top: 70 }}>
        <Header data={data} />

        <Timeline legs={sports} transitions={transitions} />

        {/* One self-reflowing grid, ONE markup: the three segments stack 1-up at
            4:5 / 1:1 / 9:16 and sit 3-up at x-landscape. The column count is an
            explicit container breakpoint — `@min-[1400px]/card:grid-cols-3` =
            "go 3-up once the card is wider than 1400px" — which only the 1600px
            landscape canvas crosses (every other format is 1080px wide). States
            the intent directly instead of back-solving an auto-fit `minmax` MIN
            against the gap. Square stays 1-up; its `clamp` type shrinks to fit. */}
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-3.5 @min-[1400px]/card:grid-cols-3">
          {legs.map(({ leg, seg, transition }) => (
            <LegCard
              key={`leg-${leg}`}
              leg={leg}
              seg={seg}
              transition={transition}
            />
          ))}
        </div>

        <div style={FOOTER_STYLE}>
          <span>EFFORT · TRIATHLON CARD</span>
          <span>
            {hasText(data.athleteName) ? data.athleteName.toUpperCase() : ""}
          </span>
        </div>
      </SafeArea>
    </div>
  );
};
