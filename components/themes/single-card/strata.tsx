// STRATA — a generative card built from the activity itself; a background photo
// is optional. The route's wander (top) is morphed point-by-point down through a
// woven field of strata into the elevation / pace profile (bottom); both source
// curves stay highlighted, the layers between are the abstraction. Over a photo,
// the mood becomes a tinted legibility scrim and the field rides on top.
// Parameterised by `config` (mood · density · legend) — the model and the morph
// maths live in `lib/strata.ts`. Type: Syne (display) + JetBrains Mono
// (cartographic labels / data). Renders to plain inline SVG (no CSS filters) so
// it rasterises cleanly via snapdom.

import type { Sport } from "@/lib/activity";
import { mixHex } from "@/lib/chart-helpers";
import {
  formatDateUpper,
  formatDuration,
  formatNumber,
  formatPaceMin,
  formatPaceSec,
} from "@/lib/format";

import {
  buildStrata,
  DEFAULT_STRATA_CONFIG,
  resolveStrataSource,
  STRATA_DENSITY_K,
  STRATA_MOODS,
  STRATA_PARAMS,
  type StrataConfig,
  smoothPath,
  strataDirectionArrow,
  strataPeakMarker,
} from "@/lib/strata";
import {
  type ActivityView,
  defineTheme,
  type ThemeProps,
} from "@/lib/theme-contract";
import { CoverPhoto } from "../shared/cover-photo";
import { useFormat, useSafeInsets } from "../shared/format-context";
import { usePhotoEffects, usePhotoImageSize } from "../shared/photo-fx";

const DISPLAY = "var(--font-syne), sans-serif";
const MONO = "var(--font-mono), monospace";

// The morph field's internal coordinate space; the SVG scales to fill the hero.
const FIELD_W = 920;
const FIELD_H = 880;

// The stat footer's own base thickness. A platform safe-bottom larger than this
// (e.g. TikTok's tall caption keep-out) becomes margin below the strip — the
// photo / mood wash bleeds through it — rather than stretching the coloured band
// into an empty slab. 48 keeps the 4:5 feed master pixel-identical.
const STAT_FOOTER_BASE = 48;

const USES = [
  "elevation",
  "elevationViz",
  "location",
  "pace",
  "route",
] as const;

type ThemeStrataProps = ThemeProps<(typeof USES)[number], StrataConfig>;

/** The reusable strata SVG: the woven field plus the two highlighted heroes. */
function StrataField({
  data,
  config,
  overPhoto,
}: {
  config: StrataConfig;
  data: ActivityView;
  /** Boost halos + outline the captions so the field reads over a photo. */
  overPhoto: boolean;
}) {
  const tokens = STRATA_MOODS[config.mood];
  const source = resolveStrataSource(data);
  if (!source) {
    return null;
  }

  const { curves, routePts, elevPts } = buildStrata({
    routeCoords: source.routeCoords,
    profile: source.profile,
    W: FIELD_W,
    H: FIELD_H,
    K: STRATA_DENSITY_K[config.density],
  });
  if (curves.length < 2) {
    return null;
  }
  const hero0 = curves[0];
  const heroN = curves.at(-1);
  if (!heroN) {
    return null;
  }
  // One smoothed path per hero ridge, reused for both the halo and crisp stroke.
  const dHero0 = smoothPath(hero0.pts);
  const dHeroN = smoothPath(heroN.pts);
  const haloW = tokens.heroW + 8;
  // Over a photo the heroes need a firmer halo and the markers an outline.
  const haloOpacity = overPhoto ? 0.34 : 0.18;

  // Markers, revealed by `legend`: the peak height beside the highest point of
  // the elevation ridge, and a direction arrow set beside the route.
  const peak = config.legend ? strataPeakMarker(elevPts, source.elevMax) : null;
  const arrow = config.legend
    ? strataDirectionArrow(routePts, FIELD_W, FIELD_H, 30)
    : null;
  const peakHalfW = peak ? peak.label.length * 6.5 : 0;
  const peakLabelX = peak
    ? Math.max(12 + peakHalfW, Math.min(FIELD_W - 12 - peakHalfW, peak.x))
    : 0;

  return (
    <svg
      aria-hidden="true"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        overflow: "visible",
      }}
      viewBox={`0 0 ${FIELD_W} ${FIELD_H}`}
    >
      <title>Strata — the route morphing into the elevation profile</title>

      {/* The woven in-between layers — back to front, the route unfurling. */}
      {curves.map((c, k) => {
        if (k === 0 || k === curves.length - 1) {
          return null;
        }
        const col = mixHex(tokens.routeColor, tokens.elevColor, c.t);
        // Airy waist: faintest at mid-morph, firmer near the two heroes.
        const alpha = tokens.lineAlpha * (0.6 + 0.55 * Math.abs(2 * c.t - 1));
        return (
          <path
            d={smoothPath(c.pts)}
            fill="none"
            key={c.t}
            stroke={col}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={alpha}
            strokeWidth={tokens.midW}
          />
        );
      })}

      {/* HERO — the elevation / pace profile (bottom), with a soft halo. */}
      <path
        d={dHeroN}
        fill="none"
        stroke={tokens.elevColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={haloOpacity}
        strokeWidth={haloW}
      />
      <path
        d={dHeroN}
        fill="none"
        stroke={tokens.elevColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={tokens.heroW}
      />
      {/* HERO — the real route (top). */}
      <path
        d={dHero0}
        fill="none"
        stroke={tokens.routeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={haloOpacity}
        strokeWidth={haloW}
      />
      <path
        d={dHero0}
        fill="none"
        stroke={tokens.routeColor}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={tokens.heroW}
      />

      {/* Direction arrow, set beside the route (toggled by `legend`). A clean
          line + chevron — never on the path, in the clearest open spot. */}
      {arrow ? (
        <g
          transform={`translate(${arrow.x} ${arrow.y}) rotate(${arrow.angle})`}
        >
          <g
            fill="none"
            stroke={`rgba(${tokens.scrim},0.5)`}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={7}
          >
            <path d="M-15 0 L8 0" />
            <path d="M0 -7 L9 0 L0 7" />
          </g>
          <g
            fill="none"
            stroke={tokens.routeColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
          >
            <path d="M-15 0 L8 0" />
            <path d="M0 -7 L9 0 L0 7" />
          </g>
        </g>
      ) : null}

      {/* Peak height, pinned beside the highest point of the elevation ridge,
          with a short tick to the exact peak (kept inside the frame). */}
      {peak ? (
        <g>
          <line
            stroke={tokens.elevColor}
            strokeLinecap="round"
            strokeWidth={2.5}
            x1={peak.x}
            x2={peak.x}
            y1={peak.y - 3}
            y2={peak.y - 16}
          />
          <text
            fill={tokens.text}
            fontFamily={MONO}
            fontSize={21}
            fontWeight={600}
            letterSpacing={1}
            paintOrder="stroke"
            stroke={`rgba(${tokens.scrim},0.72)`}
            strokeWidth={4}
            textAnchor="middle"
            x={peakLabelX}
            y={peak.y - 24}
          >
            {peak.label}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

/** Sport-appropriate [label, value, unit] stats for the foot of the card. The
 *  middle metric is omitted when the activity lacks it (or the user toggled it
 *  off — `applyVisibility` strips the field), never shown as a dash. */
function statRow(data: ActivityView): [string, string, string][] {
  const has = (n: number | undefined): n is number =>
    n !== undefined && Number.isFinite(n);
  const time: [string, string, string] = [
    "TIME",
    formatDuration(data.durationSec),
    "",
  ];
  const row: [string, string, string][] = [];
  if (data.sport === "run") {
    row.push(["DST", data.distanceKm.toFixed(1), "km"]);
    if (has(data.avgPaceMinPerKm)) {
      row.push(["PACE", formatPaceMin(data.avgPaceMinPerKm), "/km"]);
    }
  } else if (data.sport === "swim") {
    row.push(["DST", (data.distanceKm * 1000).toFixed(0), "m"]);
    if (has(data.avgPacePer100m)) {
      row.push(["/100", formatPaceSec(data.avgPacePer100m), ""]);
    }
  } else {
    // ride, triathlon, and anything else: distance · elevation · time.
    row.push(["DST", data.distanceKm.toFixed(1), "km"]);
    if (has(data.elevationGainM)) {
      row.push(["ELEV", formatNumber(data.elevationGainM), "m"]);
    }
  }
  row.push(time);
  return row;
}

function sportLabel(sport: Sport): string {
  if (sport === "ride") {
    return "A CYCLE";
  }
  if (sport === "run") {
    return "A RUN";
  }
  if (sport === "swim") {
    return "A SWIM";
  }
  if (sport === "triathlon") {
    return "A TRIATHLON";
  }
  return "AN EFFORT";
}

export function ThemeStrata({
  data,
  photoUrl,
  imageTransform,
  config = DEFAULT_STRATA_CONFIG,
}: ThemeStrataProps) {
  const tokens = STRATA_MOODS[config.mood];
  const stats = statRow(data);
  const statText = tokens.inkStat ? tokens.text : "#fff";
  const overPhoto = Boolean(photoUrl);
  const fx = usePhotoEffects();
  const imageSize = usePhotoImageSize();
  const { width, height } = useFormat();
  // The stat strip bleeds to the canvas edges (negative side margins), so the
  // resolved insets are reused for both the column padding and the strip.
  const insets = useSafeInsets({ top: 78, right: 80, bottom: 0, left: 80 });
  const metaParts = [
    (data.location || "").toUpperCase(),
    formatDateUpper(data.date),
  ].filter(Boolean);

  return (
    <div
      style={{
        width,
        height,
        background: tokens.bg,
        color: tokens.text,
        fontFamily: MONO,
        position: "relative",
        // Own stacking context so the z-index:-1 photo/scrim paint above this
        // background (not behind it) yet below all content.
        isolation: "isolate",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      {/* Optional background photo + a mood-tinted legibility scrim. Both sit at
          z-index -1 (above the solid mood background, below all content) so the
          woven field and type ride on top without rewrapping the layout. */}
      {photoUrl ? (
        <>
          <div
            aria-hidden
            style={{ position: "absolute", inset: 0, zIndex: -1 }}
          >
            {imageSize ? (
              <CoverPhoto
                boxH={height}
                boxW={width}
                effects={fx}
                imageSize={imageSize}
                photoUrl={photoUrl}
                transform={imageTransform}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url(${photoUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            )}
          </div>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: -1,
              background: `linear-gradient(180deg, rgba(${tokens.scrim},0.86) 0%, rgba(${tokens.scrim},0.36) 17%, rgba(${tokens.scrim},0) 37%, rgba(${tokens.scrim},0) 58%, rgba(${tokens.scrim},0.5) 84%, rgba(${tokens.scrim},0.85) 100%)`,
            }}
          />
        </>
      ) : null}

      {/* Meta band. */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: "0.26em",
          marginTop: insets.top,
          marginLeft: insets.left,
          marginRight: insets.right,
        }}
      >
        <span>STRATA · {sportLabel(data.sport)}</span>
        <span style={{ opacity: 0.6 }}>{tokens.label}</span>
      </div>
      <div
        style={{
          height: 1.5,
          background: "currentColor",
          opacity: 0.28,
          marginTop: 22,
        }}
      />

      {/* Title + place / date. */}
      <h1
        style={{
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: 82,
          lineHeight: 0.94,
          letterSpacing: "-0.02em",
          marginTop: "34px",
          marginBottom: "14px",
          marginLeft: insets.left,
          marginRight: insets.right,
          maxWidth: "94%",
          textWrap: "pretty",
          textShadow: overPhoto
            ? `0 2px 30px rgba(${tokens.scrim},0.6)`
            : undefined,
        }}
      >
        {data.title}
      </h1>
      <div
        style={{
          fontSize: 25,
          letterSpacing: "0.16em",
          opacity: 0.7,
          fontWeight: 500,
          marginLeft: insets.left,
          marginRight: insets.right,
        }}
      >
        {metaParts.join(" · ")}
      </div>

      {/* The strata field — the hero. */}
      <div
        style={{
          flex: 1,
          position: "relative",
          margin: "20px 0 8px 0",
          minHeight: 0,
        }}
      >
        <StrataField config={config} data={data} overPhoto={overPhoto} />
      </div>

      {/* Stat strip. */}
      <div
        style={{
          background: tokens.statBg,
          borderTop: `1.5px solid ${tokens.statBorder}`,
          paddingTop: 30,
          // The coloured footer keeps its own base thickness; the rest of the
          // platform safe-bottom is margin below it (background bleeds through),
          // so a tall keep-out lifts the strip clear instead of stretching it.
          paddingBottom: Math.min(insets.bottom, STAT_FOOTER_BASE),
          paddingLeft: insets.left,
          paddingRight: insets.right,

          display: "flex",
          justifyContent: "space-between",
          gap: 24,
          color: statText,
          alignItems: "flex-end",
        }}
      >
        {stats.map(([k, v, u]) => (
          <div key={k}>
            <div
              style={{
                fontSize: 23,
                letterSpacing: "0.22em",
                opacity: 0.7,
                fontWeight: 600,
              }}
            >
              {k}
            </div>
            <div
              style={{
                marginTop: 8,
                fontFamily: DISPLAY,
                fontSize: 56,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {v}
              {u ? (
                <span
                  style={{
                    fontSize: 26,
                    opacity: 0.65,
                    marginLeft: 6,
                    fontFamily: MONO,
                  }}
                >
                  {u}
                </span>
              ) : null}
            </div>
          </div>
        ))}
        <div
          style={{
            fontSize: 22,
            letterSpacing: "0.2em",
            opacity: 0.6,
            fontWeight: 600,
            textAlign: "right",
          }}
        >
          № 01
          <br />
          EFFORT
        </div>
      </div>
    </div>
  );
}

export const strataTheme = defineTheme({
  id: "strata",
  label: "STRATA",
  tagline: "woven topography",
  uses: USES,
  // Fixed: the mood param drives the whole palette.
  colors: {
    default: { primary: "#ffd98a", secondary: "#ff6a3a" },
    userAdjustable: false,
  },
  photo: { defaultOn: false },
  params: STRATA_PARAMS,
  defaults: DEFAULT_STRATA_CONFIG,
  Component: ThemeStrata,
});
