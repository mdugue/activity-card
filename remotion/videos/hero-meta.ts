// Composition metadata for the landing-page hero (hero.tsx): its size, frame
// rate, beat lengths and the derived total — kept apart from the component so
// Studio registration and the landing player import plain data.

import { LANDSCAPE } from "../design/tokens";

/** Scene lengths (frames @30fps), in playback order: opening · ingest · themes
 *  · colour · carousel · sports · CTA. */
export const HERO_BEATS = {
  carousel: 180,
  color: 136,
  cta: 150,
  ingest: 200,
  opening: 250,
  sports: 120,
  themes: 176,
} as const;

/** Transition lengths: the one guillotine cut after the opening, then fades. */
export const HERO_TRANSITIONS = { cut: 9, fade: 7 } as const;

export { FPS as HERO_FPS } from "../design/tokens";
export const HERO_WIDTH = LANDSCAPE.width;
export const HERO_HEIGHT = LANDSCAPE.height;
/** Every beat minus the transition overlaps (one cut + five fades). */
export const HERO_DURATION_IN_FRAMES =
  HERO_BEATS.opening +
  HERO_BEATS.ingest +
  HERO_BEATS.themes +
  HERO_BEATS.color +
  HERO_BEATS.carousel +
  HERO_BEATS.sports +
  HERO_BEATS.cta -
  (HERO_TRANSITIONS.cut + HERO_TRANSITIONS.fade * 5);
