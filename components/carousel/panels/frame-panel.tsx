// Frame — ultra-minimal. One huge datum per slide between hairline rules, vast
// negative space. The last slide is the signature.

import { buildStats, heroStat } from "@/lib/carousel/stats";
import {
  SLIDE_PAD,
  slideNumber,
  slideText,
  sportWord,
  type TemplateProps,
} from "../templates/shared";

export function FramePanel({
  data,
  style,
  hasPhoto,
  index,
  total,
}: TemplateProps) {
  const c = slideText(style, hasPhoto);
  const isLast = index === total - 1;
  const stats = buildStats(data);
  const stat = stats[index] ?? heroStat(data);

  const rule = (
    <div
      aria-hidden
      style={{ height: 1, background: c.fg, opacity: 0.22, width: "100%" }}
    />
  );
  const header = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontFamily: style.fonts.mono,
        fontSize: 20,
        letterSpacing: "0.26em",
        color: c.muted,
      }}
    >
      <span>{sportWord(data.sport)}</span>
      <span>{slideNumber(index, total)}</span>
    </div>
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: SLIDE_PAD,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {header}

      {isLast ? (
        <div style={{ marginTop: "auto", marginBottom: "auto" }}>
          {rule}
          <h1
            style={{
              fontFamily: style.fonts.display,
              fontSize: 92,
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              margin: "44px 0",
              color: c.fg,
              textWrap: "balance",
            }}
          >
            {data.title}
          </h1>
          {rule}
          <div
            style={{
              marginTop: 28,
              fontFamily: style.fonts.mono,
              fontSize: 20,
              letterSpacing: "0.2em",
              color: c.muted,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>MADE WITH EFFORT</span>
            {data.athleteName ? (
              <span>{data.athleteName.toUpperCase()}</span>
            ) : null}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: "auto", marginBottom: "auto" }}>
          {rule}
          <div style={{ padding: "60px 0 50px" }}>
            <div
              style={{
                fontFamily: style.fonts.mono,
                fontSize: 24,
                letterSpacing: "0.24em",
                color: c.muted,
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                marginTop: 18,
                display: "flex",
                alignItems: "baseline",
                gap: 18,
              }}
            >
              <span
                style={{
                  fontFamily: style.fonts.numeral,
                  fontSize: 300,
                  lineHeight: 0.8,
                  letterSpacing: "-0.03em",
                  color: c.fg,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {stat.value}
              </span>
              {stat.unit ? (
                <span
                  style={{
                    fontFamily: style.fonts.mono,
                    fontSize: 48,
                    color: style.accent2,
                  }}
                >
                  {stat.unit}
                </span>
              ) : null}
            </div>
          </div>
          {rule}
        </div>
      )}

      <div
        aria-hidden
        style={{
          fontFamily: style.fonts.mono,
          fontSize: 18,
          letterSpacing: "0.24em",
          color: c.muted,
        }}
      >
        {data.location ? data.location.toUpperCase() : "EFFORT"}
      </div>
    </div>
  );
}
