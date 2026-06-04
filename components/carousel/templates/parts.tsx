// Small shared fragments for slide templates: the top meta band (date + an
// optional page number — no sport word, no tech read-out) and the wrap-up
// signature (the "made with effort" mark + athlete name, both opt-in).

import type { ActivityData } from "@/components/app/sample-data";
import type { FontPair } from "@/lib/carousel/theme-tokens";
import { formatDateUpper } from "@/lib/format";
import { type SlideTextColors, slideNumber } from "./shared";

interface MetaBandProps {
  colors: SlideTextColors;
  data: ActivityData;
  fonts: FontPair;
  index: number;
  showPageNumber: boolean;
  total: number;
}

export function MetaBand({
  data,
  colors,
  fonts,
  index,
  total,
  showPageNumber,
}: MetaBandProps) {
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
        textShadow: colors.shadow || undefined,
      }}
    >
      <span>{index === 1 && data.date ? formatDateUpper(data.date) : ""}</span>
      {showPageNumber ? <span>{slideNumber(index, total)}</span> : null}
    </div>
  );
}

interface SignatureProps {
  accent: string;
  athleteName?: string;
  colors: SlideTextColors;
  fonts: FontPair;
  showEffort: boolean;
}

/** Wrap-up mark. Renders nothing unless the Effort mark or athlete name is
 *  enabled, so a clean deck stays clean. */
export function Signature({
  colors,
  fonts,
  accent,
  showEffort,
  athleteName,
}: SignatureProps) {
  if (!(showEffort || athleteName)) {
    return null;
  }
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
        textShadow: colors.shadow || undefined,
      }}
    >
      {showEffort ? (
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            aria-hidden
            style={{
              width: 30,
              height: 3,
              background: accent,
              display: "block",
            }}
          />
          MADE WITH EFFORT
        </span>
      ) : (
        <span />
      )}
      {athleteName ? <span>— {athleteName.toUpperCase()}</span> : null}
    </div>
  );
}
