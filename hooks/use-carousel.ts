// Carousel slide-selection state. The slide count is fixed per theme (it's the
// theme's panel count — most are 3, Frame/Press are 4), so the user doesn't
// pick a deck; switching theme switches the count. A slide is just an index
// into the seamless strip, so selection is one clamped integer.

import { useCallback, useState } from "react";

export interface CarouselController {
  /** number of slides — the active theme's panel count */
  count: number;
  /** reset selection to the first slide (e.g. when a new activity loads) */
  regenerate: () => void;
  select: (index: number) => void;
  selectedIndex: number;
}

export function useCarousel(count: number): CarouselController {
  const [selected, setSelected] = useState(0);
  // Switching to a theme with fewer slides clamps the selection, so downstream
  // consumers never see an out-of-range index.
  const selectedIndex = Math.max(0, Math.min(selected, count - 1));

  const select = useCallback((index: number) => setSelected(index), []);
  const regenerate = useCallback(() => setSelected(0), []);

  return { count, selectedIndex, select, regenerate };
}
