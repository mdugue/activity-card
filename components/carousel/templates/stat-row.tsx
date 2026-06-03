// StatRow (1×3) — the classic Strava line: three horizontal stat columns.

import type { TemplateProps } from "./shared";
import { StatLayout } from "./stat-layout";

export function StatRowSlide(props: TemplateProps) {
  return (
    <StatLayout
      {...props}
      columns="1fr 1fr 1fr"
      numeralSize={92}
      titleSize={52}
    />
  );
}
