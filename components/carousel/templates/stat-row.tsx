// StatRow (1×3) — the classic Strava line: three horizontal stat columns
// (Distance · Time · Pace/Elevation).

import type { TemplateProps } from "./shared";
import { StatLayout } from "./stat-layout";

export function StatRowSlide(props: TemplateProps) {
  return (
    <StatLayout
      {...props}
      columns="1fr 1fr 1fr"
      count={3}
      numeralSize={120}
      titleMargin="34px 0 0 0"
      titleSize={64}
    />
  );
}
