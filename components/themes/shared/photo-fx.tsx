"use client";

// Shared photo plumbing for single-card themes. The active filter / grain /
// mirror / rotate AND the photo's natural size are provided once by
// `RenderTheme` and read by each photo layer via context — so every theme's
// background photo is adjustable without threading props through all eight
// theme components. Rendered directly (in stories) without a provider, the
// layers see `null` and render unfiltered, exactly as before.

import { createContext, useContext } from "react";
import type { ImageSize } from "@/hooks/use-image-natural-size";
import { GRAIN_BG, type PhotoEffects } from "@/lib/photo-effects";

export interface PhotoFx {
  effects: PhotoEffects | null;
  /** natural size of the photo — enables the rotation-correct cover layer */
  imageSize: ImageSize | null;
}

const PhotoFxContext = createContext<PhotoFx>({
  effects: null,
  imageSize: null,
});

export const PhotoFxProvider = PhotoFxContext.Provider;

export function usePhotoEffects(): PhotoEffects | null {
  return useContext(PhotoFxContext).effects;
}

export function usePhotoImageSize(): ImageSize | null {
  return useContext(PhotoFxContext).imageSize;
}

/** Analogue film grain overlaid on a photo (survives snapdom as an image).
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
