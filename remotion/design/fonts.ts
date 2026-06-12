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

function loadAll(): CSSProperties {
  const inter = loadInter("normal", {
    weights: ["400", "500", "600", "700"],
    subsets: [...LATIN],
  });
  const anton = loadAnton("normal", {
    weights: ["400"],
    subsets: [...LATIN],
  });
  const jetbrainsMono = loadJetBrainsMono("normal", {
    weights: ["400", "500", "600", "700"],
    subsets: [...LATIN],
  });
  const cormorant = loadCormorant("normal", {
    weights: ["400", "500", "600", "700"],
    subsets: [...LATIN],
  });
  loadCormorant("italic", {
    weights: ["400", "500", "600", "700"],
    subsets: [...LATIN],
  });
  const manrope = loadManrope("normal", {
    weights: ["400", "600", "700"],
    subsets: [...LATIN],
  });
  const spaceGrotesk = loadSpaceGrotesk("normal", {
    weights: ["400", "500", "600", "700"],
    subsets: [...LATIN],
  });
  const syne = loadSyne("normal", {
    weights: ["600", "700", "800"],
    subsets: [...LATIN],
  });
  const playfair = loadPlayfair("normal", {
    weights: ["400", "500", "600", "700"],
    subsets: [...LATIN],
  });
  loadPlayfair("italic", {
    weights: ["400", "500", "600", "700"],
    subsets: [...LATIN],
  });
  const dmSans = loadDmSans("normal", {
    weights: ["400", "500", "700"],
    subsets: [...LATIN],
  });
  const archivoNarrow = loadArchivoNarrow("normal", {
    weights: ["400", "500", "600", "700"],
    subsets: [...LATIN],
  });
  const instrumentSerif = loadInstrumentSerif("normal", {
    weights: ["400"],
    subsets: [...LATIN],
  });
  loadInstrumentSerif("italic", {
    weights: ["400"],
    subsets: [...LATIN],
  });
  const bricolage = loadBricolage("normal", {
    weights: ["400", "500", "600", "700", "800"],
    subsets: [...LATIN],
  });
  const ibmPlexMono = loadIbmPlexMono("normal", {
    weights: ["400", "500", "600", "700"],
    subsets: [...LATIN],
  });
  const geistMono = loadGeistMono("normal", {
    weights: ["400", "500", "600", "700"],
    subsets: [...LATIN],
  });

  // The exact variable names from lib/fonts.ts — one list, every entry point.
  return {
    "--font-sans": inter.fontFamily,
    "--font-heading": anton.fontFamily,
    "--font-mono": jetbrainsMono.fontFamily,
    "--font-cormorant": cormorant.fontFamily,
    "--font-manrope": manrope.fontFamily,
    "--font-space-grotesk": spaceGrotesk.fontFamily,
    "--font-syne": syne.fontFamily,
    "--font-playfair": playfair.fontFamily,
    "--font-dm-sans": dmSans.fontFamily,
    "--font-archivo-narrow": archivoNarrow.fontFamily,
    "--font-instrument-serif": instrumentSerif.fontFamily,
    "--font-bricolage": bricolage.fontFamily,
    "--font-ibm-plex-mono": ibmPlexMono.fontFamily,
    "--font-geist-mono": geistMono.fontFamily,
  } as CSSProperties;
}

let cached: CSSProperties | null = null;

export function getFontVars(): CSSProperties {
  if (getRemotionEnvironment().isPlayer) {
    return {};
  }
  cached ??= loadAll();
  return cached;
}
