// Snapdom lab — a side-by-side diagnostic for the iOS/Safari export font issue.
//
// The exported PNG (a snapdom rasterisation of the deck) renders some text with
// the WRONG font and drops the white halo text-shadow on Safari, while the live
// DOM is perfect. Chrome is always fine; latest desktop Safari reproduces it, so
// this story exists to isolate WHICH CSS property snapdom + Safari mishandle.
//
// It renders the live deck once (the reference, top), then rasterises that exact
// node with `snapdom` several times — each pass first NEUTRALISES one suspect
// property across the subtree (text-shadow, the `next/font` metric fallback
// face, letter-spacing, …) and restores it afterwards. Open this story in the
// browser that reproduces the bug and read down: the first snapshot that matches
// the live DOM names the property we must stop emitting (or strip at capture).
//
// Not a product surface — a debugging instrument. Tagged ai-generated.

import { preCache, snapdom } from "@zumer/snapdom";
import { useCallback, useEffect, useRef, useState } from "react";
import { SAMPLE_RIDE } from "@/components/app/sample-data";
import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import {
  CAROUSEL_THEMES,
  type CarouselThemeId,
} from "@/theme/carousel/registry";
import { getFormat } from "@/theme/core/export-formats";
import { waitForFonts } from "@/theme/export/export-shared";
import preview from "../../.storybook/preview";
import { CarouselDeck } from "./deck";
import { stripGeometry } from "./geometry";
import { carouselArgs } from "./story-support";

// Bundled, same-origin photo so the white-halo shadow path (light theme over a
// photo) always renders without a network fetch or a toolbar pick.
const PHOTO = "/images/ride.jpg";
const FORMAT = getFormat("instagram-feed");
const DISPLAY_W = 900; // px width each panel (live + every snapshot) is shown at
const CAPTURE_SCALE = 0.5; // snapdom output scale (native × this); legible, light
const FALLBACK_FACE_RE = /fallback/i; // next/font's metric-adjusted fallback face

// `localFonts` overrides. snapdom auto-discovery embeds EVERY used face — 12 for
// this deck (8 Cormorant inc. italics, then 4 IBM Plex Mono). Safari applies the
// first-listed family (Cormorant) but drops the mono labels to serif, which fits
// a cap on how many @font-face Safari processes inside an SVG image. So we feed
// snapdom a SMALL, explicit set (6 faces) via `localFonts` in two formats:
//   - WOFF2: same format as today, far fewer faces → isolates FACE COUNT.
//   - TTF:   different format → isolates the WOFF2-in-SVG decode hypothesis.
// Family names must match what the elements reference so the embed replaces the
// discovered faces. Fonts come from fontsource (CORS-enabled).
const FONT_CDN = "https://cdn.jsdelivr.net/fontsource/fonts";
const FACE_SET = [
  { family: "Cormorant Garamond", id: "cormorant-garamond", weights: ["600"] },
  { family: "IBM Plex Mono", id: "ibm-plex-mono", weights: ["400", "500"] },
];
const localFontsOf = (ext: string) =>
  FACE_SET.flatMap((f) =>
    f.weights.map((w) => ({
      family: f.family,
      weight: w,
      style: "normal",
      src: `${FONT_CDN}/${f.id}@latest/latin-${w}-normal.${ext}`,
    }))
  );
const WOFF2_LOCAL_FONTS = localFontsOf("woff2");
const TTF_LOCAL_FONTS = localFontsOf("ttf");

interface Treatment {
  id: string;
  label: string;
  /** snapdom `localFonts` override — re-embed the fonts in another format. */
  localFonts?: {
    family: string;
    src: string;
    weight?: string;
    style?: string;
  }[];
  note: string;
  /** Mutate one element in place before capture; undefined = capture as-is. */
  patch?: (el: HTMLElement) => void;
}

// Each treatment neutralises ONE suspect. The first snapshot that matches the
// live DOM identifies the culprit.
const TREATMENTS: Treatment[] = [
  {
    id: "asis",
    label: "snapdom — as-is",
    note: "exactly what export emits today",
  },
  {
    id: "noshadow",
    label: "no text-shadow",
    note: "text-shadow: none",
    patch: (el) => el.style.setProperty("text-shadow", "none", "important"),
  },
  {
    id: "simpleshadow",
    label: "single-layer shadow",
    note: "collapse the 6-layer halo to one 2px shadow",
    patch: (el) => {
      if (getComputedStyle(el).textShadow !== "none") {
        el.style.setProperty(
          "text-shadow",
          "0 1px 2px rgba(0,0,0,0.45)",
          "important"
        );
      }
    },
  },
  {
    id: "realface",
    label: "real face only",
    note: "drop the next/font *Fallback* face from the family stack",
    patch: (el) => {
      const ff = getComputedStyle(el).fontFamily;
      const cleaned = ff
        .split(",")
        .map((s) => s.trim())
        .filter((s) => !FALLBACK_FACE_RE.test(s))
        .join(", ");
      if (cleaned && cleaned !== ff) {
        el.style.setProperty("font-family", cleaned, "important");
      }
    },
  },
  {
    id: "nols",
    label: "no letter-spacing",
    note: "letter-spacing: normal",
    patch: (el) =>
      el.style.setProperty("letter-spacing", "normal", "important"),
  },
  {
    id: "nofvn",
    label: "no variant-numeric",
    note: "font-variant-numeric: normal",
    patch: (el) =>
      el.style.setProperty("font-variant-numeric", "normal", "important"),
  },
  {
    id: "woff2min",
    label: "minimal WOFF2 localFonts",
    note: "same WOFF2 format, only 3 faces (not 12) → isolates face count",
    localFonts: WOFF2_LOCAL_FONTS,
  },
  {
    id: "ttf",
    label: "TTF via localFonts",
    note: "3 faces as TTF instead of WOFF2 → isolates the format",
    localFonts: TTF_LOCAL_FONTS,
  },
];

/** Apply `patch` to every element under `root`, returning a restore fn that puts
 *  each element's original inline `style` attribute back verbatim. */
function applyPatch(
  root: HTMLElement,
  patch: (el: HTMLElement) => void
): () => void {
  const els = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  const saved = els.map((el) => el.getAttribute("style"));
  for (const el of els) {
    patch(el);
  }
  return () => {
    els.forEach((el, i) => {
      const prev = saved[i];
      if (prev === null) {
        el.removeAttribute("style");
      } else {
        el.setAttribute("style", prev);
      }
    });
  };
}

function twoFrames(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

interface Shot {
  id: string;
  label: string;
  note: string;
  url: string;
}

function SnapdomLab({ themeId }: { themeId: CarouselThemeId }) {
  const base = carouselArgs(themeId);
  const count = CAROUSEL_THEMES[themeId].panels.length;
  const { stripW, slideH } = stripGeometry(FORMAT, count);
  const liveRef = useRef<HTMLDivElement>(null);
  const imageSize = useImageNaturalSize(PHOTO);
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    const node = liveRef.current;
    if (!node) {
      return;
    }
    setBusy(true);
    setShots([]);
    await waitForFonts();
    await twoFrames();
    // Mirror the real export pipeline so "as-is" is faithful: preCache + a
    // discarded warm-up pass (WebKit/iOS drop the photo + @font-face on a cold
    // first capture; snapdom #129 / #253).
    await preCache(node, { embedFonts: true });
    const baseOpts = {
      width: stripW,
      height: slideH,
      scale: CAPTURE_SCALE,
      dpr: 1,
      embedFonts: true,
    };
    const out: Shot[] = [];
    for (const t of TREATMENTS) {
      const restore = t.patch ? applyPatch(node, t.patch) : () => undefined;
      const opts = t.localFonts
        ? { ...baseOpts, localFonts: t.localFonts }
        : baseOpts;
      try {
        await twoFrames();
        await snapdom.toCanvas(node, opts); // discard warm-up pass
        const canvas = await snapdom.toCanvas(node, opts);
        out.push({
          id: t.id,
          label: t.label,
          note: t.note,
          url: canvas.toDataURL("image/png"),
        });
        setShots([...out]);
      } finally {
        restore();
      }
    }
    setBusy(false);
  }, [stripW, slideH]);

  useEffect(() => {
    if (imageSize) {
      run();
    }
  }, [imageSize, run]);

  const dispScale = DISPLAY_W / stripW;
  const dispH = Math.round((DISPLAY_W * slideH) / stripW);
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <div className="mb-2 font-mono text-xs uppercase tracking-widest opacity-70">
          Live DOM — reference ({themeId})
        </div>
        <div
          className="overflow-hidden rounded-lg shadow-lg"
          style={{ width: stripW * dispScale, height: slideH * dispScale }}
        >
          <div
            style={{
              transform: `scale(${dispScale})`,
              transformOrigin: "top left",
            }}
          >
            <div ref={liveRef} style={{ width: stripW, height: slideH }}>
              <CarouselDeck
                {...base}
                data={SAMPLE_RIDE}
                format={FORMAT}
                imageSize={imageSize}
                photoUrl={PHOTO}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        className="w-fit rounded-md bg-foreground px-3 py-1.5 font-mono text-background text-xs uppercase tracking-widest disabled:opacity-50"
        disabled={busy}
        onClick={run}
        type="button"
      >
        {busy ? "Capturing…" : "Re-capture"}
      </button>

      {shots.map((s) => (
        <div key={s.id}>
          <div className="mb-2 font-mono text-xs uppercase tracking-widest opacity-70">
            {s.label} — <span className="opacity-60">{s.note}</span>
          </div>
          {/* Snapshot painted as a background image (repo convention over <img>);
              the data URL is the exact snapdom rasterisation under this treatment. */}
          <div
            aria-label={s.label}
            className="rounded-lg shadow-lg"
            role="img"
            style={{
              width: DISPLAY_W,
              height: dispH,
              backgroundImage: `url("${s.url}")`,
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
            }}
          />
        </div>
      ))}
    </div>
  );
}

const meta = preview.meta({
  component: CarouselDeck,
  title: "Carousel/Snapdom Lab",
  tags: ["ai-generated"],
  parameters: { layout: "fullscreen" },
});

// Trace (serif over a photo) — the theme from the bug report; the white halo +
// Cormorant headline are exactly what the export drops on Safari.
export const Trace = meta.story({
  render: () => <SnapdomLab themeId="trace" />,
});

// Ascent (serif, elevation-led) — second serif theme, content over the range.
export const Ascent = meta.story({
  render: () => <SnapdomLab themeId="ascent" />,
});
