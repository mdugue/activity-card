// Stat primitive shared by the carousel templates. Display numerals + monospace
// label/unit with tabular figures so numbers line up in rows and columns.
// Carries an optional text-shadow for legibility over a photo.

import type { StatItem } from "@/theme/carousel/stats";
import type { FontPair } from "@/theme/carousel/theme-tokens";

const TABULAR: React.CSSProperties = {
  fontFeatureSettings: '"tnum" 1',
  fontVariantNumeric: "tabular-nums",
};

interface StatProps {
  fonts: FontPair;
  ink: string;
  item: StatItem;
  muted: string;
  numeralSize: number;
  shadow?: string;
}

export const Stat = ({
  item,
  fonts,
  ink,
  muted,
  numeralSize,
  shadow,
}: StatProps) => {
  // An empty shadow means "none" — leave the property unset.
  const textShadow = shadow === "" ? undefined : shadow;
  return (
    <div>
      <div
        style={{
          color: muted,
          fontFamily: fonts.mono,
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: "0.18em",
          textShadow,
          textTransform: "uppercase",
        }}
      >
        {item.label}
      </div>
      <div
        style={{
          alignItems: "baseline",
          display: "flex",
          gap: 8,
          marginTop: 8,
        }}
      >
        <span
          style={{
            ...TABULAR,
            color: ink,
            fontFamily: fonts.numeral,
            fontSize: numeralSize,
            fontWeight: fonts.numeralWeight,
            letterSpacing: "-0.01em",
            lineHeight: 0.86,
            textShadow,
          }}
        >
          {item.value}
        </span>
        {item.unit ? (
          <span
            style={{
              color: muted,
              fontFamily: fonts.mono,
              fontSize: Math.round(numeralSize * 0.26),
              fontWeight: 500,
              letterSpacing: "0.04em",
              textShadow,
            }}
          >
            {item.unit}
          </span>
        ) : null}
      </div>
    </div>
  );
};
