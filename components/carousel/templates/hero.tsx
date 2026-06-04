// Hero — the hook slide. One dominant element: the title + one huge expressive
// stat (distance, or total elevation for Ascent). Default slide 1; it carries
// the swipe decision, so it has to stop the thumb. No sport word, no tech
// read-out, no redundant "distance" label under the number.

import { MetaBand } from "./parts";
import {
  contentAnchor,
  SLIDE_PAD,
  slideText,
  type TemplateProps,
} from "./shared";

export function HeroSlide({
  data,
  style,
  hasPhoto,
  index,
  total,
  hero,
  showPageNumber,
}: TemplateProps) {
  const colors = slideText(style, hasPhoto);
  const anchor = contentAnchor(style);

  const block = (
    <div style={{ marginTop: anchor === "top" ? 56 : 0 }}>
      {data.title ? (
        <h1
          style={{
            fontFamily: style.fonts.display,
            fontWeight: style.fonts.displayWeight,
            fontSize: 92,
            lineHeight: 0.96,
            letterSpacing: "-0.01em",
            margin: 0,
            color: colors.fg,
            textWrap: "pretty",
            maxWidth: "92%",
            textShadow: colors.shadow || undefined,
          }}
        >
          {data.title}
        </h1>
      ) : null}
      {data.location ? (
        <div
          style={{
            marginTop: 20,
            fontFamily: style.fonts.mono,
            fontSize: 24,
            letterSpacing: "0.18em",
            color: colors.muted,
            textShadow: colors.shadow || undefined,
          }}
        >
          {data.location.toUpperCase()}
        </div>
      ) : null}

      {hero.value ? (
        <div
          style={{
            marginTop: 28,
            display: "flex",
            alignItems: "baseline",
            gap: 16,
          }}
        >
          <span
            style={{
              fontFamily: style.fonts.numeral,
              fontWeight: style.fonts.numeralWeight,
              fontSize: 348,
              lineHeight: 0.78,
              letterSpacing: "-0.02em",
              color: style.accent,
              fontVariantNumeric: "tabular-nums",
              textShadow: colors.shadow || undefined,
            }}
          >
            {hero.value}
          </span>
          <span
            style={{
              fontFamily: style.fonts.mono,
              fontSize: 58,
              fontWeight: 500,
              color: colors.fg,
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
      {anchor === "bottom" ? <div style={{ flex: 1 }} /> : null}
      {block}
      {anchor === "top" ? <div style={{ flex: 1 }} /> : null}
    </div>
  );
}
