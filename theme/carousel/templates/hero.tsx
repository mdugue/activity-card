// Hero — the hook slide. One dominant element: the title + one huge expressive
// stat (distance, or total elevation for Ascent). Default slide 1; it carries
// the swipe decision, so it has to stop the thumb. No sport word, no tech
// read-out, no redundant "distance" label under the number.

import { heroStat } from "@/theme/carousel/stats";

import type { PanelProps } from "../define-theme";
import { MetaBand } from "./parts";
import { SlideScaffold } from "./scaffold";
import { slideText } from "./shared";

export const HeroSlide = ({
  data,
  style,
  hasPhoto,
  index,
  total,
  statOpts,
  showPageNumber,
}: PanelProps) => {
  const colors = slideText(style, hasPhoto);
  const anchor = style.contentAnchor;
  const hero = heroStat(data, style.heroMetric, statOpts);

  const block = (
    <div style={{ marginTop: anchor === "top" ? 56 : 0 }}>
      {data.title ? (
        <h1
          style={{
            color: colors.fg,
            fontFamily: style.fonts.display,
            fontSize: 92,
            fontWeight: style.fonts.displayWeight,
            letterSpacing: "-0.01em",
            lineHeight: 0.96,
            margin: 0,
            maxWidth: "92%",
            textShadow: colors.shadow || undefined,
            textWrap: "pretty",
          }}
        >
          {data.title}
        </h1>
      ) : null}
      {data.location ? (
        <div
          style={{
            color: colors.muted,
            fontFamily: style.fonts.mono,
            fontSize: 24,
            letterSpacing: "0.18em",
            marginTop: 20,
            textShadow: colors.shadow || undefined,
          }}
        >
          {data.location.toUpperCase()}
        </div>
      ) : null}

      {hero.value ? (
        <div
          style={{
            alignItems: "baseline",
            display: "flex",
            gap: 16,
            marginTop: 28,
          }}
        >
          <span
            style={{
              color: style.accent,
              fontFamily: style.fonts.numeral,
              fontSize: 348,
              fontVariantNumeric: "tabular-nums",
              fontWeight: style.fonts.numeralWeight,
              letterSpacing: "-0.02em",
              lineHeight: 0.78,
              textShadow: colors.shadow || undefined,
            }}
          >
            {hero.value}
          </span>
          <span
            style={{
              color: colors.fg,
              fontFamily: style.fonts.mono,
              fontSize: 58,
              fontWeight: 500,
              textShadow: colors.shadow || undefined,
            }}
          >
            {hero.unit}
          </span>
        </div>
      ) : null}
    </div>
  );

  return (
    <SlideScaffold
      anchor={anchor}
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
      {block}
    </SlideScaffold>
  );
};
