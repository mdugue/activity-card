// Composition metadata for the portrait social cut (hero-vertical.tsx): its
// size, frame rate, beat lengths and the derived total.

import { PORTRAIT } from "../design/tokens";

/** Scene lengths (frames @30fps), in playback order: opening · ingest · themes
 *  · colour · carousel · sports · CTA. */
export const HERO_VERTICAL_BEATS = {
  carousel: 165,
  color: 120,
  cta: 140,
  ingest: 180,
  opening: 230,
  sports: 104,
  themes: 160,
} as const;

/** Transition lengths: the one guillotine cut after the opening, then fades. */
export const HERO_VERTICAL_TRANSITIONS = { cut: 9, fade: 7 } as const;

export { FPS as HERO_VERTICAL_FPS } from "../design/tokens";
export const HERO_VERTICAL_WIDTH = PORTRAIT.width;
export const HERO_VERTICAL_HEIGHT = PORTRAIT.height;
/** Every beat minus the transition overlaps (one cut + five fades). */
export const HERO_VERTICAL_DURATION_IN_FRAMES =
  HERO_VERTICAL_BEATS.opening +
  HERO_VERTICAL_BEATS.ingest +
  HERO_VERTICAL_BEATS.themes +
  HERO_VERTICAL_BEATS.color +
  HERO_VERTICAL_BEATS.carousel +
  HERO_VERTICAL_BEATS.sports +
  HERO_VERTICAL_BEATS.cta -
  (HERO_VERTICAL_TRANSITIONS.cut + HERO_VERTICAL_TRANSITIONS.fade * 5);
