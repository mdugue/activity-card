// StatGrid (2×2) — up to four equal metrics, dashboard-balanced.

import type { TemplateProps } from "./shared";
import { StatLayout } from "./stat-layout";

export function StatGridSlide(props: TemplateProps) {
  return (
    <StatLayout
      {...props}
      columns="1fr 1fr"
      numeralSize={100}
      rows="auto auto"
      titleSize={52}
    />
  );
}
