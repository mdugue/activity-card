// StatRow (1×3) — the classic Strava line: three stat columns packed together.

import type { PanelProps } from "./shared";
import { StatLayout } from "./stat-layout";

export function StatRowSlide(props: PanelProps) {
  return (
    <StatLayout
      {...props}
      columns="repeat(3, max-content)"
      numeralSize={92}
      titleSize={52}
    />
  );
}
