// The Hybrid frame — retargets a single-card theme (authored at 1080×1350)
// into another aspect ratio without re-laying-out the theme.
//
// It renders the theme TWICE, element-aware:
//   • "back"  — cover-scaled to FILL the frame, so the theme's full-bleed
//     elements (scrims, route/elevation lines, decorative washes) run off every
//     edge instead of being boxed.
//   • "front" — contain-scaled into the platform SAFE ZONE (`placeContent`), so
//     the readable elements (headline, hero number, stats, date) stay clear of
//     platform UI and are never cropped.
// A soft, placement-aware scrim sits between them for photo-led themes, so text
// stays legible without the hard-edged box the single-pass version produced.
//
// Pure inline CSS so html-to-image captures it identically to the preview.

import type { ReactNode } from "react";
import type { ColorScheme } from "@/lib/colors";
import {
  coverFit,
  type ExportFormat,
  placeContent,
} from "@/lib/export-formats";
import type { ImageTransform } from "@/lib/image-transform";
import type { ThemeFramePolicy, ThemeLayer } from "@/lib/theme-contract";
import { CoverPhoto } from "./cover-photo";
import { usePhotoEffects, usePhotoImageSize } from "./photo-fx";

const CONTENT_W = 1080;
const CONTENT_H = 1350;

interface FormatFrameProps {
  colors?: ColorScheme;
  format: ExportFormat;
  /** the active theme's frame policy (backdrop colour + photo-bleed flag) */
  frame?: ThemeFramePolicy;
  imageTransform?: ImageTransform | null;
  /** null when the backdrop toggle is off — then no full-bleed photo is drawn */
  photoUrl?: string | null;
  /** render the theme for a given layer (called for "back" and "front") */
  renderLayer: (layer: ThemeLayer) => ReactNode;
}

/** A soft full-frame scrim that darkens toward where the content sits, so text
 *  reads over the bled photo without a hard edge. */
function softScrim(format: ExportFormat): string {
  if (format.placement === "upper") {
    return "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.12) 38%, rgba(0,0,0,0) 62%)";
  }
  if (format.placement === "lower") {
    return "linear-gradient(0deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.14) 40%, rgba(0,0,0,0) 66%)";
  }
  return "radial-gradient(120% 75% at 50% 50%, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.12) 55%, rgba(0,0,0,0) 100%)";
}

export function FormatFrame({
  colors,
  format,
  frame,
  imageTransform,
  photoUrl,
  renderLayer,
}: FormatFrameProps) {
  const place = placeContent(format, CONTENT_W, CONTENT_H);
  const cover = coverFit(format, CONTENT_W, CONTENT_H);
  const effects = usePhotoEffects();
  const imageSize = usePhotoImageSize();

  const backdrop =
    frame?.backdrop ??
    colors?.roles?.background ??
    colors?.primary ??
    "#0b0e13";
  const bleedPhoto = Boolean(frame?.photoBleed && photoUrl && imageSize);

  return (
    <div
      style={{
        position: "relative",
        width: format.width,
        height: format.height,
        overflow: "hidden",
        background: backdrop,
      }}
    >
      {bleedPhoto && photoUrl && imageSize ? (
        <CoverPhoto
          boxH={format.height}
          boxW={format.width}
          effects={effects}
          imageSize={imageSize}
          photoUrl={photoUrl}
          transform={imageTransform}
        />
      ) : null}

      {/* full-bleed BACK layer — scrims/route/elevation run off every edge */}
      <div
        style={{
          position: "absolute",
          left: cover.x,
          top: cover.y,
          width: CONTENT_W,
          height: CONTENT_H,
          transform: `scale(${cover.scale})`,
          transformOrigin: "top left",
        }}
      >
        {renderLayer("back")}
      </div>

      {/* soft, placement-aware legibility scrim (photo-led themes only) */}
      {frame?.photoBleed ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: softScrim(format),
          }}
        />
      ) : null}

      {/* readable FRONT layer — placed inside the platform safe zone */}
      <div
        style={{
          position: "absolute",
          left: place.x,
          top: place.y,
          width: CONTENT_W,
          height: CONTENT_H,
          transform: `scale(${place.scale})`,
          transformOrigin: "top left",
        }}
      >
        {renderLayer("front")}
      </div>
    </div>
  );
}
