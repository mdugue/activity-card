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

import {
  IDENTITY_TRANSFORM,
  type ImageTransform,
  transformToCss,
} from "@/lib/image-transform";
import {
  effectsTransformSuffix,
  filterCss,
  isQuarterTurn,
} from "@/lib/photo-effects";
import { usePhotoEffects } from "./photo-fx";

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
  const fx = usePhotoEffects();
  const userFilter = fx ? filterCss(fx.filter) : "";
  const suffix = effectsTransformSuffix(fx);
  const transform = `${transformToCss(imageTransform ?? IDENTITY_TRANSFORM)}${suffix}`;
  // A quarter-turn shortens the rotated footprint vertically; bleeding the
  // blurred wash further keeps the corners covered (the blur hides the edge).
  const bleed = fx && isQuarterTurn(fx.rotate) ? -160 : null;
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
        <div
          style={{
            position: "absolute",
            inset: bleed ?? -40,
            backgroundImage: `url(${photoUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform,
            transformOrigin: "center center",
            filter: `blur(14px) saturate(0.85) ${userFilter}`.trim(),
            opacity: 0.55,
          }}
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
      <div
        style={{
          position: "absolute",
          inset: bleed ?? -30,
          backgroundImage: `url(${photoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform,
          transformOrigin: "center center",
          filter:
            `blur(10px) saturate(0.7) contrast(0.95) ${userFilter}`.trim(),
          opacity: 0.22,
        }}
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
