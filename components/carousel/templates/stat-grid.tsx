// StatGrid (2×2) — four equal metrics, dashboard-balanced (e.g. Distance,
// Elevation, Avg Pace, Avg HR). The "detail stats" slide in the storyboard.

import type { TemplateProps } from "./shared";
import { StatLayout } from "./stat-layout";

export function StatGridSlide(props: TemplateProps) {
  return (
    <StatLayout
      {...props}
      columns="1fr 1fr"
      count={4}
      gridMarginTop={24}
      numeralSize={108}
      rows="1fr 1fr"
      titleMargin="30px 0 0 0"
      titleSize={60}
    />
  );
}
