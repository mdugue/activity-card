// PHOTO — magazine cover. Full-bleed background photo, route + type overlaid.
// Type: Playfair Display (display) + DM Sans (body)
// User uploads photo; we use a rich placeholder gradient if none.
// Colours come from the photo via the image-palette pipeline → CSS custom
// properties (--bg / --headline / --body / --accent / --on-accent). A static
// fallback palette is applied inline so the card stays legible while
// extraction is in flight or when no photo is loaded.

import type { CSSProperties } from "react";

import type { Sport } from "@/lib/activity";
import { routePath, whiteRamp } from "@/lib/chart-helpers";
import {
  formatDateUpper,
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
  isNum,
} from "@/lib/format";
import { isMultiActivity, segmentRoutes } from "@/lib/multi-activity";
import { hasText } from "@/lib/text";
import type { ColorScheme } from "@/theme/core/colors";
import type { ThemeProps } from "@/theme/core/theme-contract";

import { useFormat, useSafeInsets } from "../shared/format-context";
import { OverlayRoute } from "../shared/overlay-route";
import { PhotoLayer } from "../shared/photo-layer";
import type { PhotoCapability } from "./photo.theme";

type ThemePhotoProps = ThemeProps<PhotoCapability>;
type PhotoActivity = ThemePhotoProps["data"];

const PLAYFAIR = "var(--font-playfair), serif";
const BODY_VAR = "var(--body)";
const HEADLINE_VAR = "var(--headline)";
const ACCENT_2_VAR = "var(--accent-2)";
const WHITE = "#ffffff";
const SOFT_WHITE = "rgba(255,255,255,0.78)";
const INK = "#0a0a0a";
const ROUTE_SHADOW = "drop-shadow(0 0 12px rgba(0,0,0,0.4))";

interface StaticPalette {
  accent: string;
  background: string;
  body: string;
  headline: string;
  onAccent: string;
}

const fallbackPalette = (sport: string): StaticPalette => {
  if (sport === "swim") {
    return {
      accent: "#6ba8c5",
      background: "#2d5a78",
      body: SOFT_WHITE,
      headline: WHITE,
      onAccent: INK,
    };
  }
  if (sport === "run") {
    return {
      accent: "#d8c5a0",
      background: "#4a2a18",
      body: SOFT_WHITE,
      headline: WHITE,
      onAccent: INK,
    };
  }
  return {
    accent: "#c89d6e",
    background: "#5a6a7e",
    body: SOFT_WHITE,
    headline: WHITE,
    onAccent: INK,
  };
};

/** The theme's CSS custom properties, spread onto the root's inline style. */
interface PhotoCssVars {
  "--accent": string;
  "--accent-2": string;
  "--bg": string;
  "--body": string;
  "--headline": string;
  "--on-accent": string;
}

/**
 * Map the resolved colour scheme onto the theme's CSS variables. A
 * photo-derived scheme carries the full role palette (`roles`); a static
 * preset only re-colours the accents, with the sport fallback keeping the
 * background/type roles legible.
 */
const colorsToVars = (
  colors: ColorScheme | undefined,
  sport: string
): PhotoCssVars => {
  const fb = fallbackPalette(sport);
  return {
    "--accent": colors?.primary ?? fb.accent,
    "--accent-2": colors?.secondary ?? colors?.primary ?? fb.accent,
    "--bg": colors?.roles?.background ?? fb.background,
    "--body": colors?.roles?.body ?? fb.body,
    "--headline": colors?.roles?.headline ?? fb.headline,
    "--on-accent": colors?.onPrimary ?? fb.onAccent,
  };
};

// The sub-line only carries metrics the activity actually has — a stripped
// field (toggled off, or absent from the file) drops out instead of leaving
// a dashed placeholder in the sentence.
const heroSubLine = (data: PhotoActivity): string => {
  const subParts: string[] = [formatDuration(data.durationSec)];
  if (data.sport === "ride" && isNum(data.elevationGainM)) {
    subParts.push(`${formatNumber(data.elevationGainM)} m elev`);
  } else if (data.sport === "run" && isNum(data.avgPaceMinPerKm)) {
    subParts.push(`${formatPaceMin(data.avgPaceMinPerKm)} /km`);
  } else if (data.sport === "swim" && isNum(data.avgPacePer100m)) {
    subParts.push(`${formatPaceSec(data.avgPacePer100m)} /100m`);
  } else if (data.sport === "triathlon") {
    subParts.push("triathlon");
  }
  return subParts.join(" · ");
};

const placeholderBackground = (sport: string): string => {
  if (sport === "swim") {
    return "linear-gradient(180deg, #6ba8c5 0%, #2d5a78 50%, #0e2030 100%)";
  }
  if (sport === "run") {
    return "linear-gradient(180deg, #d8c5a0 0%, #a87d52 40%, #4a2a18 100%)";
  }
  return "linear-gradient(180deg, #2c3848 0%, #5a6a7e 40%, #8e7458 80%, #c89d6e 100%)";
};

const STORY_LABEL = {
  ride: "A RIDE STORY",
  run: "A RUNNING STORY",
  swim: "A SWIM STORY",
  triathlon: "A TRIATHLON STORY",
} satisfies Record<Sport, string>;

// Placeholder texture when no photo is loaded: a fine light/dark dot grain.
const PlaceholderGrain = () => (
  <svg
    aria-hidden="true"
    height="100%"
    style={{
      inset: 0,
      mixBlendMode: "overlay",
      opacity: 0.45,
      position: "absolute",
    }}
    width="100%"
  >
    <title>Texture</title>
    <defs>
      <pattern height="6" id="ph-grain" patternUnits="userSpaceOnUse" width="6">
        <rect fill="transparent" height="6" width="6" />
        <circle cx="2" cy="2" fill="#fff" opacity="0.5" r="0.6" />
        <circle cx="4" cy="5" fill="#000" opacity="0.4" r="0.4" />
      </pattern>
    </defs>
    <rect fill="url(#ph-grain)" height="100%" width="100%" />
  </svg>
);

const STORY_STYLE = {
  color: HEADLINE_VAR,
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: "0.2em",
  lineHeight: 1.45,
  textAlign: "right",
} satisfies CSSProperties;

// Top masthead: the "Effort" wordmark + issue line, and the story label.
const Masthead = ({
  data,
  left,
  right,
  top,
}: {
  data: PhotoActivity;
  left: number;
  right: number;
  top: number;
}) => (
  <div
    style={{
      alignItems: "flex-start",
      display: "flex",
      justifyContent: "space-between",
      left,
      position: "absolute",
      right,
      top,
    }}
  >
    <div>
      <div
        style={{
          color: ACCENT_2_VAR,
          fontFamily: PLAYFAIR,
          fontSize: 52,
          fontStyle: "italic",
          letterSpacing: "-0.01em",
        }}
      >
        Effort
      </div>
      <div
        style={{
          color: BODY_VAR,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "0.28em",
          marginTop: 12,
        }}
      >
        {["VOL. 01", formatDateUpper(data.date)]
          .filter((bit) => bit !== "")
          .join(" · ")}
      </div>
    </div>
    <div style={STORY_STYLE}>
      {STORY_LABEL[data.sport]}
      {hasText(data.location) ? (
        <>
          <br />
          <span style={{ color: BODY_VAR }}>{data.location.toUpperCase()}</span>
        </>
      ) : null}
    </div>
  </div>
);

// Route trace — always white for legibility across arbitrary photos.
const RouteTrace = ({
  data,
  right,
  top,
}: {
  data: PhotoActivity;
  right: number;
  top: number;
}) => {
  const multi = isMultiActivity(data);
  const routes = multi ? segmentRoutes(data) : [];
  return (
    <svg
      aria-hidden="true"
      style={{
        height: 240,
        opacity: 0.9,
        position: "absolute",
        right,
        top,
        width: 320,
      }}
      viewBox="0 0 400 300"
    >
      <title>Route trace</title>
      {multi ? (
        <OverlayRoute
          colors={whiteRamp(routes.length)}
          h={300}
          pad={20}
          routes={routes.map((r) => r.coords)}
          shadow={ROUTE_SHADOW}
          strokeWidth={2.5}
          w={400}
        />
      ) : (
        <path
          d={routePath(data.routeCoordinates, 400, 300, 20)}
          fill="none"
          stroke={WHITE}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2.5}
          style={{ filter: ROUTE_SHADOW }}
        />
      )}
    </svg>
  );
};

const TITLE_STYLE = {
  color: HEADLINE_VAR,
  fontFamily: PLAYFAIR,
  fontSize: 92,
  fontStyle: "italic",
  fontWeight: 400,
  letterSpacing: "-0.015em",
  lineHeight: 0.95,
  margin: 0,
  maxWidth: 800,
  textShadow: "0 4px 24px rgba(0,0,0,0.4)",
  textWrap: "pretty",
} satisfies CSSProperties;

const HERO_BIG_STYLE = {
  color: "var(--accent)",
  fontFamily: PLAYFAIR,
  fontSize: 130,
  fontWeight: 400,
  letterSpacing: "-0.04em",
  lineHeight: 1,
} satisfies CSSProperties;

// The hero distance + its unit, over the sub-line of supporting metrics.
const HeroStat = ({ data }: { data: PhotoActivity }) => {
  const swim = data.sport === "swim";
  return (
    <div>
      <div style={{ alignItems: "baseline", display: "flex", gap: 12 }}>
        <span style={HERO_BIG_STYLE}>
          {swim
            ? (data.distanceKm * 1000).toFixed(0)
            : data.distanceKm.toFixed(1)}
        </span>
        <span
          style={{
            color: ACCENT_2_VAR,
            fontFamily: PLAYFAIR,
            fontSize: 40,
            fontStyle: "italic",
          }}
        >
          {swim ? "m" : "km"}
        </span>
      </div>
      <div
        style={{
          color: BODY_VAR,
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: "0.16em",
          marginTop: 14,
        }}
      >
        {heroSubLine(data).toUpperCase()}
      </div>
    </div>
  );
};

const BYLINE_STYLE = {
  color: BODY_VAR,
  fontSize: 24,
  fontWeight: 700,
  letterSpacing: "0.22em",
  paddingBottom: 18,
  textAlign: "right",
} satisfies CSSProperties;

const BYLINE_NAME_STYLE = {
  color: ACCENT_2_VAR,
  fontFamily: PLAYFAIR,
  fontSize: 42,
  fontStyle: "italic",
  fontWeight: 400,
  letterSpacing: "0",
} satisfies CSSProperties;

export const ThemePhoto = ({
  data,
  photoUrl,
  colors,
  imageTransform,
}: ThemePhotoProps) => {
  const { width, height, safe } = useFormat();
  // Masthead / title / hero keep to the safe area; the photo + vignette bleed.
  const insets = useSafeInsets({ bottom: 70, left: 80, right: 80, top: 70 });
  const { sport } = data;

  return (
    <div
      style={{
        ...colorsToVars(colors, sport),
        background: placeholderBackground(sport),
        color: HEADLINE_VAR,
        fontFamily: "var(--font-dm-sans), sans-serif",
        height,
        overflow: "hidden",
        position: "relative",
        width,
      }}
    >
      {hasText(photoUrl) ? (
        <PhotoLayer imageTransform={imageTransform} photoUrl={photoUrl} />
      ) : (
        <PlaceholderGrain />
      )}
      {/* Neutral vignette — pure black to read consistently across any photo. */}
      <div
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.7) 100%)",
          inset: 0,
          position: "absolute",
        }}
      />
      <Masthead
        data={data}
        left={insets.left}
        right={insets.right}
        top={insets.top}
      />
      {sport === "swim" ? null : (
        <RouteTrace
          data={data}
          right={Math.max(60, safe.right)}
          top={Math.max(200, safe.top)}
        />
      )}
      <div
        style={{
          bottom: insets.bottom + 150,
          left: insets.left,
          position: "absolute",
          right: insets.right,
        }}
      >
        <div
          aria-hidden
          style={{
            background:
              "linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
            height: 4,
            marginBottom: 28,
            width: 120,
          }}
        />
        <h1 style={TITLE_STYLE}>{data.title}</h1>
      </div>
      {/* Hero stat block + small stats — bottom strip */}
      <div
        style={{
          alignItems: "flex-end",
          bottom: insets.bottom,
          display: "flex",
          justifyContent: "space-between",
          left: insets.left,
          position: "absolute",
          right: insets.right,
        }}
      >
        <HeroStat data={data} />
        {hasText(data.athleteName) ? (
          <div style={BYLINE_STYLE}>
            BY
            <br />
            <span style={BYLINE_NAME_STYLE}>{data.athleteName}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
