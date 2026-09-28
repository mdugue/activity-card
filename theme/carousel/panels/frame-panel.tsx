// Frame — ultra-minimal. One big datum per slide between hairline rules, paired
// with a sparkline for that metric (route · elevation · speed · power), vast
// negative space. Supports a background photo while staying clean: no gradients,
// just text-shadow. The last slide is the signature.

import type { ActivityData } from "@/lib/activity";
import {
  isMultiActivity,
  segmentRoutes,
  segmentSeries,
} from "@/lib/multi-activity";
import {
  elevationSeries,
  frameStats,
  paceSeries,
  powerSeries,
  routeSeries,
  speedSeries,
} from "@/theme/carousel/stats";
import type { StatItem } from "@/theme/carousel/stats";
import { SafeArea } from "@/theme/shared/format-context";

import type { PanelProps } from "../define-theme";
import { ElevationBand } from "../elevation-band";
import { CAROUSEL_NATURAL_PAD } from "../geometry";
import { RouteLine } from "../route-line";
import { slideNumber, slideText } from "../templates/shared";
import type { SlideTextColors } from "../templates/shared";

const SPARK_W = 900;
const SPARK_H = 132;
const SPACE_BETWEEN = "space-between";

const bandColors = (color: string) => ({
  fillFrom: color,
  fillTo: "transparent",
  line: color,
});

/** Route silhouette spark — every leg for a project, the single route otherwise. */
const FrameRouteSpark = ({
  data,
  color,
}: {
  color: string;
  data: ActivityData;
}) => {
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
      routeStyle="poster"
      w={SPARK_W}
    />
  );
};

/** Pick the single-activity series for a non-route datum. */
const frameSeries = (
  data: ActivityData,
  statKey: string
): number[] | undefined => {
  if (statKey === "elevation") {
    return elevationSeries(data);
  }
  if (statKey === "avgSpeed" || statKey === "maxSpeed") {
    return speedSeries(data);
  }
  if (statKey === "power") {
    return powerSeries(data);
  }
  return statKey === "pace" ? paceSeries(data) : undefined;
};

/** Band spark (elevation / pace / speed / power) — legs side by side for a project. */
const FrameBandSpark = ({
  data,
  color,
  statKey,
}: {
  color: string;
  data: ActivityData;
  statKey: string;
}) => {
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
};

/** The matching sparkline for a Frame datum, or null when the metric has no
 *  series. Route renders as the silhouette; everything else as a band. */
const FrameSpark = ({
  statKey,
  data,
  color,
}: {
  color: string;
  data: ActivityData;
  statKey: string;
}) => {
  if (statKey === "distance") {
    return <FrameRouteSpark color={color} data={data} />;
  }
  return <FrameBandSpark color={color} data={data} statKey={statKey} />;
};

const Rule = ({ color }: { color: string }) => (
  <div
    aria-hidden
    style={{ background: color, height: 1, opacity: 0.22, width: "100%" }}
  />
);

const FrameDatum = ({
  data,
  style,
  c,
  stat,
}: {
  c: SlideTextColors;
  data: ActivityData;
  stat: StatItem;
  style: PanelProps["style"];
}) => {
  const sparkColor = c.shadow && style.dark ? "#ffffff" : style.accent;
  return (
    <div style={{ marginBottom: "auto", marginTop: "auto" }}>
      <Rule color={c.fg} />
      <div style={{ padding: "54px 0 44px" }}>
        <div
          style={{
            color: c.muted,
            fontFamily: style.fonts.mono,
            fontSize: 24,
            letterSpacing: "0.24em",
            textShadow: c.shadow || undefined,
          }}
        >
          {stat.label}
        </div>
        <div
          style={{
            alignItems: "baseline",
            display: "flex",
            gap: 18,
            marginTop: 16,
          }}
        >
          <span
            style={{
              color: c.fg,
              fontFamily: style.fonts.numeral,
              fontSize: 236,
              fontVariantNumeric: "tabular-nums",
              fontWeight: style.fonts.numeralWeight,
              letterSpacing: "-0.03em",
              lineHeight: 0.8,
              textShadow: c.shadow || undefined,
            }}
          >
            {stat.value}
          </span>
          {stat.unit ? (
            <span
              style={{
                color: style.accent,
                fontFamily: style.fonts.mono,
                fontSize: 48,
                textShadow: c.shadow || undefined,
              }}
            >
              {stat.unit}
            </span>
          ) : null}
        </div>
        <div style={{ height: SPARK_H, marginTop: 26, width: SPARK_W }}>
          <FrameSpark color={sparkColor} data={data} statKey={stat.key} />
        </div>
      </div>
      <Rule color={c.fg} />
    </div>
  );
};

const FrameSignature = ({
  data,
  style,
  c,
  showEffort,
}: {
  c: SlideTextColors;
  data: ActivityData;
  showEffort: boolean;
  style: PanelProps["style"];
}) => (
  <div style={{ marginBottom: "auto", marginTop: "auto" }}>
    <Rule color={c.fg} />
    <h1
      style={{
        color: c.fg,
        fontFamily: style.fonts.display,
        fontSize: 92,
        fontWeight: style.fonts.displayWeight,
        letterSpacing: "-0.02em",
        lineHeight: 0.95,
        margin: "44px 0",
        textShadow: c.shadow || undefined,
        textWrap: "balance",
      }}
    >
      {data.title || style.label}
    </h1>
    <Rule color={c.fg} />
    {showEffort || data.athleteName ? (
      <div
        style={{
          color: c.muted,
          display: "flex",
          fontFamily: style.fonts.mono,
          fontSize: 20,
          justifyContent: SPACE_BETWEEN,
          letterSpacing: "0.2em",
          marginTop: 28,
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

/** Shared Frame chrome: location header + slide index, the per-slide body, and
 *  the theme nameplate footer. */
const FrameChrome = ({
  data,
  style,
  hasPhoto,
  index,
  total,
  showPageNumber,
  children,
}: PanelProps & { children: React.ReactNode }) => {
  const c = slideText(style, hasPhoto);
  return (
    <SafeArea
      pad={CAROUSEL_NATURAL_PAD}
      style={{ justifyContent: SPACE_BETWEEN }}
    >
      <div
        style={{
          color: c.muted,
          display: "flex",
          fontFamily: style.fonts.mono,
          fontSize: 20,
          justifyContent: SPACE_BETWEEN,
          letterSpacing: "0.24em",
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
          color: c.muted,
          fontFamily: style.fonts.mono,
          fontSize: 18,
          letterSpacing: "0.24em",
          textShadow: c.shadow || undefined,
        }}
      >
        {style.label}
      </div>
    </SafeArea>
  );
};

/** A Frame datum slide: one curated stat + its sparkline (route / elevation /
 *  speed / power), chosen by slide index from Frame's priority order. A sparse
 *  activity with fewer data than slots leaves the slide blank. */
export const FrameDatumPanel = (props: PanelProps) => {
  const { data, style, hasPhoto, index, statOpts } = props;
  const c = slideText(style, hasPhoto);
  const stat = frameStats(data, statOpts).at(index);
  return (
    <FrameChrome {...props}>
      {stat === undefined ? (
        <div aria-hidden />
      ) : (
        <FrameDatum c={c} data={data} stat={stat} style={style} />
      )}
    </FrameChrome>
  );
};

/** The Frame wrap-up slide: title + the "made with effort" mark. */
export const FrameSignaturePanel = (props: PanelProps) => {
  const { data, style, hasPhoto, showEffort } = props;
  const c = slideText(style, hasPhoto);
  return (
    <FrameChrome {...props}>
      <FrameSignature c={c} data={data} showEffort={showEffort} style={style} />
    </FrameChrome>
  );
};
