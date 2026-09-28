// Loads an image just to read its natural dimensions. The carousel needs the
// real aspect ratio to size the panorama at its true cover size, so the photo
// can be panned within the actual overflow (the wide strip usually leaves a
// lot of vertical slack). Returns null until known / when there's no photo.

import { useEffect, useState } from "react";

export interface ImageSize {
  h: number;
  w: number;
}

// Effect cleanup for the branch that started no load.
const noCleanup = (): void => {
  // No image load was started, so there is nothing to cancel.
};

export const useImageNaturalSize = (
  src: string | null | undefined
): ImageSize | null => {
  const [size, setSize] = useState<ImageSize | null>(null);

  // Re-measure whenever the photo changes — synchronising state to the `src`
  // prop, the legitimate setState-in-effect case.
  useEffect(() => {
    if (src === null || src === undefined || src === "") {
      // oxlint-disable-next-line react/set-state-in-effect -- synchronising state to the `src` prop: no photo means no size
      setSize(null);
      return noCleanup;
    }
    let cancelled = false;
    const img = new Image();
    const onLoad = () => {
      if (!cancelled && img.naturalWidth > 0) {
        setSize({ h: img.naturalHeight, w: img.naturalWidth });
      }
    };
    const onError = () => {
      if (!cancelled) {
        setSize(null);
      }
    };
    img.addEventListener("load", onLoad);
    img.addEventListener("error", onError);
    img.src = src;
    return () => {
      cancelled = true;
      img.removeEventListener("load", onLoad);
      img.removeEventListener("error", onError);
    };
  }, [src]);

  return size;
};
