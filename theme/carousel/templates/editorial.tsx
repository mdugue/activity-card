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

export const EditorialSlide = ({
  data,
  style,
  hasPhoto,
  index,
  total,
  showEffort,
  showPageNumber,
  statOpts,
}: PanelProps) => {
  const colors = slideText(style, hasPhoto);
  const summary = buildStats(data, statOpts)
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
          alignItems: "flex-end",
          display: "flex",
          gap: 40,
          justifyContent: "space-between",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            aria-hidden
            style={{
              background: style.accent,
              height: 4,
              marginBottom: 26,
              width: 110,
            }}
          />
          <h1
            style={{
              color: colors.fg,
              fontFamily: style.fonts.display,
              fontSize: 80,
              fontStyle: "italic",
              fontWeight: style.fonts.displayWeight,
              letterSpacing: "-0.015em",
              lineHeight: 0.94,
              margin: 0,
              textShadow: colors.shadow || undefined,
              textWrap: "balance",
            }}
          >
            {data.title || "The effort"}
          </h1>
          <div
            style={{
              color: colors.muted,
              fontFamily: style.fonts.mono,
              fontSize: 26,
              letterSpacing: "0.12em",
              marginTop: 24,
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
};
