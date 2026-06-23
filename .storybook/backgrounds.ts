// Background photo presets for previewing themes in Storybook.
//
// Themes (single card + carousel) all take a `photoUrl`; this module supplies a
// set of free, sport-related Unsplash photos plus the wiring for a global
// toolbar dropdown. The companion `with-background.tsx` decorator resolves the
// chosen URL (toolbar preset, or a per-story file upload) and feeds it — with
// the measured natural size the carousel needs — into the rendered story.
//
// Images are loaded by the browser at runtime from images.unsplash.com (free to
// hotlink under the Unsplash license); nothing is bundled. `none` renders each
// theme on its own background so you can compare with/without a photo.

import type { GlobalTypes } from "storybook/internal/types";

export interface BackgroundPreset {
  label: string;
  url: string | null;
}

/** Extra (non-component) args the background controls add to a theme story.
 *  Intersect with a component's props in the story's `Meta<…>` type. */
export interface BackgroundArgs {
  /** Storybook `file` control value: object URLs for the uploaded image(s). */
  bgUpload?: string[];
}

// `auto=format` lets Unsplash serve webp/avif; `w=1600` keeps it light while
// staying sharp on the 1080-wide cards. Natural aspect ratio is preserved (no
// forced crop) so the carousel can pan within the true panorama.
const unsplash = (id: string): string =>
  `https://images.unsplash.com/photo-${id}?w=1600&q=80&auto=format`;

/** Keyed by the value stored in the `background` global. */
export const BACKGROUND_PRESETS: Record<string, BackgroundPreset> = {
  none: { label: "None", url: null },
  trackRunners: {
    label: "Running · track",
    url: unsplash("1502904550040-7534597429ae"),
  },
  peloton: {
    label: "Cycling · peloton",
    url: unsplash("1517649763962-0c623066013b"),
  },
  roadBike: {
    label: "Cycling · road bike",
    url: unsplash("1485965120184-e220f721d03e"),
  },
  swimmer: {
    label: "Swimming · pool",
    url: unsplash("1530549387789-4c1017266635"),
  },
  mountainTrail: {
    label: "Trail · mountains",
    url: unsplash("1551632811-561732d1e306"),
  },
  openRoad: {
    label: "Road · open",
    url: unsplash("1500530855697-b586d89ba3ee"),
  },
};

export const DEFAULT_BACKGROUND = "none";

/** Toolbar dropdown of preset backgrounds — applies across every theme story. */
export const backgroundGlobalTypes = {
  background: {
    name: "Background",
    description: "Background photo applied to theme stories",
    toolbar: {
      title: "Background",
      icon: "photo",
      dynamicTitle: true,
      items: Object.entries(BACKGROUND_PRESETS).map(([value, preset]) => ({
        value,
        title: preset.label,
      })),
    },
  },
} satisfies GlobalTypes;

/**
 * Per-story control for uploading a local image at runtime. When set it
 * overrides the toolbar preset, so you can drop in your own photo and see it
 * across the theme without leaving Storybook. Spread into a story meta's
 * `argTypes`.
 */
export const backgroundArgTypes = {
  bgUpload: {
    name: "Background upload",
    description:
      "Upload a local image to preview as the background. Overrides the toolbar Background.",
    control: { type: "file", accept: "image/*" },
    table: { category: "Background" },
  },
} as const;
