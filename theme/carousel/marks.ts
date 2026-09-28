// Carousel "marks" — the optional chrome a deck prints (the "made with effort"
// mark, the "01 / 04" page numbers). Carousel-only, so they're ordinary MARKS
// params appended to every theme by `defineCarouselTheme` (not flags in the
// cross-family `Visibility`); the deck reads them back from the coerced config.

import type { ParamDef } from "@/theme/core/params/kinds";

/** The two universal carousel marks, as MARKS-group toggles. Default off. */
export const CAROUSEL_MARK_PARAMS: ParamDef[] = [
  {
    default: false,
    group: "marks",
    id: "showEffort",
    kind: "toggle",
    label: "“Made with Effort” mark",
  },
  {
    default: false,
    group: "marks",
    id: "showPageNumber",
    kind: "toggle",
    label: "Page numbers",
  },
];

export const CAROUSEL_MARK_DEFAULTS = {
  showEffort: false,
  showPageNumber: false,
};

/** Read the deck-chrome marks back out of a coerced theme config. */
export const carouselMarks = (config: Record<string, unknown>) => ({
  showEffort: config.showEffort === true,
  showPageNumber: config.showPageNumber === true,
});
