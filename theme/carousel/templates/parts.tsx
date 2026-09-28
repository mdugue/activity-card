// Small shared fragments for slide templates: the top meta band (date + an
// optional page number — no sport word, no tech read-out) and the wrap-up
// signature (the "made with effort" mark + athlete name, both opt-in).

import type { ActivityData } from "@/lib/activity";
import { formatDateUpper } from "@/lib/format";
import type { FontPair } from "@/theme/carousel/theme-tokens";

import { slideNumber } from "./shared";
import type { SlideTextColors } from "./shared";

interface MetaBandProps {
  colors: SlideTextColors;
  data: ActivityData;
  fonts: FontPair;
  index: number;
  showPageNumber: boolean;
  total: number;
}

export const MetaBand = ({
  data,
  colors,
  fonts,
  index,
  total,
  showPageNumber,
}: MetaBandProps) => (
  <div
    style={{
      alignItems: "baseline",
      color: colors.muted,
      display: "flex",
      fontFamily: fonts.mono,
      fontSize: 22,
      fontWeight: 500,
      justifyContent: "space-between",
      letterSpacing: "0.22em",
      textShadow: colors.shadow || undefined,
    }}
  >
    <span>{index === 1 && data.date ? formatDateUpper(data.date) : ""}</span>
    {showPageNumber ? <span>{slideNumber(index, total)}</span> : null}
  </div>
);

interface SignatureProps {
  accent: string;
  athleteName?: string;
  colors: SlideTextColors;
  fonts: FontPair;
  showEffort: boolean;
}

/** Wrap-up mark. Renders nothing unless the Effort mark or athlete name is
 *  enabled, so a clean deck stays clean. */
export const Signature = ({
  colors,
  fonts,
  accent,
  showEffort,
  athleteName,
}: SignatureProps) => {
  const hasName = athleteName !== undefined && athleteName !== "";
  if (!(showEffort || hasName)) {
    return null;
  }
  return (
    <div
      style={{
        alignItems: "center",
        color: colors.muted,
        display: "flex",
        fontFamily: fonts.mono,
        fontSize: 20,
        fontWeight: 500,
        justifyContent: "space-between",
        letterSpacing: "0.2em",
        textShadow: colors.shadow || undefined,
      }}
    >
      {showEffort ? (
        <span style={{ alignItems: "center", display: "flex", gap: 12 }}>
          <span
            aria-hidden
            style={{
              background: accent,
              display: "block",
              height: 3,
              width: 30,
            }}
          />
          MADE WITH EFFORT
        </span>
      ) : (
        <span />
      )}
      {hasName ? <span>— {athleteName.toUpperCase()}</span> : null}
    </div>
  );
};
