// Frame — ultra-minimal. One big datum per slide between hairline rules, paired
// with a sparkline for that metric (route · elevation · speed · power), vast
// negative space. Supports a background photo while staying clean: no gradients,
// just text-shadow. The last slide is the signature.

import type { ActivityData } from "@/lib/activity";
import {
  elevationSeries,
  frameStats,
  paceSeries,
  powerSeries,
  routeSeries,
  type StatItem,
  speedSeries,
} from "@/lib/carousel/stats";
import {
  isMultiActivity,
  segmentRoutes,
  segmentSeries,
} from "@/lib/multi-activity";
import type { PanelProps } from "../define-theme";
import { ElevationBand } from "../elevation-band";
import { RouteLine } from "../route-line";
import {
  SLIDE_PAD,
  type SlideTextColors,
  slideNumber,
  slideText,
} from "../templates/shared";

const SPARK_W = 900;
const SPARK_H = 132;

const bandColors = (color: string) => ({
  line: color,
  fillFrom: color,
  fillTo: "transparent",
});

/** Route silhouette spark — every leg for a project, the single route otherwise. */
function FrameRouteSpark({
  data,
  color,
}: {
  color: string;
  data: ActivityData;
}) {
  const multi = isMultiActivity(data);
  const routes = multi ? segmentRoutes(data).map((r) => r.coords) : [];
  const coords = multi ? undefined : routeSeries(data);
  if (multi ? routes.length === 0 : !coords) {
    return null;
  }
  return (
    <RouteLine
      accent={color}
      accent2={color}
      coords={coords}
      h={SPARK_H}
      ink={color}
      pad={10}
      routes={multi ? routes : undefined}
      showMarkers={false}
      strokeWidth={4}
      style="poster"
      w={SPARK_W}
    />
  );
}

/** Pick the single-activity series for a non-route datum. */
function frameSeries(
  data: ActivityData,
  statKey: string
): number[] | undefined {
  if (statKey === "elevation") {
    return elevationSeries(data);
  }
  if (statKey === "avgSpeed" || statKey === "maxSpeed") {
    return speedSeries(data);
  }
  if (statKey === "power") {
    return powerSeries(data);
  }
  if (statKey === "pace") {
    return paceSeries(data);
  }
  return;
}

/** Band spark (elevation / pace / speed / power) — legs side by side for a project. */
function FrameBandSpark({
  data,
  color,
  statKey,
}: {
  color: string;
  data: ActivityData;
  statKey: string;
}) {
  const mode: "elevation" | "pace" = statKey === "pace" ? "pace" : "elevation";
  const multi = isMultiActivity(data);

  if (multi && (statKey === "elevation" || statKey === "pace")) {
    const field = statKey === "pace" ? "paceProfile" : "elevationProfile";
    const { profiles, distances } = segmentSeries(data, field);
    if (profiles.length === 0) {
      return null;
    }
    return (
      <ElevationBand
        colors={bandColors(color)}
        h={SPARK_H}
        mode={mode}
        profile={undefined}
        profiles={profiles}
        w={SPARK_W}
        weights={distances}
      />
    );
  }

  const series = frameSeries(data, statKey);
  if (!series) {
    return null;
  }
  return (
    <ElevationBand
      colors={bandColors(color)}
      h={SPARK_H}
      mode={mode}
      profile={series}
      w={SPARK_W}
    />
  );
}

/** The matching sparkline for a Frame datum, or null when the metric has no
 *  series. Route renders as the silhouette; everything else as a band. */
function FrameSpark({
  statKey,
  data,
  color,
}: {
  color: string;
  data: ActivityData;
  statKey: string;
}) {
  if (statKey === "distance") {
    return <FrameRouteSpark color={color} data={data} />;
  }
  return <FrameBandSpark color={color} data={data} statKey={statKey} />;
}

function Rule({ color }: { color: string }) {
  return (
    <div
      aria-hidden
      style={{ height: 1, background: color, opacity: 0.22, width: "100%" }}
    />
  );
}

function FrameDatum({
  data,
  style,
  c,
  stat,
}: {
  c: SlideTextColors;
  data: ActivityData;
  stat: StatItem;
  style: PanelProps["style"];
}) {
  const sparkColor = c.shadow && style.dark ? "#ffffff" : style.accent;
  return (
    <div style={{ marginTop: "auto", marginBottom: "auto" }}>
      <Rule color={c.fg} />
      <div style={{ padding: "54px 0 44px" }}>
        <div
          style={{
            fontFamily: style.fonts.mono,
            fontSize: 24,
            letterSpacing: "0.24em",
            color: c.muted,
            textShadow: c.shadow || undefined,
          }}
        >
          {stat.label}
        </div>
        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "baseline",
            gap: 18,
          }}
        >
          <span
            style={{
              fontFamily: style.fonts.numeral,
              fontWeight: style.fonts.numeralWeight,
              fontSize: 236,
              lineHeight: 0.8,
              letterSpacing: "-0.03em",
              color: c.fg,
              fontVariantNumeric: "tabular-nums",
              textShadow: c.shadow || undefined,
            }}
          >
            {stat.value}
          </span>
          {stat.unit ? (
            <span
              style={{
                fontFamily: style.fonts.mono,
                fontSize: 48,
                color: style.accent,
                textShadow: c.shadow || undefined,
              }}
            >
              {stat.unit}
            </span>
          ) : null}
        </div>
        <div style={{ marginTop: 26, width: SPARK_W, height: SPARK_H }}>
          <FrameSpark color={sparkColor} data={data} statKey={stat.key} />
        </div>
      </div>
      <Rule color={c.fg} />
    </div>
  );
}

function FrameSignature({
  data,
  style,
  c,
  showEffort,
}: {
  c: SlideTextColors;
  data: ActivityData;
  showEffort: boolean;
  style: PanelProps["style"];
}) {
  return (
    <div style={{ marginTop: "auto", marginBottom: "auto" }}>
      <Rule color={c.fg} />
      <h1
        style={{
          fontFamily: style.fonts.display,
          fontWeight: style.fonts.displayWeight,
          fontSize: 92,
          lineHeight: 0.95,
          letterSpacing: "-0.02em",
          margin: "44px 0",
          color: c.fg,
          textWrap: "balance",
          textShadow: c.shadow || undefined,
        }}
      >
        {data.title || style.label}
      </h1>
      <Rule color={c.fg} />
      {showEffort || data.athleteName ? (
        <div
          style={{
            marginTop: 28,
            fontFamily: style.fonts.mono,
            fontSize: 20,
            letterSpacing: "0.2em",
            color: c.muted,
            display: "flex",
            justifyContent: "space-between",
            textShadow: c.shadow || undefined,
          }}
        >
          <span>{showEffort ? "MADE WITH EFFORT" : ""}</span>
          {data.athleteName ? (
            <span>{data.athleteName.toUpperCase()}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Shared Frame chrome: location header + slide index, the per-slide body, and
 *  the theme nameplate footer. */
function FrameChrome({
  data,
  style,
  hasPhoto,
  index,
  total,
  showPageNumber,
  children,
}: PanelProps & { children: React.ReactNode }) {
  const c = slideText(style, hasPhoto);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: SLIDE_PAD,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: style.fonts.mono,
          fontSize: 20,
          letterSpacing: "0.24em",
          color: c.muted,
          textShadow: c.shadow || undefined,
        }}
      >
        <span>{data.location ? data.location.toUpperCase() : ""}</span>
        {showPageNumber ? <span>{slideNumber(index, total)}</span> : null}
      </div>

      {children}

      <div
        aria-hidden
        style={{
          fontFamily: style.fonts.mono,
          fontSize: 18,
          letterSpacing: "0.24em",
          color: c.muted,
          textShadow: c.shadow || undefined,
        }}
      >
        {style.label}
      </div>
    </div>
  );
}

/** A Frame datum slide: one curated stat + its sparkline (route / elevation /
 *  speed / power), chosen by slide index from Frame's priority order. A sparse
 *  activity with fewer data than slots leaves the slide blank. */
export function FrameDatumPanel(props: PanelProps) {
  const { data, style, hasPhoto, index, statOpts } = props;
  const c = slideText(style, hasPhoto);
  const stat: StatItem | undefined = frameStats(data, statOpts)[index];
  return (
    <FrameChrome {...props}>
      {stat ? (
        <FrameDatum c={c} data={data} stat={stat} style={style} />
      ) : (
        <div aria-hidden />
      )}
    </FrameChrome>
  );
}

/** The Frame wrap-up slide: title + the "made with effort" mark. */
export function FrameSignaturePanel(props: PanelProps) {
  const { data, style, hasPhoto, showEffort } = props;
  const c = slideText(style, hasPhoto);
  return (
    <FrameChrome {...props}>
      <FrameSignature c={c} data={data} showEffort={showEffort} style={style} />
    </FrameChrome>
  );
}
