// React hook: extract the photo-adaptive palette from an image. Returns all
// five pre-built preset themes (`ExtractedPalette.themes`); selecting between
// them is the colour model's job (`resolveColors` over a photo-kind
// `ColorChoice` — see `lib/colors.ts`), not this hook's.
//
// For heavy photos, buildPaletteFromImage can move into a Web Worker without
// changing this hook's shape — see the note at the bottom of palette.ts.

import { useEffect, useState } from "react";
import { buildPaletteFromImage, type ExtractedPalette } from "@/lib/palette";

/**
 * @param src object URL / data URL of the uploaded photo, or null when no photo
 * @returns the extracted palette, or null until one is ready. The previous
 *          palette is kept during a photo swap so consumers don't flash to
 *          their fallback between photos.
 */
export function useImagePalette(
  src: string | null | undefined
): ExtractedPalette | null {
  const [palette, setPalette] = useState<ExtractedPalette | null>(null);

  // The synchronous setState below is intentional: it synchronises internal
  // state to an external prop (`src`). The rule warns about cascades when an
  // effect sets state it also depends on — not the case here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!src) {
      setPalette(null);
      return;
    }
    let cancelled = false;
    buildPaletteFromImage(src)
      .then((next) => {
        if (!cancelled) {
          setPalette(next);
        }
      })
      .catch(() => {
        // Extraction failed (pathological image): drop to null so consumers
        // fall back to their theme defaults — legibility always wins.
        if (!cancelled) {
          setPalette(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [src]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return palette;
}
