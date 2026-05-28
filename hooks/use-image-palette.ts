// React hook: derive a contrast-checked, role-based theme from a photo.
// Returns the palette plus the currently selected variant's theme.
// The variant ("mood") is owned by the caller — pass it in and the hook
// selects the matching theme. Lifting variant ownership avoids dual state
// (caller + hook) and lets the variant outlive any single mount of the hook.
//
// For heavy photos, buildPaletteFromImage can move into a Web Worker without
// changing this hook's shape — see the note at the bottom of palette.ts.

import type * as React from "react";
import { useEffect, useState } from "react";
import {
  buildPaletteFromImage,
  type ExtractedPalette,
  type PaletteTheme,
  type PaletteVariant,
  PURE_THEME,
} from "@/lib/palette";

// `palette` is held during loading transitions so consumers don't flash to a
// neutral fallback between the old photo and the new one.
type State =
  | { status: "idle" }
  | { palette: ExtractedPalette | null; status: "loading" }
  | { palette: ExtractedPalette; status: "ready" }
  | { error: Error; palette: ExtractedPalette | null; status: "error" };

export type PaletteStatus = State["status"];

export interface UseImagePalette {
  error: Error | null;
  /** All five preset themes, or null until ready. */
  palette: ExtractedPalette | null;
  status: PaletteStatus;
  /** The currently selected theme, ready to map onto CSS variables. */
  theme: PaletteTheme | null;
}

/**
 * @param src      object URL / data URL of the uploaded photo, or null when no photo
 * @param variant  which preset to select (caller-owned)
 */
export function useImagePalette(
  src: string | null | undefined,
  variant: PaletteVariant = "vibrant"
): UseImagePalette {
  const [state, setState] = useState<State>({ status: "idle" });

  // The synchronous setState calls below are intentional: they synchronise
  // internal status to an external prop (`src`). The rule warns about
  // cascades when an effect sets state it also depends on — that's not the
  // case here, so the suppression is targeted.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!src) {
      setState({ status: "idle" });
      return;
    }

    let cancelled = false;
    // Keep the previous palette around during loading so the card doesn't
    // flash to its neutral fallback between photos.
    setState((prev) => ({
      status: "loading",
      palette: "palette" in prev ? prev.palette : null,
    }));

    buildPaletteFromImage(src)
      .then((palette) => {
        if (!cancelled) {
          setState({ status: "ready", palette });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState((prev) => ({
            status: "error",
            error:
              err instanceof Error
                ? err
                : new Error("Palette extraction failed"),
            palette: "palette" in prev ? prev.palette : null,
          }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const palette = "palette" in state ? state.palette : null;

  // Pure ignores the swatches entirely, so it must not wait on extraction.
  // Return PURE_THEME as soon as there's a photo source — even during
  // loading or after a failed extraction — so the user can always opt out
  // to the typographic look. Without this, picking Pure mid-extraction (or
  // after an error) would drop to the sport-tinted static fallback.
  let theme: PaletteTheme | null;
  if (variant === "pure") {
    theme = src ? PURE_THEME : null;
  } else {
    theme = palette ? palette.themes[variant] : null;
  }

  return {
    status: state.status,
    palette,
    theme,
    error: state.status === "error" ? state.error : null,
  };
}

/**
 * Map a PaletteTheme onto CSS custom properties for a theme component.
 * Spread the result onto the card's root style.
 */
export function paletteToCssVars(theme: PaletteTheme): React.CSSProperties {
  return {
    ["--bg" as string]: theme.background,
    ["--headline" as string]: theme.headline,
    ["--body" as string]: theme.body,
    ["--accent" as string]: theme.accent,
    ["--accent-2" as string]: theme.accent2,
    ["--on-accent" as string]: theme.onAccent,
  } as React.CSSProperties;
}
