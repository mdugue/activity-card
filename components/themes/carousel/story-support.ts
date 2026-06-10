// Shared story args for the carousel theme stories. Each per-theme story file
// (`trace.stories.tsx`, `ascent.stories.tsx`, …) renders the shared
// `CarouselDeck` with one theme descriptor; this supplies that theme's static
// args — its descriptor, own accent scheme, and default photo filter + grain
// (the look the app applies when the theme is chosen). The background photo
// (`photoUrl` / `imageSize`) is injected by the global `withBackground`
// decorator, so it isn't set here.

import type { CarouselThemeId } from "@/lib/carousel/theme-tokens";
import { NO_EFFECTS } from "@/lib/photo-effects";
import { CAROUSEL_THEMES } from "./registry";

export function carouselArgs(id: CarouselThemeId) {
  const theme = CAROUSEL_THEMES[id];
  return {
    theme,
    colors: theme.colors.default,
    photoEffects: {
      ...NO_EFFECTS,
      filter: theme.photo.defaultFilter ?? "none",
      grain: theme.photo.defaultGrain ?? false,
    },
  };
}
