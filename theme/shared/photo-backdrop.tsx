// Shared photo-backdrop layer used by "supports" themes so a user-uploaded
// photo can enrich themes that otherwise wouldn't show it. Each treatment is
// hand-tuned to protect that theme's specific text layout.
//
// Implementation notes:
// - We use CSS background-image rather than <img>; this layer is purely
//   decorative, has no semantic meaning, and avoids next/image complaints
//   about blob URLs that the server-side optimiser can't process.
// - Blur is applied via inline `filter`, not `backdrop-filter`. The latter is
//   unreliable inside snapdom's foreignObject snapshot and broken in iOS Safari
//   for our export path.

import type { ImageTransform } from "@/lib/image-transform";
import { CssCoverImage } from "./photo-fx";

export type BackdropTreatment = "path" | "editorial";

interface PhotoBackdropProps {
  imageTransform?: ImageTransform | null;
  photoUrl: string;
  treatment: BackdropTreatment;
}

export function PhotoBackdrop({
  photoUrl,
  treatment,
  imageTransform,
}: PhotoBackdropProps) {
  if (treatment === "path") {
    // Paper-tone overlay multiplies down the photo so the route ink stays the
    // hero. 14px blur softens any detail the eye might catch.
    return (
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <CssCoverImage
          filterPrefix="blur(14px) saturate(0.85)"
          imageTransform={imageTransform}
          opacity={0.55}
          photoUrl={photoUrl}
          restInset={-40}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#f3ede2",
            mixBlendMode: "multiply",
            opacity: 0.7,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(243,237,226,0) 0%, rgba(243,237,226,0.55) 80%)",
          }}
        />
      </div>
    );
  }

  // editorial: full image at low opacity behind dense type, with a strong
  // vertical paper-scrim top and bottom so headlines and the footer remain
  // legible on busy photos.
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <CssCoverImage
        filterPrefix="blur(10px) saturate(0.7) contrast(0.95)"
        imageTransform={imageTransform}
        opacity={0.22}
        photoUrl={photoUrl}
        restInset={-30}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, #efe9dc 0%, rgba(239,233,220,0.6) 18%, rgba(239,233,220,0.45) 50%, rgba(239,233,220,0.7) 82%, #efe9dc 100%)",
        }}
      />
    </div>
  );
}
