"use client";

// Shared photo-effects plumbing for single-card themes. The active filter / grain
// / mirror is provided once by `RenderTheme` and read by each photo layer via
// context — so every theme's background photo is adjustable (filter presets,
// grain, mirror) without threading the effects prop through all eight theme
// components. Rendered directly (in stories) without a provider, the layers see
// `null` and render unfiltered, exactly as before.

import { createContext, useContext } from "react";
import { GRAIN_BG, type PhotoEffects } from "@/lib/photo-effects";

const PhotoEffectsContext = createContext<PhotoEffects | null>(null);

export const PhotoEffectsProvider = PhotoEffectsContext.Provider;

export function usePhotoEffects(): PhotoEffects | null {
  return useContext(PhotoEffectsContext);
}

/** Analogue film grain overlaid on a photo (survives html-to-image as an image).
 *  Lay it over the photo div inside the same clipped container. */
export function GrainOverlay() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: GRAIN_BG,
        backgroundRepeat: "repeat",
        backgroundSize: "180px 180px",
        mixBlendMode: "overlay",
        opacity: 0.5,
        pointerEvents: "none",
      }}
    />
  );
}
