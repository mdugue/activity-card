// Platform keep-out guides for a format, scaled to a preview. Dims the platform
// UI zones and dashes the content box. A display-only layer — shared by the
// export sheet and the editor preview, and never part of an exported node.

import type { CSSProperties } from "react";

import { contentBox } from "@/theme/core/export-formats";
import type { ExportFormat } from "@/theme/core/export-formats";

/** The scaled keep-out geometry, carried as CSS custom properties (px). */
interface SafeZoneStyle extends CSSProperties {
  "--sz-bottom": string;
  "--sz-box-h": string;
  "--sz-box-w": string;
  "--sz-left": string;
  "--sz-right": string;
  "--sz-top": string;
}

const px = (n: number): string => `${n}px`;

export const SafeZoneOverlay = ({
  format,
  scale,
}: {
  format: ExportFormat;
  scale: number;
}) => {
  const box = contentBox(format);
  const topH = box.y * scale;
  const bottomH = (format.height - (box.y + box.h)) * scale;
  const leftW = box.x * scale;
  const rightW = (format.width - (box.x + box.w)) * scale;
  const style: SafeZoneStyle = {
    "--sz-bottom": px(bottomH),
    "--sz-box-h": px(box.h * scale),
    "--sz-box-w": px(box.w * scale),
    "--sz-left": px(leftW),
    "--sz-right": px(rightW),
    "--sz-top": px(topH),
  };
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={style}
    >
      <div className="absolute inset-x-0 top-0 h-(--sz-top) bg-black/50" />
      <div className="absolute inset-x-0 bottom-0 h-(--sz-bottom) bg-black/50" />
      <div className="absolute top-(--sz-top) bottom-(--sz-bottom) left-0 w-(--sz-left) bg-black/50" />
      <div className="absolute top-(--sz-top) right-0 bottom-(--sz-bottom) w-(--sz-right) bg-black/50" />
      <div className="absolute top-(--sz-top) left-(--sz-left) h-(--sz-box-h) w-(--sz-box-w) border border-dashed border-white/85" />
    </div>
  );
};
