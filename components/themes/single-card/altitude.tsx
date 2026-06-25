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
// safe content width and a vertical budget, so they never overflow a short /
// landscape canvas), while the elevation LINE — and the cutout seam it draws —
// spans the FULL canvas width, bleeding past the safe zone to both edges. The
// cutout is a single clip: the opaque copy is shown above the line, the faded
// base below it. The clip id MUST be unique per render (`useId`) — multiple cards
// (formats / editor mounts) coexist in one document, and a duplicate `url(#id)`
// resolves to the FIRST match, which would clip this text with another card's
// curve (different width/size → the mask drifts off its own line).

import { type CSSProperties, useEffect, useId, useState } from "react";
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

/**
 * The fitted claim size, re-measured once the web fonts have loaded. A DOM-probe
 * measure is only accurate with the real font present; before it loads the probe
 * hits a system face (next/font's metric-matched fallback closes this in the app,
 * but not e.g. in Storybook), so we measure on mount and again on
 * `document.fonts.ready`. State-backed — not an inline call — so the measured
 * value survives the React Compiler's memoisation of pure computations. The
 * initial value is the analytic `fallback` (deterministic, SSR-safe, never
 * overflows). Keeping the glyphs sized to the SAFE width is what holds the
 * headline inside the safe zone on tight formats (e.g. TikTok's action rail).
 */
function useFittedFontSize(
  lines: string[],
  fontFamily: string,
  fontWeight: number,
  fallback: number,
  contentW: number
): number {
  const linesKey = lines.join("\n");
  const [size, setSize] = useState(fallback);
  useEffect(() => {
    let alive = true;
    const measure = () => {
      if (alive) {
        setSize(
          fitFontSize(
            linesKey.split("\n"),
            fontFamily,
            fontWeight,
            fallback,
            contentW
          )
        );
      }
    };
    measure();
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(measure);
    }
    return () => {
      alive = false;
    };
  }, [linesKey, fontFamily, fontWeight, fallback, contentW]);
  return size;
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

/**
 * Hero claim text + the elevation cutout. Four steps, in order: (1) SIZE the type
 * to the safe `contentW` and the height budget; (2) lay out the TEXT at `offsetX`
 * (inside the safe zone); (3) build the LINE — the elevation profile across the
 * full canvas `fullW`; (4) MASK — the opaque copy is clipped to above the line,
 * the faded base shows below it. `cut` enables the cutout; otherwise the type is
 * solid with a soft dark drop for legibility.
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

  // 1. SIZE — fit the widest line to the SAFE width (re-measured once the web font
  // loads), then clamp to the vertical budget. `boxH` is linear in fontSize, so a
  // single rescale lands exactly on `maxBoxH`. Sizing to `contentW` is what keeps
  // the glyphs inside the safe zone.
  let fontSize = useFittedFontSize(
    lines,
    fontFamily,
    fontWeight,
    layout.fontSize,
    contentW
  );
  let m = claimMetrics(fontSize, lines.length, hasCurve, hasDesc);
  if (m.boxH > maxBoxH && maxBoxH > 0) {
    fontSize *= maxBoxH / m.boxH;
    m = claimMetrics(fontSize, lines.length, hasCurve, hasDesc);
  }
  const { baseline0, lineH, lastBaseline, boxH } = m;

  // 2. TEXT — glyphs left-aligned at `offsetX` (inside the safe box), one <text>
  // per line. `opacity`/`fill`/`dy` let us stamp the faded base, the opaque copy
  // and (no-curve) the drop shadow from the same generator.
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

  // 3. LINE — the elevation profile across the FULL canvas width, as a waterline
  // through the last line: peaks sit ~golden-section down the cap height, valleys
  // settle just below the baseline (so only the feet are cut). For a project the
  // legs are already laid end-to-end across [0,1] by `sequenceProfiles`, so
  // flattening their points gives one polyline 0→fullW (a vertical step falls
  // naturally where two legs abut).
  const curveCap = fontSize * CURVE_CAP;
  const bandH = curveCap * 0.5;
  const peakY = lastBaseline - curveCap * 0.382;
  const toPath = (pts: Coord[]) =>
    pts
      .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join(" ");
  const linePts: Coord[] = curves
    .flatMap((c) => c.pts)
    .map((p) => [p[0] * fullW, peakY + (1 - p[1]) * bandH]);
  const lineD = toPath(linePts);

  // 4. MASK — the opaque copy is the part ABOVE the line; the faded base shows
  // through below it. The clip is the line closed up to `topY` (well above the
  // caps) across the full width — one path. `uid` MUST be unique per render (it
  // is — `useId`), or a same-numbered card in another format clips THIS text with
  // its own curve (a duplicate `url(#id)` resolves to the first in the document).
  const topY = -fontSize;
  const aboveLine = `${lineD} L${fullW.toFixed(1)} ${topY.toFixed(1)} L0 ${topY.toFixed(1)} Z`;

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
            <clipPath id={uid}>
              <path d={aboveLine} />
            </clipPath>
          </defs>
          {/* faded base everywhere → shows through below the line */}
          {textLines(belowOpacity)}
          {/* opaque copy above the line */}
          <g clipPath={`url(#${uid})`}>{textLines(1)}</g>
          {/* the white line: dark halo for legibility, then the stroke */}
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
            strokeWidth={3}
          />
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
  // Unique per render so coexisting cards (formats in the matrix, editor mounts,
  // the export clone) never share a clip id — a duplicate `url(#id)` resolves to
  // the first match, which would clip this claim with another card's curve. Strip
  // the colons `useId` emits so the id is a clean `url(#…)` reference everywhere.
  const uid = `alt-${useId().replace(/:/g, "")}`;

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
