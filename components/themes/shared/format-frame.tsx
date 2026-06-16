// The Hybrid frame — retargets a single-card theme (authored at 1080×1350) into
// another aspect ratio WITHOUT taking the composition apart. The Instagram Feed
// (4:5) master is the benchmark: every element relationship (Altitude's
// number-sliced-by-the-curve, the photo themes' top/bottom protection, spacing)
// is preserved because the theme renders intact and is reframed as one unit.
//
//   • one continuous full-bleed background — the photo cover-fills the target
//     (a single layer, so there's no seam), or the theme's backdrop colour;
//   • the INTACT theme, contained into the FULL frame (`frameFit`, anchored by
//     `placement`) — so 9:16 is the exact Feed card with the photo extending
//     top/bottom, and 1:1 / 16:9 are the Feed composition uniformly scaled with
//     the photo bleeding the leftover axis.
//
// Pure inline CSS so html-to-image captures it identically to the preview.

import type { ReactNode } from "react";
import type { ColorScheme } from "@/lib/colors";
import { type ExportFormat, frameFit } from "@/lib/export-formats";
import type { ImageTransform } from "@/lib/image-transform";
import type { ThemeFramePolicy } from "@/lib/theme-contract";
import { CoverPhoto } from "./cover-photo";
import { usePhotoEffects, usePhotoImageSize } from "./photo-fx";

const CONTENT_W = 1080;
const CONTENT_H = 1350;

interface FormatFrameProps {
  /** the INTACT theme render (photo-led themes pass surface="transparent") */
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
  const fit = frameFit(format, CONTENT_W, CONTENT_H);
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

      {/* Gentle, uniform darken over the bled photo so the leftover bands don't
          jump in brightness against the card's own scrim edge. Subtle and
          additive — it does NOT replace the theme's own protection, and the 4:5
          master never goes through the frame so it's unaffected. */}
      {bleedPhoto ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.1)",
          }}
        />
      ) : null}

      {/* The INTACT composition, contained into the full frame. */}
      <div
        style={{
          position: "absolute",
          left: fit.x,
          top: fit.y,
          width: CONTENT_W,
          height: CONTENT_H,
          transform: `scale(${fit.scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
