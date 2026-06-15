/**
 * Design tokens for the Effort video system — the single source every
 * composition styles from. Values mirror the app's identity (app/globals.css,
 * the theme palettes, the empty-state intro's motion) as static strings:
 * compositions must render identically in the on-page <Player>, Remotion
 * Studio, and the CLI renderer, and only the first of those can see the app's
 * CSS custom properties.
 */

import { Easing } from "remotion";

/* ───────────────────────── canvas ───────────────────────── */

export const FPS = 30;
export const LANDSCAPE = { width: 1920, height: 1080 } as const;
export const PORTRAIT = { width: 1080, height: 1920 } as const;
/** The app's export size for one card; a carousel strip is n× this width. */
export const CARD = { width: 1080, height: 1350 } as const;

/* ───────────────────────── colour ───────────────────────── */
// The warm ink / paper / rust identity. Ink and paper carry the same whisper
// of warmth as the app's neutrals (hue ~60–75) so the stage reads as ink and
// paper, never cold slate.

/** The video stage — warm near-black (the brand's "ink"). */
export const INK = "#1f1a16";
/** A raised panel sitting just above the ink stage (≈ dark-mode --card). */
export const INK_RAISED = "#2a231d";
/** Warm off-white (≈ light-mode --background). */
export const PAPER = "#f7f3ec";
/** Muted copy on ink — body text that shouldn't compete with a claim. */
export const PAPER_DIM = "rgba(247, 243, 236, 0.64)";
/** Quiet captions / rules on ink. */
export const PAPER_FAINT = "rgba(247, 243, 236, 0.38)";
/** The rust brand accent (≈ --primary, oklch(0.555 0.163 49)). */
export const RUST = "#c45a2c";
/** The accent lifted for dark grounds (≈ dark-mode --primary). */
export const RUST_BRIGHT = "#e0683a";
/** Warm tan support colour (the carousel Dusk secondary). */
export const TAN = "#caa46a";
/** Ink-on-paper body colour for paper scenes (≈ light-mode --foreground). */
export const INK_SOFT = "#2e2820";

/* ───────────────────────── type ───────────────────────── */
// Families come from the `--font-*` variables (design/fonts.ts re-creates the
// app's set outside Next). Sizes are tuned for a 1080-tall canvas; portrait
// scenes reuse them as-is — the 1080-wide column reads the same.

export const FONT = {
  /** Anton — claims, headlines, the wordmark. Uppercase, tracking-wide. */
  heading: "var(--font-heading)",
  /** Inter — body copy. */
  sans: "var(--font-sans)",
  /** JetBrains Mono — caption labels, stats, file chips. */
  mono: "var(--font-mono)",
} as const;

export const TYPE = {
  /** hero claims (Anton, uppercase) */
  claim: 132,
  /** scene headlines (Anton, uppercase) */
  headline: 84,
  /** sub-headlines / big stats */
  title: 54,
  /** body copy (Inter) */
  body: 34,
  /** mono caption labels (uppercase, TRACKING.label) */
  caption: 26,
  /** smallest mono captions (uppercase, TRACKING.micro) */
  micro: 21,
} as const;

/** Letterspacing recipes lifted from the app's caption utilities. */
export const TRACKING = {
  /** Anton display lines (≈ tracking-wide) */
  heading: "0.025em",
  /** caption-label: mono overlines */
  label: "0.28em",
  /** caption-micro: small mono captions */
  micro: "0.18em",
} as const;

/* ───────────────────────── spacing / radius ───────────────────────── */

/** Safe-area inset every scene keeps clear of the canvas edge. */
export const SAFE = 96;
export const SPACE = { xs: 12, sm: 24, md: 48, lg: 72 } as const;
/** Scaled-for-video cousins of the app's --radius scale. */
export const RADIUS = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

/* ───────────────────────── motion ───────────────────────── */
// The app's settle curves — entrances ease out, nothing bounces.

/** Panel open/close (control deck): cubic-bezier(0.32, 0.72, 0, 1). */
export const EASE_PANEL = Easing.bezier(0.32, 0.72, 0, 1);
/** Element rise-ins (empty-state intro): cubic-bezier(0.2, 0.7, 0.2, 1). */
export const EASE_RISE = Easing.bezier(0.2, 0.7, 0.2, 1);
/** The cut-slice motif: cubic-bezier(0.65, 0, 0.35, 1). */
export const EASE_CUT = Easing.bezier(0.65, 0, 0.35, 1);

/** Rise distances (px) used by the app's entrances. */
export const RISE_PX = 14;
export const RISE_LG_PX = 18;

/** Duration norms in frames at 30 fps. */
export const DUR = {
  /** 300ms — micro transitions, UI beats */
  fast: 9,
  /** ~470ms — scene-to-scene transitions */
  scene: 14,
  /** ~570ms — element entrances */
  rise: 17,
  /** ~800ms — a settled hold before the next beat */
  beat: 24,
} as const;

/** The app's no-bounce entrance spring (`damping: 200`). */
export const SETTLE_SPRING = { damping: 200 } as const;

/** A lively entrance with a small overshoot — for the beats that earn a bounce
 *  (the EFFORT word landing, a card settling). The one place the brand's calm
 *  motion is allowed a little spring. */
export const BOUNCE_SPRING = {
  damping: 12,
  mass: 0.8,
  stiffness: 150,
} as const;
/** A touch more overshoot, for a single hero accent. */
export const POP_SPRING = { damping: 9, mass: 0.7, stiffness: 170 } as const;

/** A snappy ease-in-out for cross-fade alpha (Material "fade-through" style):
 *  outgoing clears over the first third, incoming arrives over the rest. */
export const EASE_ALPHA = Easing.bezier(0.4, 0, 0.2, 1);

/** Stagger between sibling entrances, in frames (the intro's 0.18s / 0.09s). */
export const STAGGER = { slices: 5, items: 3 } as const;
