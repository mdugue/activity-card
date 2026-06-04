// StatGrid (2-up) — metrics in two content-sized columns that grow downward as
// more stats are shown.

import type { TemplateProps } from "./shared";
import { StatLayout } from "./stat-layout";

export function StatGridSlide(props: TemplateProps) {
  return (
    <StatLayout
      {...props}
      columns="repeat(2, max-content)"
      numeralSize={100}
      titleSize={52}
    />
  );
}
