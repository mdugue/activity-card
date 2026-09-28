// PHOTO — magazine cover. Full-bleed background photo, route + type overlaid.
// Type: Playfair Display (display) + DM Sans (body)
// User uploads photo; we use a rich placeholder gradient if none.
// Colours come from the photo via the image-palette pipeline → CSS custom
// properties (--bg / --headline / --body / --accent / --on-accent). A static
// fallback palette is applied inline so the card stays legible while
// extraction is in flight or when no photo is loaded.

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
import type { ColorScheme } from "@/theme/core/colors";
import { defineTheme } from "@/theme/core/theme-contract";
import type { ThemeProps } from "@/theme/core/theme-contract";

import { useFormat, useSafeInsets } from "../shared/format-context";
import { OverlayRoute } from "../shared/overlay-route";
import { PhotoLayer } from "../shared/photo-layer";

const USES = ["athleteName", "elevation", "location", "pace", "route"] as const;

type ThemePhotoProps = ThemeProps<(typeof USES)[number]>;

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
      body: "rgba(255,255,255,0.78)",
      headline: "#ffffff",
      onAccent: "#0a0a0a",
    };
  }
  if (sport === "run") {
    return {
      accent: "#d8c5a0",
      background: "#4a2a18",
      body: "rgba(255,255,255,0.78)",
      headline: "#ffffff",
      onAccent: "#0a0a0a",
    };
  }
  return {
    accent: "#c89d6e",
    background: "#5a6a7e",
    body: "rgba(255,255,255,0.78)",
    headline: "#ffffff",
    onAccent: "#0a0a0a",
  };
};

/**
 * Map the resolved colour scheme onto the theme's CSS variables. A
 * photo-derived scheme carries the full role palette (`roles`); a static
 * preset only re-colours the accents, with the sport fallback keeping the
 * background/type roles legible.
 */
const colorsToVars = (
  colors: ColorScheme | undefined,
  sport: string
): React.CSSProperties => {
  const fb = fallbackPalette(sport);
  return {
    ["--bg" as string]: colors?.roles?.background ?? fb.background,
    ["--headline" as string]: colors?.roles?.headline ?? fb.headline,
    ["--body" as string]: colors?.roles?.body ?? fb.body,
    ["--accent" as string]: colors?.primary ?? fb.accent,
    ["--accent-2" as string]: colors?.secondary ?? colors?.primary ?? fb.accent,
    ["--on-accent" as string]: colors?.onPrimary ?? fb.onAccent,
  };
};

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
  const isPool = sport === "swim";
  const multi = isMultiActivity(data);
  const routes = multi ? segmentRoutes(data) : [];

  const cssVars = colorsToVars(colors, sport);

  // The sub-line only carries metrics the activity actually has — a stripped
  // field (toggled off, or absent from the file) drops out instead of leaving
  // a dashed placeholder in the sentence.
  const subParts: string[] = [formatDuration(data.durationSec)];
  if (sport === "ride" && isNum(data.elevationGainM)) {
    subParts.push(`${formatNumber(data.elevationGainM)} m elev`);
  } else if (sport === "run" && isNum(data.avgPaceMinPerKm)) {
    subParts.push(`${formatPaceMin(data.avgPaceMinPerKm)} /km`);
  } else if (sport === "swim" && isNum(data.avgPacePer100m)) {
    subParts.push(`${formatPaceSec(data.avgPacePer100m)} /100m`);
  } else if (sport === "triathlon") {
    subParts.push("triathlon");
  }
  const hero: { big: string | number; unit: string; sub: string } = {
    big:
      sport === "swim"
        ? (data.distanceKm * 1000).toFixed(0)
        : data.distanceKm.toFixed(1),
    sub: subParts.join(" · "),
    unit: sport === "swim" ? "m" : "km",
  };

  let placeholderBg =
    "linear-gradient(180deg, #2c3848 0%, #5a6a7e 40%, #8e7458 80%, #c89d6e 100%)";
  if (sport === "swim") {
    placeholderBg =
      "linear-gradient(180deg, #6ba8c5 0%, #2d5a78 50%, #0e2030 100%)";
  } else if (sport === "run") {
    placeholderBg =
      "linear-gradient(180deg, #d8c5a0 0%, #a87d52 40%, #4a2a18 100%)";
  }

  let storyLabel = "A SPORTS STORY";
  if (sport === "ride") {
    storyLabel = "A RIDE STORY";
  } else if (sport === "run") {
    storyLabel = "A RUNNING STORY";
  } else if (sport === "swim") {
    storyLabel = "A SWIM STORY";
  } else if (sport === "triathlon") {
    storyLabel = "A TRIATHLON STORY";
  }

  return (
    <div
      style={{
        ...cssVars,
        background: placeholderBg,
        color: "var(--headline)",
        fontFamily: "var(--font-dm-sans), sans-serif",
        height,
        overflow: "hidden",
        position: "relative",
        width,
      }}
    >
      {photoUrl ? (
        <PhotoLayer imageTransform={imageTransform} photoUrl={photoUrl} />
      ) : null}
      {!photoUrl && (
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
            <pattern
              height="6"
              id="ph-grain"
              patternUnits="userSpaceOnUse"
              width="6"
            >
              <rect fill="transparent" height="6" width="6" />
              <circle cx="2" cy="2" fill="#fff" opacity="0.5" r="0.6" />
              <circle cx="4" cy="5" fill="#000" opacity="0.4" r="0.4" />
            </pattern>
          </defs>
          <rect fill="url(#ph-grain)" height="100%" width="100%" />
        </svg>
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
      {/* Top masthead */}
      <div
        style={{
          alignItems: "flex-start",
          display: "flex",
          justifyContent: "space-between",
          left: insets.left,
          position: "absolute",
          right: insets.right,
          top: insets.top,
        }}
      >
        <div>
          <div
            style={{
              color: "var(--accent-2)",
              fontFamily: "var(--font-playfair), serif",
              fontSize: 52,
              fontStyle: "italic",
              letterSpacing: "-0.01em",
            }}
          >
            Effort
          </div>
          <div
            style={{
              color: "var(--body)",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "0.28em",
              marginTop: 12,
            }}
          >
            {["VOL. 01", formatDateUpper(data.date)]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div
          style={{
            color: "var(--headline)",
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: "0.2em",
            lineHeight: 1.45,
            textAlign: "right",
          }}
        >
          {storyLabel}
          {data.location ? (
            <>
              <br />
              <span style={{ color: "var(--body)" }}>
                {data.location.toUpperCase()}
              </span>
            </>
          ) : null}
        </div>
      </div>
      {/* Route trace — always white for legibility across arbitrary photos. */}
      {!isPool && (
        <svg
          aria-hidden="true"
          style={{
            height: 240,
            opacity: 0.9,
            position: "absolute",
            right: Math.max(60, safe.right),
            top: Math.max(200, safe.top),
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
              shadow="drop-shadow(0 0 12px rgba(0,0,0,0.4))"
              strokeWidth={2.5}
              w={400}
            />
          ) : (
            <path
              d={routePath(data.routeCoordinates, 400, 300, 20)}
              fill="none"
              stroke="#ffffff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              style={{ filter: "drop-shadow(0 0 12px rgba(0,0,0,0.4))" }}
            />
          )}
        </svg>
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
        <h1
          style={{
            color: "var(--headline)",
            fontFamily: "var(--font-playfair), serif",
            fontSize: 92,
            fontStyle: "italic",
            fontWeight: 400,
            letterSpacing: "-0.015em",
            lineHeight: 0.95,
            margin: 0,
            maxWidth: 800,
            textShadow: "0 4px 24px rgba(0,0,0,0.4)",
            textWrap: "pretty",
          }}
        >
          {data.title}
        </h1>
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
        <div>
          <div style={{ alignItems: "baseline", display: "flex", gap: 12 }}>
            <span
              style={{
                color: "var(--accent)",
                fontFamily: "var(--font-playfair), serif",
                fontSize: 130,
                fontWeight: 400,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              }}
            >
              {hero.big}
            </span>
            <span
              style={{
                color: "var(--accent-2)",
                fontFamily: "var(--font-playfair), serif",
                fontSize: 40,
                fontStyle: "italic",
              }}
            >
              {hero.unit}
            </span>
          </div>
          <div
            style={{
              color: "var(--body)",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: "0.16em",
              marginTop: 14,
            }}
          >
            {hero.sub.toUpperCase()}
          </div>
        </div>
        {data.athleteName && (
          <div
            style={{
              color: "var(--body)",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "0.22em",
              paddingBottom: 18,
              textAlign: "right",
            }}
          >
            BY
            <br />
            <span
              style={{
                color: "var(--accent-2)",
                fontFamily: "var(--font-playfair), serif",
                fontSize: 42,
                fontStyle: "italic",
                fontWeight: 400,
                letterSpacing: "0",
              }}
            >
              {data.athleteName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const photoTheme = defineTheme({
  id: "photo",
  label: "PHOTO",
  tagline: "magazine cover",
  uses: USES,
  // Adjustable, and photo-first: until the user picks, the colours come from
  // the photo (the old PhotoMood, now the shared photo-derived colour source).
  colors: {
    default: { onPrimary: "#0a0a0a", primary: "#c89d6e" },
    defaultChoice: { kind: "photo", variant: "vibrant" },
    userAdjustable: true,
  },
  photo: { defaultOn: true },
  Component: ThemePhoto,
});
