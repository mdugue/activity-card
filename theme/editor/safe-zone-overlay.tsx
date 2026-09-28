// Platform keep-out guides for a format, scaled to a preview. Dims the platform
// UI zones and dashes the content box. A display-only layer — shared by the
// export sheet and the editor preview, and never part of an exported node.

import { contentBox } from "@/theme/core/export-formats";
import type { ExportFormat } from "@/theme/core/export-formats";

export const SafeZoneOverlay = ({
  format,
  scale,
}: {
  format: ExportFormat;
  scale: number;
}) => {
  const box = contentBox(format);
  const dim = "rgba(0,0,0,0.5)";
  const topH = box.y * scale;
  const bottomH = (format.height - (box.y + box.h)) * scale;
  const leftW = box.x * scale;
  const rightW = (format.width - (box.x + box.w)) * scale;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div
        style={{
          background: dim,
          height: topH,
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
        }}
      />
      <div
        style={{
          background: dim,
          bottom: 0,
          height: bottomH,
          left: 0,
          position: "absolute",
          right: 0,
        }}
      />
      <div
        style={{
          background: dim,
          bottom: bottomH,
          left: 0,
          position: "absolute",
          top: topH,
          width: leftW,
        }}
      />
      <div
        style={{
          background: dim,
          bottom: bottomH,
          position: "absolute",
          right: 0,
          top: topH,
          width: rightW,
        }}
      />
      <div
        style={{
          border: "1px dashed rgba(255,255,255,0.85)",
          height: box.h * scale,
          left: leftW,
          position: "absolute",
          top: topH,
          width: box.w * scale,
        }}
      />
    </div>
  );
};
