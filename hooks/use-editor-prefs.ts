"use client";

// The editor's persisted UI preferences — theme picks (both families), colour
// choice, element visibility, per-theme parameter configs and the card mode —
// held as one state object, hydrated from localStorage on mount and written
// back (debounced) on change. The athlete name rides along: it lives on the
// activity, but is remembered between activities to seed ones that lack it.

import { useEffect, useRef, useState } from "react";

import type { CardMode } from "@/components/app/mode-toggle";
import {
  loadPersistedUi,
  migrateCarouselTheme,
  migrateColorChoice,
  migrateThemeConfigs,
  savePersistedUi,
} from "@/components/app/persisted-ui";
import type { LoadedUi, ThemeConfigs } from "@/components/app/persisted-ui";
import { createDebouncedWriter } from "@/lib/debounced-writer";
import { DEFAULT_CAROUSEL_THEME } from "@/theme/carousel/registry";
import type { CarouselThemeId } from "@/theme/carousel/registry";
import type { ColorChoice } from "@/theme/core/colors";
import type { ThemeConfig } from "@/theme/core/params/kinds";
import { DEFAULT_VISIBILITY } from "@/theme/core/visibility";
import type { Visibility } from "@/theme/core/visibility";
import type { ThemeId } from "@/theme/editor/render-theme";

export interface EditorPrefs {
  /** Carousel themes have their own id space (Trace, Ascent, …), so the
   *  carousel keeps its own selection separate from the single-card theme. */
  carouselTheme: CarouselThemeId;
  /** The user's colour choice — a preset scheme or a photo-derived strategy.
   *  `null` means "the active theme's default", so each theme keeps its own
   *  signature colours until the user explicitly picks. */
  colorChoice: ColorChoice | null;
  mode: CardMode;
  theme: ThemeId;
  /** Per-theme parameter configs, keyed by theme/config key (e.g. "altitude",
   *  "strata", "photo"). One generic slot replaces the per-theme config
   *  states; each read is coerced (`coerceConfig`) so stale/garbage values
   *  are safe. */
  themeConfigs: ThemeConfigs;
  visibility: Visibility;
}

export interface UseEditorPrefs extends EditorPrefs {
  /** The remembered athlete name (`""` until one is known). */
  getPersistedAthleteName: () => string;
  /** Remember the athlete name for the next activity + the next visit. */
  rememberAthleteName: (name: string) => void;
  setCarouselTheme: (id: CarouselThemeId) => void;
  setColorChoice: (choice: ColorChoice | null) => void;
  setMode: (mode: CardMode) => void;
  setPhotoBackdrop: (on: boolean) => void;
  setTheme: (id: ThemeId) => void;
  setVisibility: (visibility: Visibility) => void;
  /** Merge `next` into the `id` config slot. */
  updateThemeConfig: (id: string, next: ThemeConfig) => void;
}

const DEFAULT_PREFS: EditorPrefs = {
  carouselTheme: DEFAULT_CAROUSEL_THEME,
  colorChoice: null,
  mode: "single",
  theme: "altitude",
  themeConfigs: {},
  visibility: DEFAULT_VISIBILITY,
};

// UI prefs are written at most once per quiet period (and flushed when the
// page is hidden — see the effects below). One writer for the one page.
const PERSIST_DEBOUNCE_MS = 300;
const persistUi = createDebouncedWriter(savePersistedUi, PERSIST_DEBOUNCE_MS);

/** `s` when it holds a name, `undefined` when it's empty. */
const nonEmpty = (s: string | undefined): string | undefined =>
  s === "" ? undefined : s;

/** Fold what storage holds onto the current prefs: each usable persisted
 *  field replaces its default, anything missing or stale keeps it. */
const restorePrefs = (prefs: EditorPrefs, persisted: LoadedUi): EditorPrefs => {
  const migratedCarousel = migrateCarouselTheme(persisted);
  const configs = migrateThemeConfigs(persisted, migratedCarousel);
  return {
    carouselTheme: migratedCarousel?.id ?? prefs.carouselTheme,
    colorChoice: migrateColorChoice(persisted) ?? prefs.colorChoice,
    mode: persisted.mode ?? prefs.mode,
    theme: persisted.theme ?? prefs.theme,
    themeConfigs:
      Object.keys(configs).length > 0 ? configs : prefs.themeConfigs,
    visibility:
      persisted.visibility === undefined
        ? prefs.visibility
        : { ...DEFAULT_VISIBILITY, ...persisted.visibility },
  };
};

/**
 * @param athleteName the current activity's athlete name (persisted with the
 *        prefs; the remembered one is used while it's empty)
 */
export const useEditorPrefs = (
  athleteName: string | undefined
): UseEditorPrefs => {
  const [prefs, setPrefs] = useState<EditorPrefs>(DEFAULT_PREFS);
  // Held outside the activity so it survives between activities and can seed
  // one whose file lacks an athlete name.
  const persistedAthleteNameRef = useRef("");

  // Restore UI prefs on mount. Hydrating from localStorage is a legitimate
  // cold-start sync: reading it during render would mismatch the prerendered
  // HTML, and the setState-in-effect rule's "fix" (useSyncExternalStore + a
  // custom write path) buys nothing over this small, one-shot read.
  useEffect(() => {
    const persisted = loadPersistedUi();
    // oxlint-disable-next-line react/set-state-in-effect -- one-shot cold-start hydration from localStorage (see above)
    setPrefs((prev) => restorePrefs(prev, persisted));
    if (persisted.athleteName !== undefined && persisted.athleteName !== "") {
      persistedAthleteNameRef.current = persisted.athleteName;
    }
  }, []);

  // Persist on change — debounced, since a slider drag changes `themeConfigs`
  // every tick and each save is a JSON.stringify + synchronous localStorage
  // write. The athlete name comes from the activity (which the user edits
  // in-place), so it shares this effect rather than getting its own.
  useEffect(() => {
    persistUi.schedule({
      athleteName:
        nonEmpty(athleteName) ?? nonEmpty(persistedAthleteNameRef.current),
      carouselTheme: prefs.carouselTheme,
      colorChoice: prefs.colorChoice ?? undefined,
      mode: prefs.mode,
      theme: prefs.theme,
      themeConfigs: prefs.themeConfigs,
      visibility: prefs.visibility,
    });
  }, [prefs, athleteName]);

  // The debounce timer never fires if the tab is closed or backgrounded (and
  // then discarded) inside the quiet period, so write the pending prefs out
  // as soon as the page is hidden — the last change is never lost.
  useEffect(() => {
    const flush = () => {
      persistUi.flush();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      flush();
    };
  }, []);

  return {
    ...prefs,
    getPersistedAthleteName: () => persistedAthleteNameRef.current,
    rememberAthleteName: (name) => {
      persistedAthleteNameRef.current = name;
    },
    setCarouselTheme: (carouselTheme) => {
      setPrefs((prev) => ({ ...prev, carouselTheme }));
    },
    setColorChoice: (colorChoice) => {
      setPrefs((prev) => ({ ...prev, colorChoice }));
    },
    setMode: (mode) => {
      setPrefs((prev) => ({ ...prev, mode }));
    },
    setPhotoBackdrop: (photoBackdrop) => {
      setPrefs((prev) => ({
        ...prev,
        visibility: { ...prev.visibility, photoBackdrop },
      }));
    },
    setTheme: (theme) => {
      setPrefs((prev) => ({ ...prev, theme }));
    },
    setVisibility: (visibility) => {
      setPrefs((prev) => ({ ...prev, visibility }));
    },
    // Merge over the existing slot rather than replace it: single-card and
    // carousel "strata" share one config id, but their param sets differ (the
    // carousel adds MARKS keys the single card doesn't declare). A bare
    // replace with the active theme's coerced config would drop the sibling
    // family's keys; merging keeps them (each family's read coerces away what
    // it doesn't use).
    updateThemeConfig: (id, next) => {
      setPrefs((prev) => ({
        ...prev,
        themeConfigs: {
          ...prev.themeConfigs,
          [id]: { ...prev.themeConfigs[id], ...next },
        },
      }));
    },
  };
};
