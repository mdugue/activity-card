// Press — editorial broadsheet. Masthead + serif headline with a drop cap, stat
// pull-quotes, a closing byline. Supports a background photo with a print
// sensibility: text sits in fully-opaque "clipping" boxes (a paper slab, an ink
// nameplate) rather than a soft scrim, so it reads like a pasted-up poster.

import type { ActivityData } from "@/lib/activity";
import { bandModeFor, pickProfile } from "@/lib/carousel/profile";
import type { EffectiveStyle } from "@/lib/carousel/resolve";
import { pressSlideStats, type StatItem } from "@/lib/carousel/stats";
import { formatDateUpper } from "@/lib/format";
import {
  isMultiActivity,
  segmentProfiles,
  segmentRoutes,
} from "@/lib/multi-activity";
import type { PanelProps } from "../define-theme";
import { ElevationBand } from "../elevation-band";
import { RouteLine } from "../route-line";
import { SLIDE_PAD, slideNumber } from "../templates/shared";

const SLAB_SHADOW = "0 10px 34px rgba(0,0,0,0.3)";

/** An opaque paper (or inverted ink) block. Over a photo it gives the text a
 *  hard-edged print surface; on the paper background it's just transparent. */
function Slab({
  children,
  onPhoto,
  bg,
  fg,
  extra,
}: {
  bg: string;
  children: React.ReactNode;
  extra?: React.CSSProperties;
  fg: string;
  onPhoto: boolean;
}) {
  return (
    <div
      style={{
        background: onPhoto ? bg : "transparent",
        color: fg,
        padding: onPhoto ? "26px 30px" : 0,
        boxShadow: onPhoto ? SLAB_SHADOW : undefined,
        ...extra,
      }}
    >
      {children}
    </div>
  );
}

function Masthead({
  data,
  style,
  onPhoto,
  paper,
  ink,
  showPageNumber,
  index,
  total,
}: {
  data: ActivityData;
  index: number;
  ink: string;
  onPhoto: boolean;
  paper: string;
  showPageNumber: boolean;
  style: EffectiveStyle;
  total: number;
}) {
  // Date is the slide-2 dateline only; page number (if on) rides every masthead.
  const datePart = index === 1 && data.date ? formatDateUpper(data.date) : "";
  const numPart = showPageNumber ? slideNumber(index, total) : "";
  const right = [datePart, numPart].filter(Boolean).join(" · ");
  return (
    <Slab
      bg={ink}
      extra={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        borderBottom: onPhoto ? undefined : `3px double ${ink}`,
        paddingBottom: onPhoto ? undefined : 14,
        padding: onPhoto ? "16px 24px" : undefined,
      }}
      fg={onPhoto ? paper : ink}
      onPhoto={onPhoto}
    >
      <span
        style={{
          fontFamily: style.fonts.display,
          fontWeight: style.fonts.displayWeight,
          fontStyle: "italic",
          fontSize: 46,
        }}
      >
        The Effort
      </span>
      <span
        style={{
          fontFamily: style.fonts.mono,
          fontSize: 17,
          letterSpacing: "0.18em",
          opacity: onPhoto ? 0.9 : 0.62,
        }}
      >
        {right}
      </span>
    </Slab>
  );
}

interface SpreadProps {
  data: ActivityData;
  hasPhoto: boolean;
  ink: string;
  muted: string;
  paper: string;
  stats: StatItem[];
  style: EffectiveStyle;
}

function FrontPage({
  data,
  style,
  ink,
  muted,
  paper,
  hasPhoto,
  stats,
}: SpreadProps) {
  const lead = stats[0];
  // Build the lede as one sentence, then float its first glyph as the drop cap —
  // so the lead value is never printed twice, and a deck with no lead stat (e.g.
  // Distance + Time both hidden) degrades to a clean sentence instead of
  // "undefined undefined logged".
  const extras = stats
    .slice(1, 3)
    .map((s) => `${s.value}${s.unit ? ` ${s.unit}` : ""}`)
    .join(", ");
  const ledePrefix = lead
    ? `${lead.value}${lead.unit ? ` ${lead.unit}` : ""} logged${
        extras ? ` — ${extras}` : ""
      }. `
    : "";
  const lede = `${ledePrefix}A ${data.sport} worth printing.`;
  return (
    <Slab
      bg={paper}
      extra={{ marginTop: hasPhoto ? 0 : 40 }}
      fg={ink}
      onPhoto={hasPhoto}
    >
      {data.title ? (
        <h1
          style={{
            fontFamily: style.fonts.display,
            fontWeight: style.fonts.displayWeight,
            fontSize: 104,
            lineHeight: 0.92,
            letterSpacing: "-0.02em",
            margin: 0,
            color: ink,
            textWrap: "balance",
          }}
        >
          {data.title}
        </h1>
      ) : null}
      {data.location ? (
        <div
          style={{
            marginTop: 22,
            fontFamily: style.fonts.mono,
            fontSize: 22,
            letterSpacing: "0.16em",
            color: style.accent,
          }}
        >
          {data.location.toUpperCase()}
        </div>
      ) : null}
      <p
        style={{
          marginTop: 30,
          fontFamily: style.fonts.display,
          fontWeight: style.fonts.displayWeight,
          fontSize: 40,
          lineHeight: 1.28,
          color: ink,
          columnCount: 2,
          columnGap: 44,
          columnRule: `1px solid ${muted}`,
          textIndent: 0,
          margin: "30px 0 0 0",
        }}
      >
        <span
          style={{
            float: "left",
            fontSize: 132,
            lineHeight: 0.74,
            paddingRight: 14,
            color: style.accent,
            fontFamily: style.fonts.display,
          }}
        >
          {lede.charAt(0)}
        </span>
        {lede.slice(1)}
      </p>
    </Slab>
  );
}

const VIZ_W = 540;
const VIZ_H = 140;

/** Whether a viz card has data to show, project-aware. */
function vizHas(kind: "elevation" | "route", data: ActivityData): boolean {
  if (isMultiActivity(data)) {
    return kind === "route"
      ? segmentRoutes(data).length > 0
      : segmentProfiles(data).profiles.length > 0;
  }
  if (kind === "route") {
    return (data.routeCoordinates?.length ?? 0) > 1;
  }
  return (pickProfile(data).profile?.length ?? 0) > 1;
}

/** The dark "clipping" that overlaps the stat card's empty lower band — a route
 *  or elevation cut in paper ink, flat and borderless, for a pasted-up magazine
 *  feel. No title; the paired stat names it. */
function VizCard({
  kind,
  data,
  ink,
  paper,
}: {
  data: ActivityData;
  ink: string;
  kind: "elevation" | "route";
  paper: string;
}) {
  if (!vizHas(kind, data)) {
    return null;
  }
  const { profile, mode } = pickProfile(data);
  const multi = isMultiActivity(data);
  const routes = multi ? segmentRoutes(data).map((r) => r.coords) : [];
  const seg = multi ? segmentProfiles(data) : null;
  const bandMode = bandModeFor(seg, mode);
  return (
    <div
      style={{
        alignSelf: "flex-end",
        width: VIZ_W + 44,
        // Overlaps only the stat card's reserved empty band (see paddingBottom).
        marginTop: -58,
        background: ink,
        padding: 22,
        boxShadow: "0 16px 44px rgba(0,0,0,0.34)",
        position: "relative",
        zIndex: 1,
      }}
    >
      <div style={{ width: VIZ_W, height: VIZ_H }}>
        {kind === "route" ? (
          <RouteLine
            accent={paper}
            accent2={paper}
            coords={data.routeCoordinates}
            h={VIZ_H}
            ink={paper}
            pad={12}
            routes={multi ? routes : undefined}
            showMarkers
            strokeWidth={4}
            style="poster"
            w={VIZ_W}
          />
        ) : (
          <ElevationBand
            colors={{ line: paper, fillFrom: paper, fillTo: "transparent" }}
            h={VIZ_H}
            mode={bandMode}
            profile={profile}
            profiles={multi ? seg?.profiles : undefined}
            w={VIZ_W}
            weights={multi ? seg?.distances : undefined}
          />
        )}
      </div>
    </div>
  );
}

function Spread({
  data,
  style,
  ink,
  paper,
  hasPhoto,
  stats,
  index,
}: SpreadProps & { index: number }) {
  const lead = stats[0];
  const extras = stats.slice(1);
  const viz = style.detailViz ? (
    <VizCard
      data={data}
      ink={ink}
      kind={index === 1 ? "elevation" : "route"}
      paper={paper}
    />
  ) : null;
  const column = {
    marginTop: "auto",
    marginBottom: "auto",
    display: "flex",
    flexDirection: "column",
  } as const;
  // A sparse activity can leave a spread with no stat — show just the viz cut
  // rather than a blank headline numeral.
  if (!lead) {
    return <div style={column}>{viz}</div>;
  }
  return (
    <div style={column}>
      {/* Stat clipping (paper). Reserves a bottom band the viz overlaps into, so
          the dark cut never covers the number. */}
      <Slab
        bg={paper}
        extra={{ width: "84%", paddingBottom: 78 }}
        fg={ink}
        onPhoto={hasPhoto}
      >
        <div
          style={{
            fontFamily: style.fonts.mono,
            fontSize: 22,
            letterSpacing: "0.24em",
            color: style.accent,
          }}
        >
          {lead.label}
        </div>
        <div
          style={{
            fontFamily: style.fonts.numeral,
            fontWeight: style.fonts.numeralWeight,
            fontSize: 212,
            lineHeight: 0.8,
            color: ink,
            fontVariantNumeric: "tabular-nums",
            marginTop: 12,
          }}
        >
          {lead.value}
          <span
            style={{
              fontFamily: style.fonts.display,
              fontSize: 52,
              fontStyle: "italic",
            }}
          >
            {lead.unit ? ` ${lead.unit}` : ""}
          </span>
        </div>

        {extras.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 40,
              marginTop: 28,
            }}
          >
            {extras.map((s) => (
              <div key={s.key}>
                <div
                  style={{
                    fontFamily: style.fonts.mono,
                    fontSize: 16,
                    letterSpacing: "0.2em",
                    color: style.accent,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontFamily: style.fonts.numeral,
                    fontWeight: style.fonts.numeralWeight,
                    fontSize: 64,
                    lineHeight: 0.85,
                    color: ink,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.value}
                  <span
                    style={{
                      fontFamily: style.fonts.display,
                      fontSize: 24,
                      fontStyle: "italic",
                    }}
                  >
                    {s.unit ? ` ${s.unit}` : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Slab>

      {viz}
    </div>
  );
}

function Byline({
  data,
  style,
  ink,
  muted,
  paper,
  hasPhoto,
  showEffort,
}: SpreadProps & { showEffort: boolean }) {
  return (
    <Slab bg={paper} extra={{ marginTop: "auto" }} fg={ink} onPhoto={hasPhoto}>
      {data.athleteName ? (
        <div
          style={{
            fontFamily: style.fonts.display,
            fontWeight: style.fonts.displayWeight,
            fontStyle: "italic",
            fontSize: 64,
            color: ink,
          }}
        >
          — {data.athleteName}
        </div>
      ) : null}
      <div
        style={{
          marginTop: data.athleteName ? 18 : 0,
          fontFamily: style.fonts.mono,
          fontSize: 19,
          letterSpacing: "0.22em",
          color: muted,
          borderTop: `1px solid ${muted}`,
          paddingTop: 18,
        }}
      >
        {showEffort ? "PRINTED WITH EFFORT · " : ""}
        {formatDateUpper(data.date)}
      </div>
    </Slab>
  );
}

/** The shared SpreadProps each Press slide builds from its own data + position. */
function spreadProps(props: PanelProps): SpreadProps {
  const { data, style, hasPhoto, index, total, statOpts } = props;
  return {
    data,
    style,
    hasPhoto,
    stats: pressSlideStats(data, index, total, statOpts),
    ink: style.ink,
    muted: style.mutedInk,
    paper: style.background,
  };
}

/** Masthead + the slide's body — every Press slide shares the nameplate. */
function PressChrome({
  props,
  children,
}: {
  children: React.ReactNode;
  props: PanelProps;
}) {
  const { data, style, hasPhoto, index, total, showPageNumber } = props;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: SLIDE_PAD,
        display: "flex",
        flexDirection: "column",
        gap: hasPhoto ? 28 : 0,
      }}
    >
      <Masthead
        data={data}
        index={index}
        ink={style.ink}
        onPhoto={hasPhoto}
        paper={style.background}
        showPageNumber={showPageNumber}
        style={style}
        total={total}
      />
      {children}
    </div>
  );
}

/** Press front page: title, drop-cap lede, headline stats. */
export function PressFrontPanel(props: PanelProps) {
  return (
    <PressChrome props={props}>
      <FrontPage {...spreadProps(props)} />
    </PressChrome>
  );
}

/** Press spread: a stat card + an altitude / route cut (by slide index). */
export function PressSpreadPanel(props: PanelProps) {
  return (
    <PressChrome props={props}>
      <Spread {...spreadProps(props)} index={props.index} />
    </PressChrome>
  );
}

/** Press closing byline: athlete name + the "made with effort" mark + date. */
export function PressBylinePanel(props: PanelProps) {
  return (
    <PressChrome props={props}>
      <Byline {...spreadProps(props)} showEffort={props.showEffort} />
    </PressChrome>
  );
}
