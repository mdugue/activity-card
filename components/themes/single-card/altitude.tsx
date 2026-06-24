// ALTITUDE — a full-bleed photo with the elevation line drawn through a large,
// full-width "claim" (a hero metric, or the activity name). Photo-led ("hero")
// theme. Type: Anton (modern) / Playfair Display (serif) for the claim;
// JetBrains Mono for the supporting line and footer. Parameterised by `config`
// — see `lib/altitude.ts` for the model and the pure stat resolution.
//
// The claim is rendered as SVG <text> so it can be split along the elevation
// curve in the "cutout" treatment: the portion above the line stays opaque, the
// portion below fades to the opacity parameter. Both are export-safe (plain
// inline SVG, no CSS filters / backdrop-filter that html-to-image mishandles).
//
// Two coordinate systems share one render tree (see `format-context`): the claim
// GLYPHS sit inside the platform SAFE box (offset by `insets.left`, sized to the
// safe content width), while the elevation LINE spans the FULL canvas width,
// bleeding past the safe zone to the edges. The cutout seam is the elevation
// profile mapped across the CLAIM's own width (not the canvas) so the glyphs are
// sliced the same way on every format — the headline takes a different fraction
// of the full-bleed canvas per format, so mapping the cut to the canvas would
// feed each format a different sub-window of the profile. The line then runs flat
// out to both edges. The headline is also clamped to a vertical budget so it
// never overflows a short / landscape canvas.

import { type CSSProperties, useEffect, useState } from "react";
import {
  ALTITUDE_PARAMS,
  type AltitudeConfig,
  type AltitudePosition,
  type ClaimLayout,
  DEFAULT_ALTITUDE_CONFIG,
  layoutClaim,
  type ResolvedStat,
  resolveClaim,
  supportingStats,
} from "@/lib/altitude";
import {
  type Coord,
  type NormalizedCurve,
  sequenceProfiles,
} from "@/lib/chart-helpers";
import { formatDateUpper } from "@/lib/format";
import { isMultiActivity, segmentProfiles } from "@/lib/multi-activity";
import { defineTheme, type ThemeProps } from "@/lib/theme-contract";
import { useFormat, useSafeInsets } from "../shared/format-context";
import { PhotoLayer } from "../shared/photo-layer";

const USES = [
  "elevation",
  "elevationViz",
  "heartRate",
  "location",
  "pace",
  "speed",
] as const;

type ThemeAltitudeProps = ThemeProps<(typeof USES)[number], AltitudeConfig>;

// Internal SVG coordinate space for the decorative elevation band (it renders at
// width:100% of its container, so this is resolution, not a layout dimension).
const W = 1080;
// The theme's natural horizontal margin at 4:5 — `useSafeInsets` floors it with
// the platform safe inset on taller / cover-cropped formats.
const PAD_X = 84;
// Characters that drop below the baseline — used to reserve descender room only
// when the text actually needs it (numbers/caps stay tight).
const DESCENDERS = /[gjpqy]/;

// --- Anton/Playfair vertical ink metrics (fractions of the font size) --------
// Measured from the rendered fonts: caps and ascenders rise ~0.92× the font size
// above the baseline (digits ~0.87×). The box reserves that much above the
// baseline so the opaque glyphs are fully contained — under-reserving (the old
// 0.72 cap) let tall Anton glyphs poke out the top of the SVG and get clipped at
// the canvas edge on short / landscape formats. The baseline itself is
// footer-anchored, so a taller reservation only grows the box upward into empty
// space: roomy formats render identically.
const INK_ASCENT = 0.92;
const TOP_PAD = 0.04;
const LINE_STEP = 1.0;
// Room below the baseline: descenders, or the elevation curve's dip + its stroke.
// Unchanged from the original calibration so footer placement is preserved.
const DESCENT_TEXT = 0.2;
const DESCENT_FLAT = 0.05;
const DESCENT_CURVE = 0.12;
// The elevation curve is grounded against this (the design's original cap
// reference), kept separate from INK_ASCENT so the seam keeps slicing the glyphs
// exactly where it always has.
const CURVE_CAP = 0.72;

interface ClaimMetrics {
  /** First line's baseline, from the top of the box. */
  baseline0: number;
  /** Total box height — exactly contains the ink (+ curve dip). */
  boxH: number;
  /** Last line's baseline (the curve grounds here). */
  lastBaseline: number;
  /** Baseline-to-baseline step for wrapped lines. */
  lineH: number;
}

/** The claim box geometry for a given font size. Every term is linear in
 *  `fontSize`, so `boxH` scales linearly — the height clamp rescales in one step. */
function claimMetrics(
  fontSize: number,
  nLines: number,
  hasCurve: boolean,
  hasDescenders: boolean
): ClaimMetrics {
  const cap = fontSize * INK_ASCENT;
  const topPad = fontSize * TOP_PAD;
  const lineH = fontSize * LINE_STEP;
  const descent =
    fontSize *
    Math.max(
      hasDescenders ? DESCENT_TEXT : DESCENT_FLAT,
      hasCurve ? DESCENT_CURVE : 0
    );
  const baseline0 = topPad + cap;
  const lastBaseline = baseline0 + (nLines - 1) * lineH;
  return { baseline0, lineH, lastBaseline, boxH: lastBaseline + descent };
}

// --- Fit-to-width by measure-and-scale --------------------------------------
// Scaling the font size uniformly is the only way to fill the width without
// distorting glyph shapes (unlike SVG `textLength`). We measure the natural
// width against a detached probe; next/font ships metric-matched fallbacks, so
// this is accurate even before the web font loads, and the resulting size is
// baked into the DOM that html-to-image clones, so the export matches.
const REF_PX = 100;
const MIN_FIT = 40;
const MAX_FIT = 620;
let measureProbe: HTMLSpanElement | null = null;

function probeWidth(
  text: string,
  fontFamily: string,
  fontWeight: number
): number {
  if (typeof document === "undefined") {
    return 0;
  }
  if (!measureProbe) {
    measureProbe = document.createElement("span");
    measureProbe.setAttribute("aria-hidden", "true");
    Object.assign(measureProbe.style, {
      position: "absolute",
      left: "-99999px",
      top: "0",
      visibility: "hidden",
      whiteSpace: "pre",
      pointerEvents: "none",
      letterSpacing: "normal",
      fontSize: `${REF_PX}px`,
    });
    document.body.appendChild(measureProbe);
  }
  measureProbe.style.fontFamily = fontFamily;
  measureProbe.style.fontWeight = String(fontWeight);
  measureProbe.textContent = text;
  return measureProbe.getBoundingClientRect().width;
}

/** Largest size (clamped) at which the widest line still fits `contentW`. */
function fitFontSize(
  lines: string[],
  fontFamily: string,
  fontWeight: number,
  fallback: number,
  contentW: number
): number {
  let widest = 0;
  for (const line of lines) {
    widest = Math.max(widest, probeWidth(line, fontFamily, fontWeight));
  }
  if (widest <= 0) {
    return fallback;
  }
  return Math.min(MAX_FIT, Math.max(MIN_FIT, (contentW / widest) * REF_PX));
}

interface ClaimFit {
  /** Width-fit size for the widest line (before the vertical clamp). */
  fontSize: number;
  /** Last line's width at REF_PX — the curve maps the profile across this so the
   *  cut tracks the glyphs, not the canvas. `textW = lastW100 * fontSize / REF_PX`. */
  lastW100: number;
}

/**
 * The claim's fit, re-measured once the web fonts have loaded. A DOM-probe
 * measure is only accurate with the real font present; before it loads the probe
 * hits a system face (next/font's metric-matched fallback closes this in the app,
 * but not e.g. in Storybook), so we measure on mount and again on
 * `document.fonts.ready`. State-backed — not an inline call — so the measured
 * value survives the React Compiler's memoisation of pure computations. The
 * initial values are analytic (deterministic, SSR-safe, and never overflow).
 */
function useClaimFit(
  lines: string[],
  fontFamily: string,
  fontWeight: number,
  fallback: number,
  contentW: number
): ClaimFit {
  const linesKey = lines.join("\n");
  const [fit, setFit] = useState<ClaimFit>(() => ({
    fontSize: fallback,
    lastW100: fallback > 0 ? (contentW * REF_PX) / fallback : 0,
  }));
  useEffect(() => {
    let alive = true;
    const measure = () => {
      if (!alive) {
        return;
      }
      const ls = linesKey.split("\n");
      const last = ls.at(-1) ?? "";
      setFit({
        fontSize: fitFontSize(ls, fontFamily, fontWeight, fallback, contentW),
        lastW100: probeWidth(last, fontFamily, fontWeight),
      });
    };
    measure();
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(measure);
    }
    return () => {
      alive = false;
    };
  }, [linesKey, fontFamily, fontWeight, fallback, contentW]);
  return fit;
}

const FONT_FAMILY: Record<AltitudeConfig["font"], string> = {
  modern: "var(--font-heading), sans-serif",
  serif: "var(--font-playfair), serif",
};
const FONT_WEIGHT: Record<AltitudeConfig["font"], number> = {
  modern: 400,
  serif: 600,
};

const NO_PHOTO_BG =
  "radial-gradient(125% 95% at 50% 18%, #2b3340 0%, #171c24 55%, #0b0e13 100%)";

const FOOTER_SCRIM =
  "linear-gradient(0deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 18%)";
const FLAT_DARKEN = "linear-gradient(0deg, rgba(0,0,0,0.12), rgba(0,0,0,0.12))";

function scrimBackground(position: AltitudePosition): string {
  let pos: string;
  if (position === "top") {
    pos =
      "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0) 50%)";
  } else if (position === "center") {
    pos =
      "radial-gradient(120% 70% at 50% 48%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0) 100%)";
  } else {
    pos =
      "linear-gradient(0deg, rgba(0,0,0,0.55) 8%, rgba(0,0,0,0.12) 32%, rgba(0,0,0,0) 55%)";
  }
  return `${pos}, ${FOOTER_SCRIM}, ${FLAT_DARKEN}`;
}

/** The claim cluster spans the full canvas width (the elevation line bleeds to
 *  the edges); its text rows pad themselves back into the safe box. Only the
 *  block-axis anchor changes with `position`. */
function clusterPosition(
  position: AltitudePosition,
  topInset: number,
  bottomInset: number
): CSSProperties {
  const base: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 3,
    color: "#fff",
  };
  if (position === "top") {
    return { ...base, top: topInset };
  }
  if (position === "center") {
    return { ...base, top: "50%", transform: "translateY(-50%)" };
  }
  return { ...base, bottom: bottomInset };
}

/** Hash identical-content claims to a stable id (clip ids must not collide
 * across the several Altitude mounts the editor/export keep alive at once;
 * identical props → identical id → identical clip, which is harmless). */
function hashId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) % 2_147_483_647;
  }
  return h.toString(36);
}

/**
 * Full-width hero text, sized by `layout` then clamped to `maxBoxH`. The GLYPHS
 * are drawn at `offsetX` and fitted to the safe `contentW`, while the curve, its
 * clip and its seam span the full canvas (`fullW`) — so the type stays inside the
 * safe zone but the elevation line bleeds to the edges. `cut` splits the type
 * along the `curves` and draws a white line on each seam; otherwise it's solid
 * with a soft dark drop for legibility.
 *
 * The type is opaque above each curve and fades to `belowOpacity` below it. A
 * single activity is one curve across the full width; a project lays its legs
 * side by side, each cutting only its own slice of the type.
 */
function ClaimText({
  belowOpacity,
  contentW,
  fullW,
  offsetX,
  maxBoxH,
  curves,
  cut,
  fontFamily,
  fontWeight,
  layout,
  uid,
}: {
  belowOpacity: number;
  /** Safe content width the glyphs are fitted to. */
  contentW: number;
  /** Full canvas width — the curve / clip / seam coordinate space. */
  fullW: number;
  /** Left edge of the safe box, where the glyphs start. */
  offsetX: number;
  /** Vertical budget; the font is scaled down so the box fits. */
  maxBoxH: number;
  curves: NormalizedCurve[];
  cut: boolean;
  fontFamily: string;
  fontWeight: number;
  layout: ClaimLayout;
  uid: string;
}) {
  const { lines } = layout;
  const hasCurve = cut && curves.length > 0;
  const hasDesc = DESCENDERS.test(lines.join(""));

  // Width-fit (re-measured once the web font loads), then clamp to the vertical
  // budget. `boxH` is linear in fontSize, so a single rescale lands exactly on
  // `maxBoxH`.
  const fit = useClaimFit(
    lines,
    fontFamily,
    fontWeight,
    layout.fontSize,
    contentW
  );
  let fontSize = fit.fontSize;
  let m = claimMetrics(fontSize, lines.length, hasCurve, hasDesc);
  if (m.boxH > maxBoxH && maxBoxH > 0) {
    fontSize *= maxBoxH / m.boxH;
    m = claimMetrics(fontSize, lines.length, hasCurve, hasDesc);
  }
  const { baseline0, lineH, lastBaseline, boxH } = m;
  // The rendered width of the last line (which the curve cuts) at the final size.
  const textW = (fit.lastW100 * fontSize) / REF_PX;

  const textLines = (opacity: number, fill = "#fff", dy = 0) =>
    lines.map((ln, i) => (
      <text
        fill={fill}
        fontFamily={fontFamily}
        fontSize={fontSize}
        fontWeight={fontWeight}
        key={`${i}-${ln}`}
        opacity={opacity}
        x={offsetX}
        y={baseline0 + i * lineH + dy}
      >
        {ln}
      </text>
    ));

  // Ground every curve on the LAST line: highest points sit at the golden
  // section down the cap height, valleys settle just below the baseline, so most
  // of the type stays opaque and only the feet are cut.
  //
  // The profile is mapped across the CLAIM's own width (`offsetX … offsetX+textW`)
  // rather than the canvas. The headline occupies a different fraction of the
  // full-bleed canvas on every format (much less on landscape / heavy side-rail
  // formats), so mapping to the canvas would feed the glyphs only a sub-window of
  // the profile and slice them inconsistently. Mapping to the claim makes the cut
  // identical in character everywhere; the drawn LINE then runs flat out to both
  // canvas edges (`buildLine`) so it still bleeds full-width.
  const curveCap = fontSize * CURVE_CAP;
  const bandH = curveCap * 0.5;
  const peakY = lastBaseline - curveCap * 0.382;
  // Close the "above" regions well past the top of the glyphs so the opaque
  // copy covers them fully — otherwise tall caps poke above the clip.
  const topY = -fontSize;
  const toPath = (pts: Coord[]) =>
    pts
      .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join(" ");
  const seams = hasCurve
    ? curves.map((c) => {
        const mapped: Coord[] = c.pts.map((p) => [
          offsetX + p[0] * textW,
          peakY + (1 - p[1]) * bandH,
        ]);
        // Each leg occupies its own slice of the claim width; close the clip
        // between its own left and right edges so it only cuts the type it spans.
        const startX = mapped[0]?.[0] ?? offsetX;
        const endX = mapped.at(-1)?.[0] ?? offsetX + textW;
        const aboveD = `${toPath(mapped)} L${endX.toFixed(1)} ${topY.toFixed(1)} L${startX.toFixed(1)} ${topY.toFixed(1)} Z`;
        return { mapped, aboveD };
      })
    : [];
  // One full-bleed line: every leg's points, plus flat extensions out to the
  // canvas edges at the first / last height (a vertical step falls naturally at
  // each leg seam where two abutting points share an x).
  const linePts = seams.flatMap((s) => s.mapped);
  const first = linePts.at(0);
  const last = linePts.at(-1);
  const lineD =
    first && last ? toPath([[0, first[1]], ...linePts, [fullW, last[1]]]) : "";

  return (
    <svg
      aria-hidden="true"
      style={{ display: "block", overflow: "visible", width: "100%" }}
      viewBox={`0 0 ${fullW} ${boxH.toFixed(1)}`}
    >
      <title>{lines.join(" ")}</title>
      {hasCurve ? (
        <>
          <defs>
            {seams.map((s, k) => (
              <clipPath id={`${uid}-a${k}`} key={`clip-${k}`}>
                <path d={s.aboveD} />
              </clipPath>
            ))}
          </defs>
          {/* faint base everywhere → shows through below each leg's seam */}
          {textLines(belowOpacity)}
          {/* opaque copy above each leg's seam (legs don't overlap in x) */}
          {seams.map((_, k) => (
            <g clipPath={`url(#${uid}-a${k})`} key={`above-${k}`}>
              {textLines(1)}
            </g>
          ))}
          {/* one white line: the seam over the claim, flat-extended to the edges */}
          <g>
            <path
              d={lineD}
              fill="none"
              stroke="rgba(0,0,0,0.35)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={5}
            />
            <path
              d={lineD}
              fill="none"
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3.25}
            />
          </g>
        </>
      ) : (
        <>
          {textLines(1, "rgba(0,0,0,0.32)", 4)}
          {textLines(1)}
        </>
      )}
    </svg>
  );
}

/**
 * Decorative elevation band (stacked treatment + the no-claim hero). Renders one
 * curve for a single activity, or — for a project — every leg laid out side by
 * side on a shared scale (no gaps, a vertical step where two legs meet). It
 * renders at width:100% of a full-bleed container, so it spans the whole canvas.
 */
function MultiLineBand({
  curves,
  strokeWidth = 3.5,
  style,
}: {
  curves: NormalizedCurve[];
  strokeWidth?: number;
  style?: CSSProperties;
}) {
  if (curves.length === 0) {
    return null;
  }
  const pad = 18;
  const innerW = W - pad * 2;
  const innerH = 100 - pad * 2;
  const toD = (c: NormalizedCurve) =>
    c.pts
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${(pad + p[0] * innerW).toFixed(1)} ${(pad + (1 - p[1]) * innerH).toFixed(1)}`
      )
      .join(" ");
  return (
    <svg
      aria-hidden="true"
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible", width: "100%", ...style }}
      viewBox={`0 0 ${W} 100`}
    >
      <title>Elevation lines</title>
      {curves.map((c, i) => {
        const d = toD(c);
        return (
          <g key={`${i}-${d}`}>
            <path
              d={d}
              fill="none"
              stroke="rgba(0,0,0,0.35)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={strokeWidth + 3}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={d}
              fill="none"
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * One condensed row under the claim: supporting stats on the left, the claim's
 * unit (when not already in a kicker) bottom-aligned on the right.
 */
function FooterRow({
  stats,
  unit,
  unitFontFamily,
  unitFontSize,
  marginTop,
}: {
  marginTop: number;
  stats: ResolvedStat[];
  unit?: string;
  unitFontFamily: string;
  unitFontSize: number;
}) {
  if (stats.length === 0 && !unit) {
    return null;
  }
  return (
    <div
      style={{
        marginTop,
        display: "flex",
        alignItems: "flex-end",
        gap: 24,
        width: "100%",
      }}
    >
      {stats.length > 0 ? (
        <div
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 31,
            letterSpacing: "0.04em",
            opacity: 0.92,
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          {stats.map((s, i) => (
            <span
              key={s.label}
              style={{ alignItems: "baseline", display: "inline-flex", gap: 8 }}
            >
              <span>{s.value}</span>
              {s.unit ? (
                <span style={{ fontSize: 22, opacity: 0.8 }}>{s.unit}</span>
              ) : null}
              {i < stats.length - 1 ? (
                <span style={{ marginLeft: 10, opacity: 0.45 }}>·</span>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}
      {unit ? (
        <div
          style={{
            marginLeft: "auto",
            fontFamily: unitFontFamily,
            fontSize: unitFontSize,
            lineHeight: 1,
            opacity: 0.9,
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
          }}
        >
          {unit}
        </div>
      ) : null}
    </div>
  );
}

export function ThemeAltitude({
  data,
  photoUrl,
  imageTransform,
  config = DEFAULT_ALTITUDE_CONFIG,
}: ThemeAltitudeProps) {
  const { width, height } = useFormat();
  // The photo + scrim bleed the full canvas; the claim GLYPHS + stats + meta keep
  // to the safe content width, while the elevation LINE bleeds to the edges.
  // PAD_X is the natural 4:5 margin, floored by the platform safe inset on taller
  // / cover-cropped formats.
  const insets = useSafeInsets({
    top: 132,
    right: PAD_X,
    bottom: 60,
    left: PAD_X,
  });
  const contentW = width - insets.left - insets.right;
  const claim = resolveClaim(config.claim, data);
  const stats = config.secondLine
    ? supportingStats(data, claim?.key ?? null)
    : [];

  // One curve for a single activity; for a project, every leg laid out side by
  // side on a shared scale (no gaps, vertical step at each seam).
  const multi = isMultiActivity(data);
  const curves = ((): NormalizedCurve[] => {
    if (multi) {
      const seg = segmentProfiles(data);
      return seg.profiles.length
        ? sequenceProfiles(seg.profiles, seg.distances, seg.useElevation)
        : [];
    }
    const profile = data.elevationProfile ?? data.paceProfile;
    if (!profile || profile.length <= 1) {
      return [];
    }
    return sequenceProfiles(
      [profile],
      [undefined],
      Boolean(data.elevationProfile?.length)
    );
  })();
  const hasLine = curves.length > 0;

  const font = FONT_FAMILY[config.font];
  const fontWeight = FONT_WEIGHT[config.font];
  const cutout = config.claimStyle === "cutout" && claim !== null;
  const belowOpacity = Math.min(1, Math.max(0, config.cutoutOpacity / 100));
  const layout = claim
    ? layoutClaim(claim.value, config.font, claim.isText, contentW)
    : null;
  const uid = `alt-${hashId(`${claim?.value ?? ""}|${config.position}|${config.claimStyle}|${config.cutoutOpacity}|${config.font}`)}`;

  const unitFontSize = layout
    ? Math.min(64, Math.max(40, Math.round(layout.fontSize * 0.13)))
    : 40;

  const metaBits = [
    formatDateUpper(data.date),
    (data.location || "").toUpperCase(),
  ].filter(Boolean);

  // Vertical budget so the headline never overflows a short / landscape canvas.
  // The cluster floats `META_GAP` above the meta line; the headline gets what's
  // left after the footer (and, when stacked, the kicker + band). On tall feed /
  // story formats the budget is far larger than the width-fit size, so the master
  // stays width-driven and unchanged.
  const META_GAP = 60;
  const FOOTER_RESERVE = 104;
  const KICKER_RESERVE = 56;
  const BAND_RESERVE = 126;
  const clusterAvailH = Math.max(
    200,
    config.position === "center"
      ? height - 2 * Math.max(insets.top, insets.bottom + META_GAP)
      : height - insets.top - insets.bottom - META_GAP
  );
  const footerReserve = stats.length > 0 || claim?.unit ? FOOTER_RESERVE : 0;
  const cutoutMaxBoxH = clusterAvailH - footerReserve;
  const stackedMaxBoxH =
    clusterAvailH - footerReserve - KICKER_RESERVE - BAND_RESERVE;

  // Text rows pad back into the safe box; the SVG layers (claim, band) stay
  // full-bleed so the elevation line reaches the edges.
  const safePad: CSSProperties = {
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  return (
    <div
      style={{
        width,
        height,
        position: "relative",
        overflow: "hidden",
        background: NO_PHOTO_BG,
        boxSizing: "border-box",
      }}
    >
      {photoUrl ? (
        <PhotoLayer imageTransform={imageTransform} photoUrl={photoUrl} />
      ) : null}

      {/* Legibility scrim, tuned to where the claim sits. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background: scrimBackground(config.position),
        }}
      />

      <div
        style={clusterPosition(
          config.position,
          insets.top,
          insets.bottom + META_GAP
        )}
      >
        {claim && cutout && layout ? (
          <div>
            <ClaimText
              belowOpacity={belowOpacity}
              contentW={contentW}
              curves={curves}
              cut
              fontFamily={font}
              fontWeight={fontWeight}
              fullW={width}
              layout={layout}
              maxBoxH={cutoutMaxBoxH}
              offsetX={insets.left}
              uid={uid}
            />
            <div style={safePad}>
              <FooterRow
                marginTop={16}
                stats={stats}
                unit={claim.unit}
                unitFontFamily={font}
                unitFontSize={unitFontSize}
              />
            </div>
          </div>
        ) : null}

        {claim && !cutout && layout ? (
          <div>
            <div
              style={{
                ...safePad,
                fontFamily: "var(--font-mono), monospace",
                fontSize: 24,
                letterSpacing: "0.28em",
                opacity: 0.82,
                marginBottom: 16,
                textShadow: "0 2px 12px rgba(0,0,0,0.5)",
              }}
            >
              {claim.label}
              {claim.unit ? ` · ${claim.unit}` : ""}
            </div>
            <ClaimText
              belowOpacity={1}
              contentW={contentW}
              curves={curves}
              cut={false}
              fontFamily={font}
              fontWeight={fontWeight}
              fullW={width}
              layout={layout}
              maxBoxH={stackedMaxBoxH}
              offsetX={insets.left}
              uid={uid}
            />
            {hasLine ? (
              <div style={{ height: 104, marginTop: 22, width: "100%" }}>
                <MultiLineBand curves={curves} style={{ height: "100%" }} />
              </div>
            ) : null}
            <div style={safePad}>
              <FooterRow
                marginTop={18}
                stats={stats}
                unitFontFamily={font}
                unitFontSize={unitFontSize}
              />
            </div>
          </div>
        ) : null}

        {/* No claim: the line becomes the hero element. */}
        {!claim && hasLine ? (
          <div>
            <div style={{ height: 232, width: "100%" }}>
              <MultiLineBand
                curves={curves}
                strokeWidth={4}
                style={{ height: "100%" }}
              />
            </div>
            <div style={safePad}>
              <FooterRow
                marginTop={20}
                stats={stats}
                unitFontFamily={font}
                unitFontSize={unitFontSize}
              />
            </div>
          </div>
        ) : null}
      </div>

      {metaBits.length > 0 ? (
        <div
          style={{
            position: "absolute",
            bottom: insets.bottom,
            left: insets.left,
            right: insets.right,
            zIndex: 3,
            fontFamily: "var(--font-mono), monospace",
            fontSize: 24,
            letterSpacing: "0.18em",
            color: "#fff",
            opacity: 0.85,
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
          }}
        >
          {metaBits.join("   ·   ")}
        </div>
      ) : null}
    </div>
  );
}

export const altitudeTheme = defineTheme({
  id: "altitude",
  label: "ALTITUDE",
  tagline: "elevation as headline",
  uses: USES,
  // Fixed: white type + line over the photo is the design.
  colors: { default: { primary: "#ffffff" }, userAdjustable: false },
  photo: { defaultOn: true },
  params: ALTITUDE_PARAMS,
  defaults: DEFAULT_ALTITUDE_CONFIG,
  Component: ThemeAltitude,
});
