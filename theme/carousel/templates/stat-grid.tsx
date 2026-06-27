// StatGrid (2-up) — metrics in two content-sized columns that grow downward as
// more stats are shown.

import type { PanelProps } from "../define-theme";
import { StatLayout } from "./stat-layout";

export function StatGridSlide(props: PanelProps) {
  return (
    <StatLayout
      {...props}
      columns="repeat(2, max-content)"
      numeralSize={100}
      titleSize={52}
    />
  );
}
