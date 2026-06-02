// Hero — the hook slide. One dominant element: the title + one huge
// expressive stat (distance, or whatever leads for the sport). Default slide 1;
// it carries the swipe decision, so it has to stop the thumb.

import { heroStat } from "@/lib/carousel/stats";
import { MetaBand, SlideFooter } from "./parts";
import { SLIDE_PAD, slideText, type TemplateProps } from "./shared";

export function HeroSlide({
  data,
  style,
  hasPhoto,
  index,
  total,
}: TemplateProps) {
  const colors = slideText(style, hasPhoto);
  const stat = heroStat(data);

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
      <MetaBand
        colors={colors}
        data={data}
        fonts={style.fonts}
        index={index}
        total={total}
      />

      <div style={{ marginTop: "auto" }}>
        <h1
          style={{
            fontFamily: style.fonts.display,
            fontSize: 84,
            lineHeight: 0.96,
            letterSpacing: "-0.01em",
            margin: 0,
            color: colors.fg,
            textWrap: "pretty",
            maxWidth: "92%",
            textShadow: hasPhoto ? "0 4px 24px rgba(0,0,0,0.4)" : undefined,
          }}
        >
          {data.title}
        </h1>
        {data.location ? (
          <div
            style={{
              marginTop: 20,
              fontFamily: style.fonts.mono,
              fontSize: 24,
              letterSpacing: "0.18em",
              color: colors.muted,
            }}
          >
            {data.location.toUpperCase()}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 34,
            display: "flex",
            alignItems: "baseline",
            gap: 16,
          }}
        >
          <span
            style={{
              fontFamily: style.fonts.numeral,
              fontSize: 360,
              lineHeight: 0.78,
              letterSpacing: "-0.02em",
              color: style.accent,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {stat.value}
          </span>
          <span
            style={{
              fontFamily: style.fonts.mono,
              fontSize: 60,
              fontWeight: 500,
              color: colors.fg,
            }}
          >
            {stat.unit}
          </span>
        </div>
        <div
          style={{
            fontFamily: style.fonts.mono,
            fontSize: 22,
            letterSpacing: "0.2em",
            color: colors.muted,
            marginTop: 6,
            marginBottom: 40,
          }}
        >
          {stat.label}
        </div>

        <SlideFooter
          accent={style.accent}
          colors={colors}
          data={data}
          fonts={style.fonts}
        />
      </div>
    </div>
  );
}
