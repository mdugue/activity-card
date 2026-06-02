// Small shared JSX fragments for slide templates: the top meta band and the
// bottom signature line. Kept consistent across templates so a carousel reads
// as one set (block positions stay put slide to slide).

import type { ActivityData } from "@/components/app/sample-data";
import type { FontPair } from "@/lib/carousel/theme-tokens";
import { formatDateUpper } from "@/lib/format";
import { type SlideTextColors, slideNumber, sportWord } from "./shared";

interface MetaBandProps {
  colors: SlideTextColors;
  data: ActivityData;
  fonts: FontPair;
  index: number;
  total: number;
}

export function MetaBand({ data, colors, fonts, index, total }: MetaBandProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        fontFamily: fonts.mono,
        fontSize: 22,
        fontWeight: 500,
        letterSpacing: "0.22em",
        color: colors.muted,
      }}
    >
      <span>{sportWord(data.sport)}</span>
      <span>
        {slideNumber(index, total)}
        {data.date ? ` · ${formatDateUpper(data.date)}` : ""}
      </span>
    </div>
  );
}

interface SlideFooterProps {
  accent: string;
  colors: SlideTextColors;
  data: ActivityData;
  fonts: FontPair;
}

export function SlideFooter({ data, colors, fonts, accent }: SlideFooterProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontFamily: fonts.mono,
        fontSize: 20,
        fontWeight: 500,
        letterSpacing: "0.2em",
        color: colors.muted,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          aria-hidden
          style={{ width: 30, height: 3, background: accent, display: "block" }}
        />
        EFFORT
      </span>
      {data.athleteName ? (
        <span>— {data.athleteName.toUpperCase()}</span>
      ) : null}
    </div>
  );
}
