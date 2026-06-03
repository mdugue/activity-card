// Carousel slide-state manager. The user chooses a deck (3 or 4 slides) rather
// than adding/removing single slides; the slides are derived from the deck with
// stable ids. This hook tracks the chosen deck and which slide is selected for
// the preview. Styling is deck-wide and lives in app state (theme + accent).

import { useCallback, useState } from "react";
import {
  buildDeck,
  DEFAULT_DECK,
  type DeckId,
  type Slide,
} from "@/lib/carousel/types";

export interface CarouselController {
  deck: DeckId;
  /** reset selection to the first slide (e.g. when a new activity loads) */
  regenerate: () => void;
  select: (id: string) => void;
  selectedId: string | null;
  selectedIndex: number;
  setDeck: (deck: DeckId) => void;
  slides: Slide[];
}

export function useCarousel(): CarouselController {
  const [deck, setDeckState] = useState<DeckId>(DEFAULT_DECK);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => buildDeck(DEFAULT_DECK)[0]?.id ?? null
  );

  // Deterministic, so this is stable across renders without memoisation.
  const slides = buildDeck(deck);

  const setDeck = useCallback((next: DeckId) => {
    setDeckState(next);
    setSelectedId(buildDeck(next)[0]?.id ?? null);
  }, []);

  const select = useCallback((id: string) => setSelectedId(id), []);

  const regenerate = useCallback(() => {
    setSelectedId(buildDeck(deck)[0]?.id ?? null);
  }, [deck]);

  const selectedIndex = Math.max(
    0,
    slides.findIndex((s) => s.id === selectedId)
  );

  return {
    deck,
    slides,
    selectedId,
    selectedIndex,
    setDeck,
    select,
    regenerate,
  };
}
