// ALTITUDE — a full-bleed photo with the elevation line drawn through a large
// "claim" (a hero metric, or the activity name). Photo-led ("hero") theme.
// Type: Anton (modern) / Playfair Display (serif) for the claim; JetBrains Mono
// for the supporting line and footer. Parameterised by `config` — see
// `lib/altitude.ts` for the model and the pure stat resolution.

import type { CSSProperties } from "react";
import {
  type AltitudeConfig,
  type AltitudePosition,
  DEFAULT_ALTITUDE_CONFIG,
  type ResolvedClaim,
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

const FONT_FAMILY: Record<AltitudeConfig["font"], string> = {
  modern: "var(--font-heading), sans-serif",
  serif: "var(--font-playfair), serif",
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
  return { ...base, bottom: 168 };
}

function claimFontSize(claim: ResolvedClaim): number {
  if (claim.isText) {
    const len = claim.value.length;
    if (len > 18) {
      return 88;
    }
    if (len > 11) {
      return 116;
    }
    return 150;
  }
  const len = claim.value.length;
  if (len <= 4) {
    return 250;
  }
  if (len <= 6) {
    return 200;
  }
  if (len <= 9) {
    return 156;
  }
  return 120;
}

/** Mountain-silhouette line with a soft dark halo (no filters — export-safe). */
function Line({
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
      style={{ display: "block", width: "100%", overflow: "visible", ...style }}
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
  const isSerif = config.font === "serif";
  const cutout = config.claimStyle === "cutout" && claim !== null;
  const opacity = Math.min(1, Math.max(0, config.cutoutOpacity / 100));
  const size = claim ? claimFontSize(claim) : 0;

  const claimValueStyle: CSSProperties = {
    fontFamily: font,
    fontSize: size,
    lineHeight: 0.9,
    fontWeight: isSerif ? 500 : 400,
    letterSpacing: isSerif ? "0" : "-0.01em",
    whiteSpace: claim?.isText ? "normal" : "nowrap",
    margin: 0,
  };

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
        {claim && cutout ? (
          <div>
            <div style={{ position: "relative", width: "100%" }}>
              <div style={{ ...claimValueStyle, color: "#fff", opacity }}>
                {claim.value}
              </div>
              {hasLine && profile ? (
                <Line
                  profile={profile}
                  style={{ position: "absolute", inset: 0, height: "100%" }}
                  useElevation={useElevation}
                />
              ) : null}
            </div>
            {claim.unit ? (
              <div
                style={{
                  fontFamily: font,
                  fontSize: Math.round(size * 0.2),
                  letterSpacing: "0.04em",
                  opacity: 0.85,
                  marginTop: 8,
                  textShadow: "0 2px 12px rgba(0,0,0,0.5)",
                }}
              >
                {claim.unit}
              </div>
            ) : null}
          </div>
        ) : null}

        {claim && !cutout ? (
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
            </div>
            <div
              style={{
                ...claimValueStyle,
                color: "#fff",
                textShadow: "0 3px 18px rgba(0,0,0,0.45)",
              }}
            >
              {claim.value}
              {claim.unit ? (
                <span
                  style={{
                    fontSize: Math.round(size * 0.3),
                    marginLeft: 16,
                    opacity: 0.85,
                  }}
                >
                  {claim.unit}
                </span>
              ) : null}
            </div>
            {hasLine && profile ? (
              <div style={{ height: 132, marginTop: 28, width: "100%" }}>
                <Line
                  profile={profile}
                  style={{ height: "100%" }}
                  useElevation={useElevation}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* No claim: the line becomes the hero element. */}
        {!claim && hasLine && profile ? (
          <div style={{ height: 240, width: "100%" }}>
            <Line
              profile={profile}
              strokeWidth={4}
              style={{ height: "100%" }}
              useElevation={useElevation}
            />
          </div>
        ) : null}

        {stats.length > 0 ? (
          <div
            style={{
              marginTop: 30,
              fontFamily: "var(--font-mono), monospace",
              fontSize: 32,
              letterSpacing: "0.04em",
              opacity: 0.92,
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            {stats.map((s, i) => (
              <span
                key={s.label}
                style={{
                  alignItems: "baseline",
                  display: "inline-flex",
                  gap: 8,
                }}
              >
                <span>{s.value}</span>
                {s.unit ? (
                  <span style={{ fontSize: 23, opacity: 0.8 }}>{s.unit}</span>
                ) : null}
                {i < stats.length - 1 ? (
                  <span style={{ marginLeft: 12, opacity: 0.45 }}>·</span>
                ) : null}
              </span>
            ))}
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
