// Platform keep-out guides for a format, scaled to a preview. Dims the platform
// UI zones and dashes the content box. A display-only layer — shared by the
// export sheet and the editor preview, and never part of an exported node.

import { contentBox, type ExportFormat } from "@/lib/export-formats";

export function SafeZoneOverlay({
  format,
  scale,
}: {
  format: ExportFormat;
  scale: number;
}) {
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
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: topH,
          background: dim,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: bottomH,
          background: dim,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: topH,
          left: 0,
          width: leftW,
          bottom: bottomH,
          background: dim,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: topH,
          right: 0,
          width: rightW,
          bottom: bottomH,
          background: dim,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: leftW,
          top: topH,
          width: box.w * scale,
          height: box.h * scale,
          border: "1px dashed rgba(255,255,255,0.85)",
        }}
      />
    </div>
  );
}
