// React hook: extract the photo-adaptive palette from an image. Returns all
// five pre-built preset themes (`ExtractedPalette.themes`); selecting between
// them is the colour model's job (`resolveColors` over a photo-kind
// `ColorChoice` — see `lib/colors.ts`), not this hook's.
//
// `lib/palette` (node-vibrant + culori) is imported on demand inside the
// effect: it's only needed once a photo exists, so it stays out of the
// landing page's first-load bundle.

import { useEffect, useState } from "react";

import type { ExtractedPalette } from "@/lib/palette";

// Effect cleanup for the branch that started no extraction.
const noCleanup = (): void => {
  // No extraction was started, so there is nothing to cancel.
};

// Loads the extractor on demand, then runs it over the photo.
const extractPalette = async (src: string): Promise<ExtractedPalette> => {
  const { buildPaletteFromImage } = await import("@/lib/palette");
  return await buildPaletteFromImage(src);
};

/**
 * @param src object URL / data URL of the uploaded photo, or null when no photo
 * @returns the extracted palette, or null until one is ready. The previous
 *          palette is kept during a photo swap so consumers don't flash to
 *          their fallback between photos.
 */
export const useImagePalette = (
  src: string | null | undefined
): ExtractedPalette | null => {
  const [palette, setPalette] = useState<ExtractedPalette | null>(null);

  // The synchronous setState below is intentional: it synchronises internal
  // state to an external prop (`src`). The rule warns about cascades when an
  // effect sets state it also depends on — not the case here.
  useEffect(() => {
    if (src === null || src === undefined || src === "") {
      // oxlint-disable-next-line react/set-state-in-effect -- synchronising state to the `src` prop: no photo means no palette
      setPalette(null);
      return noCleanup;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const next = await extractPalette(src);
        if (!cancelled) {
          setPalette(next);
        }
      } catch {
        // Extraction (or loading the extractor) failed: drop to null so
        // consumers fall back to their theme defaults — legibility always wins.
        if (!cancelled) {
          setPalette(null);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [src]);

  return palette;
};
