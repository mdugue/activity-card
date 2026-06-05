// ALTITUDE — a full-bleed photo with the elevation line drawn through a large,
// full-width "claim" (a hero metric, or the activity name). Photo-led ("hero")
// theme. Type: Anton (modern) / Playfair Display (serif) for the claim;
// JetBrains Mono for the supporting line and footer. Parameterised by `config`
// — see `lib/altitude.ts` for the model and the pure stat resolution.
//
// The claim is rendered as SVG <text> so it can (a) stretch to the full content
// width via `textLength` and (b) be split along the elevation curve in the
// "cutout" treatment: the portion above the line stays opaque, the portion
// below fades to the opacity parameter. Both are export-safe (plain inline SVG,
// no CSS filters / backdrop-filter that html-to-image mishandles).

import type { CSSProperties } from "react";
import {
  type AltitudeConfig,
  type AltitudePosition,
  type ClaimLayout,
  DEFAULT_ALTITUDE_CONFIG,
  layoutClaim,
  type ResolvedStat,
  resolveClaim,
  supportingStats,
} from "@/lib/altitude";
import { elevationPath, pacePath } from "@/lib/chart-helpers";
import { formatDateUpper } from "@/lib/format";
import type { ImageTransform } from "@/lib/image-transform";
import { PhotoLayer } from "./photo-layer";
import type { ActivityCardProps } from "./types";

interface ThemeAltitudeProps extends ActivityCardProps {
  config?: AltitudeConfig;
  imageTransform?: ImageTransform | null;
}

const W = 1080;
const H = 1350;
const PAD_X = 84;
const CONTENT_W = W - PAD_X * 2;
// Characters that drop below the baseline — used to reserve descender room only
// when the text actually needs it (numbers/caps stay tight).
const DESCENDERS = /[gjpqy]/;

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

/** Largest size (clamped) at which the widest line still fits `CONTENT_W`. */
function fitFontSize(
  lines: string[],
  fontFamily: string,
  fontWeight: number,
  fallback: number
): number {
  let widest = 0;
  for (const line of lines) {
    widest = Math.max(widest, probeWidth(line, fontFamily, fontWeight));
  }
  if (widest <= 0) {
    return fallback;
  }
  return Math.min(MAX_FIT, Math.max(MIN_FIT, (CONTENT_W / widest) * REF_PX));
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

function clusterPosition(position: AltitudePosition): CSSProperties {
  const base: CSSProperties = {
    position: "absolute",
    left: PAD_X,
    right: PAD_X,
    zIndex: 3,
    color: "#fff",
  };
  if (position === "top") {
    return { ...base, top: 132 };
  }
  if (position === "center") {
    return { ...base, top: "50%", transform: "translateY(-50%)" };
  }
  return { ...base, bottom: 120 };
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
 * Elevation curve points mapped into a w-wide box, confined to a [bandTop,
 * bandTop+bandH] band through the vertical middle of the type so the line cuts
 * across the glyphs.
 */
function bandCoords(
  profile: number[],
  useElevation: boolean,
  w: number,
  bandTop: number,
  bandH: number
): [number, number][] {
  const n = profile.length;
  const min = Math.min(...profile);
  const max = Math.max(...profile);
  const dv = max - min || 1;
  return profile.map((v, i) => {
    const x = n > 1 ? (i / (n - 1)) * w : 0;
    // 1 = highest point of the curve. Pace is "lower is better", so invert it.
    const t = useElevation ? (v - min) / dv : (max - v) / dv;
    return [x, bandTop + (1 - t) * bandH];
  });
}

/**
 * Full-width hero text, sized + wrapped by `layout`. `cut` splits it along the
 * elevation curve (opaque above, `belowOpacity` below) and draws the white line
 * on the seam; otherwise it's solid with a soft dark drop for legibility.
 */
function ClaimText({
  layout,
  fontFamily,
  fontWeight,
  cut,
  belowOpacity,
  profile,
  useElevation,
  uid,
}: {
  belowOpacity: number;
  cut: boolean;
  fontFamily: string;
  fontWeight: number;
  layout: ClaimLayout;
  profile?: number[];
  uid: string;
  useElevation: boolean;
}) {
  const { lines } = layout;
  // Uniform scale to fill the width — no glyph distortion (see fitFontSize).
  const fontSize = fitFontSize(lines, fontFamily, fontWeight, layout.fontSize);
  const hasCurve = cut && Boolean(profile && profile.length > 1);
  // Tight vertical metrics: caps sit just below the top edge, and we only
  // reserve descender room when the text needs it or the curve dips below the
  // baseline — so numbers don't carry a tall empty box.
  const capH = fontSize * 0.72;
  const topPad = fontSize * 0.05;
  const lineH = fontSize * 0.92;
  const descent =
    fontSize *
    Math.max(DESCENDERS.test(lines.join("")) ? 0.2 : 0.05, hasCurve ? 0.12 : 0);
  const baseline0 = topPad + capH;
  const boxH = baseline0 + (lines.length - 1) * lineH + descent;

  const renderLines = (
    opacity: number,
    opts: { clipId?: string; fill?: string; dy?: number } = {}
  ) =>
    lines.map((ln, i) => (
      <text
        clipPath={opts.clipId ? `url(#${opts.clipId})` : undefined}
        fill={opts.fill ?? "#fff"}
        fontFamily={fontFamily}
        fontSize={fontSize}
        fontWeight={fontWeight}
        key={`${i}-${ln}`}
        opacity={opacity}
        x={0}
        y={baseline0 + i * lineH + (opts.dy ?? 0)}
      >
        {ln}
      </text>
    ));

  let lineD = "";
  let aboveD = "";
  if (hasCurve && profile) {
    // Ground the profile on the LAST line: its highest point sits at the golden
    // section down the cap height, valleys settle just below the baseline. Most
    // of the type stays opaque — only the feet are cut.
    const lastBaseline = baseline0 + (lines.length - 1) * lineH;
    const bandH = capH * 0.5;
    const peakY = lastBaseline - capH * 0.382;
    const coords = bandCoords(profile, useElevation, CONTENT_W, peakY, bandH);
    lineD = coords
      .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join(" ");
    // Close the "above" region well past the top of the glyphs so the opaque
    // copy covers them fully — otherwise tall caps poke above the clip and only
    // the faint base shows through up there.
    const topY = (-fontSize).toFixed(1);
    aboveD = `${lineD} L${CONTENT_W.toFixed(1)} ${topY} L0 ${topY} Z`;
  }

  return (
    <svg
      aria-hidden="true"
      style={{ display: "block", overflow: "visible", width: "100%" }}
      viewBox={`0 0 ${CONTENT_W} ${boxH.toFixed(1)}`}
    >
      <title>{lines.join(" ")}</title>
      {hasCurve ? (
        <>
          <defs>
            <clipPath id={`${uid}-above`}>
              <path d={aboveD} />
            </clipPath>
          </defs>
          {/* faint base everywhere → shows through below the seam */}
          {renderLines(belowOpacity)}
          {/* opaque copy, clipped to the area above the curve */}
          {renderLines(1, { clipId: `${uid}-above` })}
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
        </>
      ) : (
        <>
          {renderLines(1, { fill: "rgba(0,0,0,0.32)", dy: 4 })}
          {renderLines(1)}
        </>
      )}
    </svg>
  );
}

/** Decorative elevation band (stacked treatment + the no-claim hero). */
function LineBand({
  profile,
  useElevation,
  strokeWidth = 3.5,
  style,
}: {
  profile: number[];
  strokeWidth?: number;
  style?: CSSProperties;
  useElevation: boolean;
}) {
  const d = useElevation
    ? elevationPath(profile, W, 100, 18)
    : pacePath(profile, W, 100, 18);
  if (!d) {
    return null;
  }
  return (
    <svg
      aria-hidden="true"
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible", width: "100%", ...style }}
      viewBox={`0 0 ${W} 100`}
    >
      <title>Elevation line</title>
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
  const claim = resolveClaim(config.claim, data);
  const stats = config.secondLine
    ? supportingStats(data, claim?.key ?? null)
    : [];

  const profile = data.elevationProfile ?? data.paceProfile;
  const useElevation = Boolean(data.elevationProfile?.length);
  const hasLine = Boolean(profile && profile.length > 1);

  const font = FONT_FAMILY[config.font];
  const fontWeight = FONT_WEIGHT[config.font];
  const cutout = config.claimStyle === "cutout" && claim !== null;
  const belowOpacity = Math.min(1, Math.max(0, config.cutoutOpacity / 100));
  const layout = claim
    ? layoutClaim(claim.value, config.font, claim.isText, CONTENT_W)
    : null;
  const uid = `alt-${hashId(`${claim?.value ?? ""}|${config.position}|${config.claimStyle}|${config.cutoutOpacity}|${config.font}`)}`;

  const unitFontSize = layout
    ? Math.min(64, Math.max(40, Math.round(layout.fontSize * 0.13)))
    : 40;

  const metaBits = [
    formatDateUpper(data.date),
    (data.location || "").toUpperCase(),
  ].filter(Boolean);

  return (
    <div
      style={{
        width: W,
        height: H,
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

      <div style={clusterPosition(config.position)}>
        {claim && cutout && layout ? (
          <div>
            <ClaimText
              belowOpacity={belowOpacity}
              cut
              fontFamily={font}
              fontWeight={fontWeight}
              layout={layout}
              profile={profile}
              uid={uid}
              useElevation={useElevation}
            />
            <FooterRow
              marginTop={16}
              stats={stats}
              unit={claim.unit}
              unitFontFamily={font}
              unitFontSize={unitFontSize}
            />
          </div>
        ) : null}

        {claim && !cutout && layout ? (
          <div>
            <div
              style={{
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
              cut={false}
              fontFamily={font}
              fontWeight={fontWeight}
              layout={layout}
              uid={uid}
              useElevation={useElevation}
            />
            {hasLine && profile ? (
              <div style={{ height: 104, marginTop: 22, width: "100%" }}>
                <LineBand
                  profile={profile}
                  style={{ height: "100%" }}
                  useElevation={useElevation}
                />
              </div>
            ) : null}
            <FooterRow
              marginTop={18}
              stats={stats}
              unitFontFamily={font}
              unitFontSize={unitFontSize}
            />
          </div>
        ) : null}

        {/* No claim: the line becomes the hero element. */}
        {!claim && hasLine && profile ? (
          <div>
            <div style={{ height: 232, width: "100%" }}>
              <LineBand
                profile={profile}
                strokeWidth={4}
                style={{ height: "100%" }}
                useElevation={useElevation}
              />
            </div>
            <FooterRow
              marginTop={20}
              stats={stats}
              unitFontFamily={font}
              unitFontSize={unitFontSize}
            />
          </div>
        ) : null}
      </div>

      {metaBits.length > 0 ? (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: PAD_X,
            right: PAD_X,
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
