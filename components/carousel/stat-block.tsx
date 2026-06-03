// Stat primitive shared by the carousel templates. Display numerals + monospace
// label/unit with tabular figures so numbers line up in rows and columns.
// Carries an optional text-shadow for legibility over a photo.

import type { StatItem } from "@/lib/carousel/stats";
import type { FontPair } from "@/lib/carousel/theme-tokens";

const TABULAR: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum" 1',
};

interface StatProps {
  fonts: FontPair;
  ink: string;
  item: StatItem;
  muted: string;
  numeralSize: number;
  shadow?: string;
}

export function Stat({
  item,
  fonts,
  ink,
  muted,
  numeralSize,
  shadow,
}: StatProps) {
  return (
    <div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 17,
          fontWeight: 500,
          letterSpacing: "0.18em",
          color: muted,
          textTransform: "uppercase",
          textShadow: shadow || undefined,
        }}
      >
        {item.label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          marginTop: 8,
        }}
      >
        <span
          style={{
            ...TABULAR,
            fontFamily: fonts.numeral,
            fontWeight: fonts.numeralWeight,
            fontSize: numeralSize,
            lineHeight: 0.86,
            letterSpacing: "-0.01em",
            color: ink,
            textShadow: shadow || undefined,
          }}
        >
          {item.value}
        </span>
        {item.unit ? (
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: Math.round(numeralSize * 0.26),
              fontWeight: 500,
              letterSpacing: "0.04em",
              color: muted,
              textShadow: shadow || undefined,
            }}
          >
            {item.unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}
