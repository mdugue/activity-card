// Editorial — typography-led wrap-up slide. Magazine headline treatment of the
// title + a one-line stat summary, the headline number, and an opt-in signature
// (the "made with effort" mark + athlete name). The route/elevation cross-viz is
// drawn by the seamless canvas in the corner, so this slide adds no chart.

import { buildStats } from "@/lib/carousel/stats";
import { MetaBand } from "./parts";
import { SLIDE_PAD, slideText, type TemplateProps } from "./shared";

export function EditorialSlide({
  data,
  style,
  hasPhoto,
  index,
  total,
  hero,
  showEffort,
  showPageNumber,
}: TemplateProps) {
  const colors = slideText(style, hasPhoto);
  const summary = buildStats(data)
    .slice(0, 3)
    .map((s) => `${s.value}${s.unit ? ` ${s.unit}` : ""}`)
    .join("  ·  ");

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
      <MetaBand
        colors={colors}
        data={data}
        fonts={style.fonts}
        index={index}
        showPageNumber={showPageNumber}
        total={total}
      />

      <div style={{ marginTop: "auto" }}>
        <div
          aria-hidden
          style={{
            width: 110,
            height: 4,
            background: style.accent,
            marginBottom: 30,
          }}
        />
        <h1
          style={{
            fontFamily: style.fonts.display,
            fontWeight: style.fonts.displayWeight,
            fontStyle: "italic",
            fontSize: 96,
            lineHeight: 0.92,
            letterSpacing: "-0.015em",
            margin: 0,
            color: colors.fg,
            textWrap: "balance",
            maxWidth: "95%",
            textShadow: colors.shadow || undefined,
          }}
        >
          {data.title}
        </h1>
        <div
          style={{
            marginTop: 28,
            fontFamily: style.fonts.mono,
            fontSize: 26,
            letterSpacing: "0.12em",
            color: colors.muted,
            textShadow: colors.shadow || undefined,
          }}
        >
          {summary}
        </div>
      </div>

      <div
        style={{
          marginTop: 56,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          {showEffort ? (
            <div
              style={{
                fontFamily: style.fonts.mono,
                fontSize: 18,
                letterSpacing: "0.24em",
                color: colors.faint,
                textShadow: colors.shadow || undefined,
              }}
            >
              MADE WITH EFFORT
            </div>
          ) : null}
          {data.athleteName ? (
            <div
              style={{
                fontFamily: style.fonts.display,
                fontWeight: style.fonts.displayWeight,
                fontStyle: "italic",
                fontSize: 52,
                color: style.accent,
                marginTop: showEffort ? 8 : 0,
                textShadow: colors.shadow || undefined,
              }}
            >
              {data.athleteName}
            </div>
          ) : null}
        </div>
        <div
          style={{
            fontFamily: style.fonts.numeral,
            fontWeight: style.fonts.numeralWeight,
            fontSize: 64,
            color: colors.fg,
            fontVariantNumeric: "tabular-nums",
            textShadow: colors.shadow || undefined,
          }}
        >
          {hero.value}
          <span style={{ fontFamily: style.fonts.mono, fontSize: 22 }}>
            {hero.unit ? ` ${hero.unit}` : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
