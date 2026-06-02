// Editorial — typography-led closing/signature slide (Tracksmith/Rapha feel).
// Magazine headline treatment of the title + a one-line stat summary, athlete
// signature, and a quiet CTA. The route silhouette is drawn globally across the
// strip, so this slide adds no route of its own.

import { buildStats, heroStat } from "@/lib/carousel/stats";
import { MetaBand } from "./parts";
import { SLIDE_PAD, slideText, type TemplateProps } from "./shared";

export function EditorialSlide({
  data,
  style,
  hasPhoto,
  index,
  total,
}: TemplateProps) {
  const colors = slideText(style, hasPhoto);
  const stats = buildStats(data);
  const hero = heroStat(data);
  const summary = stats
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
            fontStyle: "italic",
            fontSize: 96,
            lineHeight: 0.92,
            letterSpacing: "-0.015em",
            margin: 0,
            color: colors.fg,
            textWrap: "balance",
            maxWidth: "95%",
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
          <div
            style={{
              fontFamily: style.fonts.mono,
              fontSize: 18,
              letterSpacing: "0.24em",
              color: colors.faint,
            }}
          >
            MADE WITH EFFORT
          </div>
          {data.athleteName ? (
            <div
              style={{
                fontFamily: style.fonts.display,
                fontStyle: "italic",
                fontSize: 52,
                color: style.accent,
                marginTop: 8,
              }}
            >
              {data.athleteName}
            </div>
          ) : null}
        </div>
        <div
          style={{
            fontFamily: style.fonts.numeral,
            fontSize: 64,
            color: colors.fg,
            fontVariantNumeric: "tabular-nums",
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
