// Carousel "marks" — the optional chrome a deck can print: the "made with
// effort" signature mark and the "01 / 04" page numbers. These are
// carousel-ONLY (the single card has no such chrome), so they do NOT live in
// the cross-family `Visibility` interface. Instead they are ordinary theme
// params under the MARKS category, appended to every carousel theme by
// `defineCarouselTheme`: the editor renders them generically (no per-mode
// special case), and they persist in the per-theme config slot like any other
// knob. The deck reads them back out of the coerced config via `carouselMarks`.

import type { ParamDef } from "@/lib/params/kinds";

/** The two universal carousel marks, as MARKS-group toggle params. Default off
 *  so a fresh deck reads as a clean art piece. */
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

/** Default config slice for the marks — merged into every carousel theme's
 *  `defaults` so `coerceConfig` always has a value to fall back to. */
export const CAROUSEL_MARK_DEFAULTS = {
  showEffort: false,
  showPageNumber: false,
};

export interface CarouselMarks {
  showEffort: boolean;
  showPageNumber: boolean;
}

/** Read the deck-chrome marks back out of a coerced theme config. */
export function carouselMarks(config: Record<string, unknown>): CarouselMarks {
  return {
    showEffort: config.showEffort === true,
    showPageNumber: config.showPageNumber === true,
  };
}
