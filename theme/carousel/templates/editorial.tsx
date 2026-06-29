// Editorial — typography-led wrap-up slide. A centred round-up visualisation
// (the elevation profile for Trace, the route glyph for Ascent / Exposure), a
// magazine headline of the title, a one-line stat summary, and an opt-in
// signature. No repeated hero number — distance already lives in the summary.

import { buildStats } from "@/theme/carousel/stats";
import { CrossViz } from "../cross-viz";
import type { PanelProps } from "../define-theme";
import { MetaBand, Signature } from "./parts";
import { SlideScaffold } from "./scaffold";
import { slideText } from "./shared";

export function EditorialSlide({
  data,
  style,
  hasPhoto,
  index,
  total,
  showEffort,
  showPageNumber,
}: PanelProps) {
  const colors = slideText(style, hasPhoto);
  const summary = buildStats(data)
    .slice(0, 3)
    .map((s) => `${s.value}${s.unit ? ` ${s.unit}` : ""}`)
    .join("  ·  ");

  return (
    <SlideScaffold
      anchor="bottom"
      top={
        <MetaBand
          colors={colors}
          data={data}
          fonts={style.fonts}
          index={index}
          showPageNumber={showPageNumber}
          total={total}
        />
      }
    >
      {/* Round-up: title + summary, with a small companion visualisation to the
          right at the same height. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 40,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
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

        {style.crossViz ? (
          <CrossViz
            accent={style.accent}
            color={colors.fg}
            data={data}
            fonts={style.fonts}
            h={130}
            kind={style.crossViz}
            muted={colors.muted}
            w={230}
          />
        ) : null}
      </div>

      <div style={{ marginTop: 40 }}>
        <Signature
          accent={style.accent}
          athleteName={data.athleteName}
          colors={colors}
          fonts={style.fonts}
          showEffort={showEffort}
        />
      </div>
    </SlideScaffold>
  );
}
