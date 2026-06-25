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
} from "@/lib/format";
import { isMultiActivity, segmentRoutes } from "@/lib/multi-activity";
import type { ColorScheme } from "@/theme/core/colors";
import { defineTheme, type ThemeProps } from "@/theme/core/theme-contract";
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

function fallbackPalette(sport: string): StaticPalette {
  if (sport === "swim") {
    return {
      background: "#2d5a78",
      headline: "#ffffff",
      body: "rgba(255,255,255,0.78)",
      accent: "#6ba8c5",
      onAccent: "#0a0a0a",
    };
  }
  if (sport === "run") {
    return {
      background: "#4a2a18",
      headline: "#ffffff",
      body: "rgba(255,255,255,0.78)",
      accent: "#d8c5a0",
      onAccent: "#0a0a0a",
    };
  }
  return {
    background: "#5a6a7e",
    headline: "#ffffff",
    body: "rgba(255,255,255,0.78)",
    accent: "#c89d6e",
    onAccent: "#0a0a0a",
  };
}

/**
 * Map the resolved colour scheme onto the theme's CSS variables. A
 * photo-derived scheme carries the full role palette (`roles`); a static
 * preset only re-colours the accents, with the sport fallback keeping the
 * background/type roles legible.
 */
function colorsToVars(
  colors: ColorScheme | undefined,
  sport: string
): React.CSSProperties {
  const fb = fallbackPalette(sport);
  return {
    ["--bg" as string]: colors?.roles?.background ?? fb.background,
    ["--headline" as string]: colors?.roles?.headline ?? fb.headline,
    ["--body" as string]: colors?.roles?.body ?? fb.body,
    ["--accent" as string]: colors?.primary ?? fb.accent,
    ["--accent-2" as string]: colors?.secondary ?? colors?.primary ?? fb.accent,
    ["--on-accent" as string]: colors?.onPrimary ?? fb.onAccent,
  } as React.CSSProperties;
}

export function ThemePhoto({
  data,
  photoUrl,
  colors,
  imageTransform,
}: ThemePhotoProps) {
  const { width, height, safe } = useFormat();
  // Masthead / title / hero keep to the safe area; the photo + vignette bleed.
  const insets = useSafeInsets({ top: 70, right: 80, bottom: 70, left: 80 });
  const sport = data.sport;
  const isPool = sport === "swim";
  const multi = isMultiActivity(data);
  const routes = multi ? segmentRoutes(data) : [];

  const cssVars = colorsToVars(colors, sport);

  // The sub-line only carries metrics the activity actually has — a stripped
  // field (toggled off, or absent from the file) drops out instead of leaving
  // a dashed placeholder in the sentence.
  const has = (n: number | undefined): n is number =>
    n !== undefined && Number.isFinite(n);
  const subParts: string[] = [formatDuration(data.durationSec)];
  if (sport === "ride" && has(data.elevationGainM)) {
    subParts.push(`${formatNumber(data.elevationGainM)} m elev`);
  } else if (sport === "run" && has(data.avgPaceMinPerKm)) {
    subParts.push(`${formatPaceMin(data.avgPaceMinPerKm)} /km`);
  } else if (sport === "swim" && has(data.avgPacePer100m)) {
    subParts.push(`${formatPaceSec(data.avgPacePer100m)} /100m`);
  } else if (sport === "triathlon") {
    subParts.push("triathlon");
  }
  const hero: { big: string | number; unit: string; sub: string } = {
    big:
      sport === "swim"
        ? (data.distanceKm * 1000).toFixed(0)
        : data.distanceKm.toFixed(1),
    unit: sport === "swim" ? "m" : "km",
    sub: subParts.join(" · "),
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
        width,
        height,
        background: placeholderBg,
        fontFamily: "var(--font-dm-sans), sans-serif",
        color: "var(--headline)",
        position: "relative",
        overflow: "hidden",
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
            position: "absolute",
            inset: 0,
            opacity: 0.45,
            mixBlendMode: "overlay",
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
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.7) 100%)",
        }}
      />
      {/* Top masthead */}
      <div
        style={{
          position: "absolute",
          top: insets.top,
          left: insets.left,
          right: insets.right,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: 52,
              fontStyle: "italic",
              letterSpacing: "-0.01em",
              color: "var(--accent-2)",
            }}
          >
            Effort
          </div>
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.28em",
              marginTop: 12,
              color: "var(--body)",
              fontWeight: 700,
            }}
          >
            {["VOL. 01", formatDateUpper(data.date)]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: 26,
            letterSpacing: "0.2em",
            color: "var(--headline)",
            fontWeight: 700,
            lineHeight: 1.45,
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
            position: "absolute",
            top: Math.max(200, safe.top),
            right: Math.max(60, safe.right),
            width: 320,
            height: 240,
            opacity: 0.9,
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
          position: "absolute",
          bottom: insets.bottom + 150,
          left: insets.left,
          right: insets.right,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 120,
            height: 4,
            background:
              "linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%)",
            marginBottom: 28,
            boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
          }}
        />
        <h1
          style={{
            fontFamily: "var(--font-playfair), serif",
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: 92,
            lineHeight: 0.95,
            letterSpacing: "-0.015em",
            margin: 0,
            color: "var(--headline)",
            textShadow: "0 4px 24px rgba(0,0,0,0.4)",
            textWrap: "pretty",
            maxWidth: 800,
          }}
        >
          {data.title}
        </h1>
      </div>
      {/* Hero stat block + small stats — bottom strip */}
      <div
        style={{
          position: "absolute",
          bottom: insets.bottom,
          left: insets.left,
          right: insets.right,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: 130,
                fontWeight: 400,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                color: "var(--accent)",
              }}
            >
              {hero.big}
            </span>
            <span
              style={{
                fontSize: 40,
                color: "var(--accent-2)",
                fontStyle: "italic",
                fontFamily: "var(--font-playfair), serif",
              }}
            >
              {hero.unit}
            </span>
          </div>
          <div
            style={{
              fontSize: 26,
              letterSpacing: "0.16em",
              color: "var(--body)",
              marginTop: 14,
              fontWeight: 700,
            }}
          >
            {hero.sub.toUpperCase()}
          </div>
        </div>
        {data.athleteName && (
          <div
            style={{
              textAlign: "right",
              fontSize: 24,
              letterSpacing: "0.22em",
              color: "var(--body)",
              paddingBottom: 18,
              fontWeight: 700,
            }}
          >
            BY
            <br />
            <span
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontStyle: "italic",
                fontSize: 42,
                letterSpacing: "0",
                fontWeight: 400,
                color: "var(--accent-2)",
              }}
            >
              {data.athleteName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export const photoTheme = defineTheme({
  id: "photo",
  label: "PHOTO",
  tagline: "magazine cover",
  uses: USES,
  // Adjustable, and photo-first: until the user picks, the colours come from
  // the photo (the old PhotoMood, now the shared photo-derived colour source).
  colors: {
    default: { primary: "#c89d6e", onPrimary: "#0a0a0a" },
    defaultChoice: { kind: "photo", variant: "vibrant" },
    userAdjustable: true,
  },
  photo: { defaultOn: true },
  Component: ThemePhoto,
});
