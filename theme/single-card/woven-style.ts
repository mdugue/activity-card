// Shared style constants of the "woven" themes (see `woven-parts.tsx`). Kept
// out of the `.tsx` module so that one exports only components (Fast Refresh).

export const SERIF = "var(--font-instrument-serif), Georgia, serif";
export const MONO = "var(--font-ibm-plex-mono), ui-monospace, monospace";
export const SANS = "var(--font-bricolage), system-ui, sans-serif";

/** Type scale: 1 on the 1080-wide portrait masters, smaller on square and
 *  landscape canvases so captions keep their proportion to the picture. */
export const typeScale = (width: number, height: number): number =>
  Math.min(width, height * 0.8) / 1080;

/** Sport-tinted dark wash for a woven card with no photo yet. */
export const fallbackWash = (sport: string): string => {
  if (sport === "swim") {
    return "linear-gradient(180deg, #2b5872 0%, #0d2231 100%)";
  }
  if (sport === "run") {
    return "linear-gradient(180deg, #7a4a32 0%, #24140d 100%)";
  }
  return "linear-gradient(180deg, #4d5d72 0%, #1b2129 100%)";
};
