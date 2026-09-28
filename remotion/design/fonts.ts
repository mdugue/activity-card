/**
 * Fonts for the video system — the mirror of `lib/fonts.ts` outside Next.
 *
 * Inside the app, the on-page <Player> renders inline in the page, so every
 * `--font-*` variable from next/font on `<html>` cascades into the video and
 * nothing must be re-downloaded. Remotion Studio and the CLI renderer load no
 * app CSS at all; there this module fetches the same families from Google
 * Fonts (render-blocking, so output is deterministic) and re-creates the
 * variable set under the exact names the app uses — theme components and
 * Tailwind's font utilities resolve identically in all three environments.
 *
 * `getFontVars()` returns {} in the player (inherit next/font) and the
 * complete set elsewhere; `VideoFrame` applies it on every composition root.
 * It MUST be called during render, not at module scope: the player only sets
 * its environment flag (`window.remotion_isPlayer`) while the <Player>
 * component renders, so a module-scope check would mis-detect the app as
 * Studio and re-download every family from Google Fonts.
 */

import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadArchivoNarrow } from "@remotion/google-fonts/ArchivoNarrow";
import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadDmSans } from "@remotion/google-fonts/DMSans";
import { loadFont as loadGeistMono } from "@remotion/google-fonts/GeistMono";
import { loadFont as loadIbmPlexMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadInstrumentSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadManrope } from "@remotion/google-fonts/Manrope";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadSyne } from "@remotion/google-fonts/Syne";
import type { CSSProperties } from "react";
import { getRemotionEnvironment } from "remotion";

const LATIN = ["latin"] as const;

const loadAll = (): CSSProperties => {
  const inter = loadInter("normal", {
    subsets: [...LATIN],
    weights: ["400", "500", "600", "700"],
  });
  const anton = loadAnton("normal", {
    subsets: [...LATIN],
    weights: ["400"],
  });
  const jetbrainsMono = loadJetBrainsMono("normal", {
    subsets: [...LATIN],
    weights: ["400", "500", "600", "700"],
  });
  const cormorant = loadCormorant("normal", {
    subsets: [...LATIN],
    weights: ["400", "500", "600", "700"],
  });
  loadCormorant("italic", {
    subsets: [...LATIN],
    weights: ["400", "500", "600", "700"],
  });
  const manrope = loadManrope("normal", {
    subsets: [...LATIN],
    weights: ["400", "600", "700"],
  });
  const spaceGrotesk = loadSpaceGrotesk("normal", {
    subsets: [...LATIN],
    weights: ["400", "500", "600", "700"],
  });
  const syne = loadSyne("normal", {
    subsets: [...LATIN],
    weights: ["600", "700", "800"],
  });
  const playfair = loadPlayfair("normal", {
    subsets: [...LATIN],
    weights: ["400", "500", "600", "700"],
  });
  loadPlayfair("italic", {
    subsets: [...LATIN],
    weights: ["400", "500", "600", "700"],
  });
  const dmSans = loadDmSans("normal", {
    subsets: [...LATIN],
    weights: ["400", "500", "700"],
  });
  const archivoNarrow = loadArchivoNarrow("normal", {
    subsets: [...LATIN],
    weights: ["400", "500", "600", "700"],
  });
  const instrumentSerif = loadInstrumentSerif("normal", {
    subsets: [...LATIN],
    weights: ["400"],
  });
  loadInstrumentSerif("italic", {
    subsets: [...LATIN],
    weights: ["400"],
  });
  const bricolage = loadBricolage("normal", {
    subsets: [...LATIN],
    weights: ["400", "500", "600", "700", "800"],
  });
  const ibmPlexMono = loadIbmPlexMono("normal", {
    subsets: [...LATIN],
    weights: ["400", "500", "600", "700"],
  });
  const geistMono = loadGeistMono("normal", {
    subsets: [...LATIN],
    weights: ["400", "500", "600", "700"],
  });

  // The exact variable names from lib/fonts.ts — one list, every entry point.
  return {
    "--font-archivo-narrow": archivoNarrow.fontFamily,
    "--font-bricolage": bricolage.fontFamily,
    "--font-cormorant": cormorant.fontFamily,
    "--font-dm-sans": dmSans.fontFamily,
    "--font-geist-mono": geistMono.fontFamily,
    "--font-heading": anton.fontFamily,
    "--font-ibm-plex-mono": ibmPlexMono.fontFamily,
    "--font-instrument-serif": instrumentSerif.fontFamily,
    "--font-manrope": manrope.fontFamily,
    "--font-mono": jetbrainsMono.fontFamily,
    "--font-playfair": playfair.fontFamily,
    "--font-sans": inter.fontFamily,
    "--font-space-grotesk": spaceGrotesk.fontFamily,
    "--font-syne": syne.fontFamily,
  } as CSSProperties;
};

let cached: CSSProperties | null = null;

export const getFontVars = (): CSSProperties => {
  if (getRemotionEnvironment().isPlayer) {
    return {};
  }
  cached ??= loadAll();
  return cached;
};
