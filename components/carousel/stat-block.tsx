// Stat primitive shared by the carousel templates. Condensed display numerals
// + monospace label/unit with tabular figures (section 4) so numbers line up
// in rows and columns.

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
}

export function Stat({ item, fonts, ink, muted, numeralSize }: StatProps) {
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
            fontSize: numeralSize,
            lineHeight: 0.86,
            letterSpacing: "-0.01em",
            color: ink,
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
            }}
          >
            {item.unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}
