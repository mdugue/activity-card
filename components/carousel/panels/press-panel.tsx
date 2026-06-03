// Press — editorial broadsheet. Masthead + serif headline with a drop cap,
// stat pull-quotes set in columns, a closing byline. No photo-forward; type
// carries it.

import { buildStats, heroStat } from "@/lib/carousel/stats";
import { formatDateUpper } from "@/lib/format";
import {
  SLIDE_PAD,
  slideText,
  sportWord,
  type TemplateProps,
} from "../templates/shared";

function Masthead({
  data,
  style,
  muted,
  ink,
}: {
  data: TemplateProps["data"];
  ink: string;
  muted: string;
  style: TemplateProps["style"];
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          borderBottom: `3px double ${ink}`,
          paddingBottom: 14,
        }}
      >
        <span
          style={{
            fontFamily: style.fonts.display,
            fontStyle: "italic",
            fontSize: 46,
            color: ink,
          }}
        >
          The Effort
        </span>
        <span
          style={{
            fontFamily: style.fonts.mono,
            fontSize: 17,
            letterSpacing: "0.18em",
            color: muted,
          }}
        >
          {sportWord(data.sport)} · {formatDateUpper(data.date)}
        </span>
      </div>
    </div>
  );
}

export function PressPanel(props: TemplateProps) {
  const { data, style, hasPhoto, index, total } = props;
  const c = slideText(style, hasPhoto);
  const stats = buildStats(data);
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const hero = heroStat(data);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: SLIDE_PAD,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Masthead data={data} ink={c.fg} muted={c.muted} style={style} />

      {isFirst ? (
        <div style={{ marginTop: 40 }}>
          <h1
            style={{
              fontFamily: style.fonts.display,
              fontSize: 104,
              lineHeight: 0.92,
              letterSpacing: "-0.02em",
              margin: 0,
              color: c.fg,
              textWrap: "balance",
            }}
          >
            {data.title}
          </h1>
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
              fontSize: 40,
              lineHeight: 1.28,
              color: c.fg,
              columnCount: 2,
              columnGap: 44,
              columnRule: `1px solid ${c.muted}`,
              textIndent: 0,
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
              {hero.value.charAt(0)}
            </span>
            {`${hero.value} ${hero.unit} logged — ${stats
              .slice(1, 3)
              .map((s) => `${s.value} ${s.unit}`)
              .join(
                ", "
              )}. A ${sportWord(data.sport).toLowerCase()} worth printing.`}
          </p>
        </div>
      ) : null}

      {isFirst || isLast ? null : (
        <div style={{ marginTop: "auto", marginBottom: "auto" }}>
          <div
            style={{
              fontFamily: style.fonts.mono,
              fontSize: 22,
              letterSpacing: "0.24em",
              color: style.accent,
            }}
          >
            {(stats[index] ?? hero).label}
          </div>
          <div
            style={{
              fontFamily: style.fonts.numeral,
              fontSize: 240,
              lineHeight: 0.8,
              color: c.fg,
              fontVariantNumeric: "tabular-nums",
              marginTop: 16,
            }}
          >
            {(stats[index] ?? hero).value}
            <span
              style={{
                fontFamily: style.fonts.display,
                fontSize: 56,
                fontStyle: "italic",
              }}
            >
              {(stats[index] ?? hero).unit
                ? ` ${(stats[index] ?? hero).unit}`
                : ""}
            </span>
          </div>
          <div
            aria-hidden
            style={{ height: 3, background: c.fg, marginTop: 28, width: "60%" }}
          />
        </div>
      )}

      {isLast ? (
        <div style={{ marginTop: "auto" }}>
          <div
            style={{
              fontFamily: style.fonts.display,
              fontStyle: "italic",
              fontSize: 64,
              color: c.fg,
            }}
          >
            — {data.athleteName || "Anonymous"}
          </div>
          <div
            style={{
              marginTop: 18,
              fontFamily: style.fonts.mono,
              fontSize: 19,
              letterSpacing: "0.22em",
              color: c.muted,
              borderTop: `1px solid ${c.muted}`,
              paddingTop: 18,
            }}
          >
            PRINTED WITH EFFORT · {formatDateUpper(data.date)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
