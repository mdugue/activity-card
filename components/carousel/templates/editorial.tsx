// Editorial — typography-led wrap-up slide. A centred round-up visualisation
// (the elevation profile for Trace, the route glyph for Ascent / Exposure), a
// magazine headline of the title, a one-line stat summary, and an opt-in
// signature. No repeated hero number — distance already lives in the summary.

import { buildStats } from "@/lib/carousel/stats";
import { CrossViz } from "../cross-viz";
import { MetaBand, Signature } from "./parts";
import { SLIDE_PAD, slideText, type TemplateProps } from "./shared";

export function EditorialSlide({
  data,
  style,
  hasPhoto,
  index,
  total,
  showEffort,
  showPageNumber,
  visibility,
}: TemplateProps) {
  const colors = slideText(style, hasPhoto);
  const summary = buildStats(data, {
    distance: visibility.distance,
    time: visibility.time,
  })
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

      {/* Centred round-up visualisation. */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {style.crossViz ? (
          <CrossViz
            accent={style.accent}
            color={colors.fg}
            data={data}
            fonts={style.fonts}
            h={250}
            kind={style.crossViz}
            muted={colors.muted}
            w={560}
          />
        ) : null}
      </div>

      <div>
        <div
          aria-hidden
          style={{
            width: 110,
            height: 4,
            background: style.accent,
            marginBottom: 26,
          }}
        />
        <h1
          style={{
            fontFamily: style.fonts.display,
            fontWeight: style.fonts.displayWeight,
            fontStyle: "italic",
            fontSize: 80,
            lineHeight: 0.94,
            letterSpacing: "-0.015em",
            margin: 0,
            color: colors.fg,
            textWrap: "balance",
            maxWidth: "95%",
            textShadow: colors.shadow || undefined,
          }}
        >
          {data.title || "The effort"}
        </h1>
        <div
          style={{
            marginTop: 24,
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

      <div style={{ marginTop: 44 }}>
        <Signature
          accent={style.accent}
          athleteName={data.athleteName}
          colors={colors}
          fonts={style.fonts}
          showEffort={showEffort}
        />
      </div>
    </div>
  );
}
