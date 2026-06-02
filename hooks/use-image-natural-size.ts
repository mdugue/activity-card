// Loads an image just to read its natural dimensions. The carousel needs the
// real aspect ratio to size the panorama at its true cover size, so the photo
// can be panned within the actual overflow (the wide strip usually leaves a
// lot of vertical slack). Returns null until known / when there's no photo.

import { useEffect, useState } from "react";

export interface ImageSize {
  h: number;
  w: number;
}

export function useImageNaturalSize(
  src: string | null | undefined
): ImageSize | null {
  const [size, setSize] = useState<ImageSize | null>(null);

  // Re-measure whenever the photo changes — synchronising state to the `src`
  // prop, the legitimate setState-in-effect case.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!src) {
      setSize(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled && img.naturalWidth > 0) {
        setSize({ w: img.naturalWidth, h: img.naturalHeight });
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        setSize(null);
      }
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return size;
}
