// Press — editorial broadsheet. Masthead + serif headline with a drop cap, stat
// pull-quotes, a closing byline. Supports a background photo with a print
// sensibility: text sits in fully-opaque "clipping" boxes (a paper slab, an ink
// nameplate) rather than a soft scrim, so it reads like a pasted-up poster.

import type { ActivityData } from "@/components/app/sample-data";
import type { EffectiveStyle } from "@/lib/carousel/resolve";
import { formatDateUpper } from "@/lib/format";
import { DetailViz, type DetailVizKind } from "../detail-viz";
import {
  SLIDE_PAD,
  slideNumber,
  type TemplateProps,
} from "../templates/shared";

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
  const right = `${formatDateUpper(data.date)}${
    showPageNumber ? ` · ${slideNumber(index, total)}` : ""
  }`;
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
  stats: TemplateProps["stats"];
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
          {lead?.value.charAt(0)}
        </span>
        {`${lead?.value} ${lead?.unit} logged — ${stats
          .slice(1, 3)
          .map((s) => `${s.value}${s.unit ? ` ${s.unit}` : ""}`)
          .join(", ")}. A ${data.sport} worth printing.`}
      </p>
    </Slab>
  );
}

function Spread({
  data,
  style,
  ink,
  muted,
  paper,
  hasPhoto,
  stats,
  index,
}: SpreadProps & { index: number }) {
  const lead = stats[0];
  return (
    <Slab
      bg={paper}
      extra={{ marginTop: "auto", marginBottom: "auto" }}
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
        {lead?.label}
      </div>
      <div
        style={{
          fontFamily: style.fonts.numeral,
          fontWeight: style.fonts.numeralWeight,
          fontSize: 240,
          lineHeight: 0.8,
          color: ink,
          fontVariantNumeric: "tabular-nums",
          marginTop: 16,
        }}
      >
        {lead?.value}
        <span
          style={{
            fontFamily: style.fonts.display,
            fontSize: 56,
            fontStyle: "italic",
          }}
        >
          {lead?.unit ? ` ${lead.unit}` : ""}
        </span>
      </div>
      <div
        aria-hidden
        style={{ height: 3, background: ink, marginTop: 28, width: "60%" }}
      />
      {style.detailViz ? (
        <div style={{ marginTop: 34 }}>
          <DetailViz
            bg={paper}
            color={ink}
            data={data}
            fonts={style.fonts}
            h={120}
            kinds={[index === 1 ? "route" : "elevation"] as DetailVizKind[]}
            muted={muted}
            print
            w={360}
          />
        </div>
      ) : null}
    </Slab>
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

export function PressPanel(props: TemplateProps) {
  const { data, style, hasPhoto, index, total, stats, showEffort } = props;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const shared: SpreadProps = {
    data,
    style,
    hasPhoto,
    stats,
    ink: style.ink,
    muted: style.mutedInk,
    paper: style.background,
  };

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
        showPageNumber={props.showPageNumber}
        style={style}
        total={total}
      />
      {isFirst ? <FrontPage {...shared} /> : null}
      {isFirst || isLast ? null : <Spread {...shared} index={index} />}
      {isLast ? <Byline {...shared} showEffort={showEffort} /> : null}
    </div>
  );
}
