// PHOTO — magazine cover. Full-bleed background photo, route + type overlaid.
// Type: Playfair Display (display) + DM Sans (body)
// User uploads photo; we use a rich placeholder gradient if none.
// Colours come from the photo via the image-palette pipeline → CSS custom
// properties (--bg / --headline / --body / --accent / --on-accent). A static
// fallback palette is applied inline so the card stays legible while
// extraction is in flight or when no photo is loaded.

import { paletteToCssVars } from "@/hooks/use-image-palette";
import { routePath } from "@/lib/chart-helpers";
import type { PaletteTheme } from "@/lib/palette";
import type { ActivityCardProps } from "./types";

interface ThemePhotoProps extends ActivityCardProps {
  paletteTheme?: PaletteTheme | null;
}

interface StaticPalette {
  accent: string;
  background: string;
  body: string;
  headline: string;
  onAccent: string;
}

// Sport-tinted fallback used when no photo is loaded (or extraction is in
// flight on the very first photo). Picks up the moody-landscape feel of the
// original hardcoded gradient.
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

function fallbackVars(palette: StaticPalette): React.CSSProperties {
  return {
    ["--bg" as string]: palette.background,
    ["--headline" as string]: palette.headline,
    ["--body" as string]: palette.body,
    ["--accent" as string]: palette.accent,
    ["--on-accent" as string]: palette.onAccent,
  } as React.CSSProperties;
}

export function ThemePhoto({ data, photoUrl, paletteTheme }: ThemePhotoProps) {
  const sport = data.sport;
  const isPool = sport === "swim";

  const cssVars = paletteTheme
    ? paletteToCssVars(paletteTheme)
    : fallbackVars(fallbackPalette(sport));

  // sport-appropriate hero stat + small stats
  let hero: { big: string | number; unit: string; sub: string };
  if (sport === "ride") {
    hero = {
      big: data.distance_km.toFixed(1),
      unit: "km",
      sub: `${data.duration} · ${data.elevation_gain_m ?? "—"} m elev`,
    };
  } else if (sport === "run") {
    hero = {
      big: data.distance_km.toFixed(1),
      unit: "km",
      sub: `${data.duration} · ${data.avg_pace_min_per_km ?? "—"} /km`,
    };
  } else if (sport === "swim") {
    hero = {
      big: (data.distance_km * 1000).toFixed(0),
      unit: "m",
      sub: `${data.duration} · ${data.avg_pace_per_100m ?? "—"} /100m`,
    };
  } else {
    hero = {
      big: data.distance_km,
      unit: "km",
      sub: `${data.duration} · triathlon`,
    };
  }

  // Placeholder photo — moody landscape gradient if none
  let placeholderBg =
    "linear-gradient(180deg, #2c3848 0%, #5a6a7e 40%, #8e7458 80%, #c89d6e 100%)";
  if (sport === "swim") {
    placeholderBg =
      "linear-gradient(180deg, #6ba8c5 0%, #2d5a78 50%, #0e2030 100%)";
  } else if (sport === "run") {
    placeholderBg =
      "linear-gradient(180deg, #d8c5a0 0%, #a87d52 40%, #4a2a18 100%)";
  }

  let storyLabel = "A TRIATHLON STORY";
  if (sport === "ride") {
    storyLabel = "A RIDE STORY";
  } else if (sport === "run") {
    storyLabel = "A RUNNING STORY";
  } else if (sport === "swim") {
    storyLabel = "A SWIM STORY";
  }

  return (
    <div
      style={{
        ...cssVars,
        width: 1080,
        height: 1350,
        background: photoUrl ? `url(${photoUrl}) center/cover` : placeholderBg,
        fontFamily: "var(--font-dm-sans), sans-serif",
        color: "var(--headline)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* placeholder texture if no photo */}
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

      {/* Photo-tinted vignette: top + bottom edges blend toward the extracted
          background colour so the headline + masthead always sit on a quiet
          area regardless of what the photo looks like at those spots. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--bg) 75%, transparent) 0%, transparent 28%, transparent 55%, color-mix(in oklab, var(--bg) 88%, transparent) 100%)",
        }}
      />

      {/* Top masthead */}
      <div
        style={{
          position: "absolute",
          top: 70,
          left: 80,
          right: 80,
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
              color: "var(--headline)",
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
            VOL. 01 · {data.date.toUpperCase()}
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
            fontSize: 26,
            letterSpacing: "0.2em",
            color: "var(--body)",
            fontWeight: 700,
            lineHeight: 1.45,
          }}
        >
          {storyLabel}
          <br />
          <span style={{ opacity: 0.75 }}>{data.location.toUpperCase()}</span>
        </div>
      </div>

      {/* Route trace — thin, elegant, top-right area */}
      {!isPool && (
        <svg
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 200,
            right: 60,
            width: 320,
            height: 240,
            opacity: 0.9,
          }}
          viewBox="0 0 400 300"
        >
          <title>Route trace</title>
          <path
            d={routePath(data.route_coordinates, 400, 300, 20)}
            fill="none"
            stroke="var(--accent)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            style={{ filter: "drop-shadow(0 0 12px rgba(0,0,0,0.4))" }}
          />
        </svg>
      )}

      {/* Big headline near bottom */}
      <div style={{ position: "absolute", bottom: 220, left: 80, right: 80 }}>
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
          {data.ride_name}
        </h1>
      </div>

      {/* Hero stat block + small stats — bottom strip */}
      <div
        style={{
          position: "absolute",
          bottom: 70,
          left: 80,
          right: 80,
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
                color: "var(--body)",
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
        {data.athlete_name && (
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
                color: "var(--headline)",
              }}
            >
              {data.athlete_name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
