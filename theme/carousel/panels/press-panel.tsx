// Press — editorial broadsheet. Masthead + serif headline with a drop cap, stat
// pull-quotes, a closing byline. Supports a background photo with a print
// sensibility: text sits in fully-opaque "clipping" boxes (a paper slab, an ink
// nameplate) rather than a soft scrim, so it reads like a pasted-up poster.

import type { CSSProperties } from "react";

import type { ActivityData } from "@/lib/activity";
import { formatDateUpper } from "@/lib/format";
import type { EffectiveStyle } from "@/theme/carousel/resolve";
import { pressSlideStats } from "@/theme/carousel/stats";
import type { StatItem } from "@/theme/carousel/stats";
import { SafeArea } from "@/theme/shared/format-context";

import type { PanelProps } from "../define-theme";
import { CAROUSEL_NATURAL_PAD } from "../geometry";
import { MiniViz } from "../mini-viz";
import { slideNumber } from "../templates/shared";
import { vizHasKind } from "../viz-kind";

const SLAB_SHADOW = "0 10px 34px rgba(0,0,0,0.3)";

/** An opaque paper (or inverted ink) block. Over a photo it gives the text a
 *  hard-edged print surface; on the paper background it's just transparent. */
const Slab = ({
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
}) => (
  <div
    style={{
      background: onPhoto ? bg : "transparent",
      boxShadow: onPhoto ? SLAB_SHADOW : undefined,
      color: fg,
      padding: onPhoto ? "26px 30px" : 0,
      ...extra,
    }}
  >
    {children}
  </div>
);

const Masthead = ({
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
}) => {
  // Date is the slide-2 dateline only; page number (if on) rides every masthead.
  const datePart = index === 1 && data.date ? formatDateUpper(data.date) : "";
  const numPart = showPageNumber ? slideNumber(index, total) : "";
  const right = [datePart, numPart].filter(Boolean).join(" · ");
  return (
    <Slab
      bg={ink}
      extra={{
        alignItems: "baseline",
        borderBottom: onPhoto ? undefined : `3px double ${ink}`,
        display: "flex",
        justifyContent: "space-between",
        padding: onPhoto ? "16px 24px" : undefined,
        paddingBottom: onPhoto ? undefined : 14,
      }}
      fg={onPhoto ? paper : ink}
      onPhoto={onPhoto}
    >
      <span
        style={{
          fontFamily: style.fonts.display,
          fontSize: 46,
          fontStyle: "italic",
          fontWeight: style.fonts.displayWeight,
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
};

interface SpreadProps {
  data: ActivityData;
  hasPhoto: boolean;
  ink: string;
  muted: string;
  paper: string;
  stats: StatItem[];
  style: EffectiveStyle;
}

/** A stat as running text: "42.1 km", or just the value when unitless. */
const withUnit = (s: StatItem): string =>
  s.unit ? `${s.value} ${s.unit}` : s.value;

const FrontPage = ({
  data,
  style,
  ink,
  muted,
  paper,
  hasPhoto,
  stats,
}: SpreadProps) => {
  const lead = stats.at(0);
  // Build the lede as one sentence, then float its first glyph as the drop cap —
  // so the lead value is never printed twice, and a deck with no lead stat (e.g.
  // Distance + Time both hidden) degrades to a clean sentence instead of
  // "undefined undefined logged".
  const extras = stats.slice(1, 3).map(withUnit).join(", ");
  const extrasClause = extras ? ` — ${extras}` : "";
  const ledePrefix =
    lead === undefined ? "" : `${withUnit(lead)} logged${extrasClause}. `;
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
            color: ink,
            fontFamily: style.fonts.display,
            fontSize: 104,
            fontWeight: style.fonts.displayWeight,
            letterSpacing: "-0.02em",
            lineHeight: 0.92,
            margin: 0,
            textWrap: "balance",
          }}
        >
          {data.title}
        </h1>
      ) : null}
      {data.location ? (
        <div
          style={{
            color: style.accent,
            fontFamily: style.fonts.mono,
            fontSize: 22,
            letterSpacing: "0.16em",
            marginTop: 22,
          }}
        >
          {data.location.toUpperCase()}
        </div>
      ) : null}
      <p
        style={{
          color: ink,
          columnCount: 2,
          columnGap: 44,
          columnRule: `1px solid ${muted}`,
          fontFamily: style.fonts.display,
          fontSize: 40,
          fontWeight: style.fonts.displayWeight,
          lineHeight: 1.28,
          margin: "30px 0 0 0",
          textIndent: 0,
        }}
      >
        <span
          style={{
            color: style.accent,
            float: "left",
            fontFamily: style.fonts.display,
            fontSize: 132,
            lineHeight: 0.74,
            paddingRight: 14,
          }}
        >
          {lede.charAt(0)}
        </span>
        {lede.slice(1)}
      </p>
    </Slab>
  );
};

const VIZ_W = 540;
const VIZ_H = 140;

/** The dark "clipping" that overlaps the stat card's empty lower band — a route
 *  or elevation cut in paper ink, flat and borderless, for a pasted-up magazine
 *  feel. No title; the paired stat names it. */
const VizCard = ({
  kind,
  data,
  ink,
  paper,
}: {
  data: ActivityData;
  ink: string;
  kind: "elevation" | "route";
  paper: string;
}) => {
  if (!vizHasKind(data, kind)) {
    return null;
  }
  return (
    <div
      style={{
        alignSelf: "flex-end",
        background: ink,
        boxShadow: "0 16px 44px rgba(0,0,0,0.34)",
        // Overlaps only the stat card's reserved empty band (see paddingBottom).
        marginTop: -58,
        padding: 22,
        position: "relative",
        width: VIZ_W + 44,
        zIndex: 1,
      }}
    >
      <div style={{ height: VIZ_H, width: VIZ_W }}>
        <MiniViz
          accent={paper}
          color={paper}
          data={data}
          h={VIZ_H}
          kind={kind}
          pad={12}
          showMarkers
          w={VIZ_W}
        />
      </div>
    </div>
  );
};

/** A spread's content column, centred vertically in the slide. */
const SPREAD_COLUMN = {
  display: "flex",
  flexDirection: "column",
  marginBottom: "auto",
  marginTop: "auto",
} as const satisfies CSSProperties;

const Spread = ({
  data,
  style,
  ink,
  paper,
  hasPhoto,
  stats,
  index,
}: SpreadProps & { index: number }) => {
  const lead = stats.at(0);
  const extras = stats.slice(1);
  const viz = style.detailViz ? (
    <VizCard
      data={data}
      ink={ink}
      kind={index === 1 ? "elevation" : "route"}
      paper={paper}
    />
  ) : null;
  // A sparse activity can leave a spread with no stat — show just the viz cut
  // rather than a blank headline numeral.
  if (lead === undefined) {
    return <div style={SPREAD_COLUMN}>{viz}</div>;
  }
  return (
    <div style={SPREAD_COLUMN}>
      {/* Stat clipping (paper). Reserves a bottom band the viz overlaps into, so
          the dark cut never covers the number. */}
      <Slab
        bg={paper}
        extra={{ paddingBottom: 78, width: "84%" }}
        fg={ink}
        onPhoto={hasPhoto}
      >
        <div
          style={{
            color: style.accent,
            fontFamily: style.fonts.mono,
            fontSize: 22,
            letterSpacing: "0.24em",
          }}
        >
          {lead.label}
        </div>
        <div
          style={{
            color: ink,
            fontFamily: style.fonts.numeral,
            fontSize: 212,
            fontVariantNumeric: "tabular-nums",
            fontWeight: style.fonts.numeralWeight,
            lineHeight: 0.8,
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
                    color: style.accent,
                    fontFamily: style.fonts.mono,
                    fontSize: 16,
                    letterSpacing: "0.2em",
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    color: ink,
                    fontFamily: style.fonts.numeral,
                    fontSize: 64,
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: style.fonts.numeralWeight,
                    lineHeight: 0.85,
                    marginTop: 6,
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
};

const Byline = ({
  data,
  style,
  ink,
  muted,
  paper,
  hasPhoto,
  showEffort,
}: SpreadProps & { showEffort: boolean }) => (
  <Slab bg={paper} extra={{ marginTop: "auto" }} fg={ink} onPhoto={hasPhoto}>
    {data.athleteName ? (
      <div
        style={{
          color: ink,
          fontFamily: style.fonts.display,
          fontSize: 64,
          fontStyle: "italic",
          fontWeight: style.fonts.displayWeight,
        }}
      >
        — {data.athleteName}
      </div>
    ) : null}
    <div
      style={{
        borderTop: `1px solid ${muted}`,
        color: muted,
        fontFamily: style.fonts.mono,
        fontSize: 19,
        letterSpacing: "0.22em",
        marginTop: data.athleteName ? 18 : 0,
        paddingTop: 18,
      }}
    >
      {showEffort ? "PRINTED WITH EFFORT · " : ""}
      {formatDateUpper(data.date)}
    </div>
  </Slab>
);

/** The shared SpreadProps each Press slide builds from its own data + position. */
const spreadProps = (props: PanelProps): SpreadProps => {
  const { data, style, hasPhoto, index, total, statOpts } = props;
  return {
    data,
    hasPhoto,
    ink: style.ink,
    muted: style.mutedInk,
    paper: style.background,
    stats: pressSlideStats(data, index, total, statOpts),
    style,
  };
};

/** Masthead + the slide's body — every Press slide shares the nameplate. */
const PressChrome = ({
  props,
  children,
}: {
  children: React.ReactNode;
  props: PanelProps;
}) => {
  const { data, style, hasPhoto, index, total, showPageNumber } = props;
  return (
    <SafeArea pad={CAROUSEL_NATURAL_PAD} style={{ gap: hasPhoto ? 28 : 0 }}>
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
    </SafeArea>
  );
};

/** Press front page: title, drop-cap lede, headline stats. */
export const PressFrontPanel = (props: PanelProps) => (
  <PressChrome props={props}>
    <FrontPage {...spreadProps(props)} />
  </PressChrome>
);

/** Press spread: a stat card + an altitude / route cut (by slide index). */
export const PressSpreadPanel = (props: PanelProps) => (
  <PressChrome props={props}>
    <Spread {...spreadProps(props)} index={props.index} />
  </PressChrome>
);

/** Press closing byline: athlete name + the "made with effort" mark + date. */
export const PressBylinePanel = (props: PanelProps) => (
  <PressChrome props={props}>
    <Byline {...spreadProps(props)} showEffort={props.showEffort} />
  </PressChrome>
);
