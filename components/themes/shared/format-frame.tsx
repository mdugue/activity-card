// The Hybrid frame — retargets a single-card theme (authored at 1080×1350)
// into another aspect ratio without re-laying-out the theme.
//
// Background bleeds full-bleed to the target canvas (the photo continued via
// the same cover geometry, or the theme's own backdrop colour for poster
// themes); the content block keeps its internal layout as one unit and is
// placed inside the format's SAFE ZONE (`placeContent`). This is "fill the safe
// zone", not "a tiny card in the middle": the block scales to as much of the
// safe box as its aspect allows.
//
// Pure inline CSS so html-to-image captures it identically to the preview.

import type { ReactNode } from "react";
import type { ColorScheme } from "@/lib/colors";
import { type ExportFormat, placeContent } from "@/lib/export-formats";
import type { ImageTransform } from "@/lib/image-transform";
import type { ThemeFramePolicy } from "@/lib/theme-contract";
import { CoverPhoto } from "./cover-photo";
import { usePhotoEffects, usePhotoImageSize } from "./photo-fx";

const CONTENT_W = 1080;
const CONTENT_H = 1350;

interface FormatFrameProps {
  /** the theme, already rendered (transparent surface for photo-bleed themes) */
  children: ReactNode;
  colors?: ColorScheme;
  format: ExportFormat;
  /** the active theme's frame policy (backdrop colour + photo-bleed flag) */
  frame?: ThemeFramePolicy;
  imageTransform?: ImageTransform | null;
  /** null when the backdrop toggle is off — then no full-bleed photo is drawn */
  photoUrl?: string | null;
}

export function FormatFrame({
  children,
  colors,
  format,
  frame,
  imageTransform,
  photoUrl,
}: FormatFrameProps) {
  const place = placeContent(format, CONTENT_W, CONTENT_H);
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
        {children}
      </div>
    </div>
  );
}
