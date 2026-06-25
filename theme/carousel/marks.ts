// Carousel "marks" — the optional chrome a deck prints (the "made with effort"
// mark, the "01 / 04" page numbers). Carousel-only, so they're ordinary MARKS
// params appended to every theme by `defineCarouselTheme` (not flags in the
// cross-family `Visibility`); the deck reads them back from the coerced config.

import type { ParamDef } from "@/theme/core/params/kinds";

/** The two universal carousel marks, as MARKS-group toggles. Default off. */
export const CAROUSEL_MARK_PARAMS: ParamDef[] = [
  {
    kind: "toggle",
    id: "showEffort",
    group: "marks",
    label: "“Made with Effort” mark",
    default: false,
  },
  {
    kind: "toggle",
    id: "showPageNumber",
    group: "marks",
    label: "Page numbers",
    default: false,
  },
];

export const CAROUSEL_MARK_DEFAULTS = {
  showEffort: false,
  showPageNumber: false,
};

/** Read the deck-chrome marks back out of a coerced theme config. */
export function carouselMarks(config: Record<string, unknown>) {
  return {
    showEffort: config.showEffort === true,
    showPageNumber: config.showPageNumber === true,
  };
}
