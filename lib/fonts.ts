// Single source of truth for the app's web fonts.
//
// Every theme (single-card and carousel) reaches for its typeface through a
// `--font-*` CSS variable rather than importing a font directly. Those
// variables only exist when the matching `next/font` loader's `.variable`
// class is present on a common ancestor of the rendered card. The app applies
// the whole set on `<html>` (`app/layout.tsx`); Storybook applies the same set
// via a decorator (`.storybook/preview.tsx`). Keeping the loaders here means
// both entry points share one list, so a theme can never render with its real
// font in the app but a system fallback in Storybook (or vice versa).
//
// `next/font` is a build-time transform, so the bytes are emitted regardless of
// which file imports the loader; loading the full set once on the root is both
// the simplest and the same thing the app does in production.

import {
  Anton,
  Archivo_Narrow,
  Bricolage_Grotesque,
  Cormorant_Garamond,
  DM_Sans,
  Geist_Mono,
  IBM_Plex_Mono,
  Instrument_Serif,
  Inter,
  JetBrains_Mono,
  Manrope,
  Playfair_Display,
  Space_Grotesk,
  Syne,
} from "next/font/google";
import { cn } from "@/lib/utils";

export const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const anton = Anton({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-heading",
});

export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-cormorant",
});

export const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const syne = Syne({
  weight: ["600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-syne",
});

export const playfair = Playfair_Display({
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-playfair",
});

export const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

export const archivoNarrow = Archivo_Narrow({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-archivo-narrow",
});

export const instrumentSerif = Instrument_Serif({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

export const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

export const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
});

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

/**
 * Every `--font-*` variable class in one string. Put this on an ancestor of any
 * card so each theme's `fontFamily: var(--font-*)` resolves to the real face.
 */
export const fontVariables = cn(
  inter.variable,
  anton.variable,
  jetbrainsMono.variable,
  cormorant.variable,
  manrope.variable,
  spaceGrotesk.variable,
  syne.variable,
  playfair.variable,
  dmSans.variable,
  archivoNarrow.variable,
  instrumentSerif.variable,
  bricolage.variable,
  ibmPlexMono.variable,
  geistMono.variable
);
