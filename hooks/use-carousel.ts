// Carousel slide-state manager. The deck (slide count) is fixed per theme — most
// themes are 3 slides, Frame/Press are 4 — so the user doesn't pick a deck;
// switching theme switches the count. This hook derives the slides from the
// chosen theme's panel count and tracks which slide is selected for the preview.

import { useCallback, useState } from "react";
import { buildSlides, type Slide } from "@/lib/carousel/types";

export interface CarouselController {
  /** reset selection to the first slide (e.g. when a new activity loads) */
  regenerate: () => void;
  select: (id: string) => void;
  selectedId: string | null;
  selectedIndex: number;
  slides: Slide[];
}

export function useCarousel(slideCount: number): CarouselController {
  // Deterministic, so this is stable across renders without memoisation.
  const slides = buildSlides(slideCount);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => slides[0]?.id ?? null
  );

  // Switching theme can change the count, invalidating the stored selection;
  // normalise to the first slide so downstream consumers never see a stale id.
  const validId = slides.some((s) => s.id === selectedId)
    ? selectedId
    : (slides[0]?.id ?? null);
  const selectedIndex = Math.max(
    0,
    slides.findIndex((s) => s.id === validId)
  );

  const select = useCallback((id: string) => setSelectedId(id), []);
  const regenerate = useCallback(
    () => setSelectedId(slides[0]?.id ?? null),
    [slides]
  );

  return {
    slides,
    selectedId: validId,
    selectedIndex,
    select,
    regenerate,
  };
}
