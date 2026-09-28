// The PHOTO descriptor: identity, capability declaration, colour +
// photo policy — the row `SINGLE_CARD_THEMES` collects. Kept out of
// `photo.tsx` so that module exports only its component (Fast Refresh).

import { defineTheme } from "@/theme/core/theme-contract";

import { ThemePhoto } from "./photo";

const USES = ["athleteName", "elevation", "location", "pace", "route"] as const;

export type PhotoCapability = (typeof USES)[number];

export const photoTheme = defineTheme({
  Component: ThemePhoto,
  // Adjustable, and photo-first: until the user picks, the colours come from
  // the photo (the old PhotoMood, now the shared photo-derived colour source).
  colors: {
    default: { onPrimary: "#0a0a0a", primary: "#c89d6e" },
    defaultChoice: { kind: "photo", variant: "vibrant" },
    userAdjustable: true,
  },
  id: "photo",
  label: "PHOTO",
  photo: { defaultOn: true },
  tagline: "magazine cover",
  uses: USES,
});
