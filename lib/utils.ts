import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge only knows Tailwind's default scale. Register the theme
// tokens and utilities app/globals.css adds, so `cn()` resolves conflicts with
// them — e.g. a `tracking-caps` passed to a primitive whose own classes carry
// `tracking-widest` replaces it instead of both landing and the stylesheet
// order deciding. Keep this in sync with the `@theme` / `@utility` additions.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      pb: [{ pb: ["safe"] }],
      transition: [
        { transition: ["drawer", "height", "outline", "size-colors"] },
      ],
    },
    theme: {
      animate: ["aura", "route-draw", "scroll-cue"],
      color: ["strava"],
      ease: ["drawer"],
      leading: ["display", "display-loose", "display-tight"],
      shadow: ["lift", "scrim"],
      text: ["2xs", "3xs"],
      tracking: [
        "caps",
        "caps-display",
        "caps-lg",
        "caps-md",
        "caps-sm",
        "caps-xl",
        "caps-xs",
      ],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
