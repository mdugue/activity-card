// Frame — ultra-minimal. One big datum per slide between hairline rules, paired
// with a sparkline for that metric (route · elevation · speed · power), vast
// negative space. Supports a background photo while staying clean: no gradients,
// just text-shadow. The last slide is the signature.

import type { ActivityData } from "@/components/app/sample-data";
import {
  elevationSeries,
  paceSeries,
  powerSeries,
  routeSeries,
  type StatItem,
  speedSeries,
} from "@/lib/carousel/stats";
import { ElevationBand } from "../elevation-band";
import { RouteLine } from "../route-line";
import {
  SLIDE_PAD,
  type SlideTextColors,
  slideNumber,
  slideText,
  type TemplateProps,
} from "../templates/shared";

const SPARK_W = 900;
const SPARK_H = 132;

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
    const coords = routeSeries(data);
    return coords ? (
      <RouteLine
        accent={color}
        accent2={color}
        coords={coords}
        h={SPARK_H}
        ink={color}
        pad={10}
        showMarkers={false}
        strokeWidth={4}
        style="poster"
        w={SPARK_W}
      />
    ) : null;
  }

  let series: number[] | undefined;
  let mode: "elevation" | "pace" = "elevation";
  if (statKey === "elevation") {
    series = elevationSeries(data);
  } else if (statKey === "avgSpeed" || statKey === "maxSpeed") {
    series = speedSeries(data);
  } else if (statKey === "power") {
    series = powerSeries(data);
  } else if (statKey === "pace") {
    series = paceSeries(data);
    mode = "pace";
  }
  if (!series) {
    return null;
  }
  return (
    <ElevationBand
      colors={{ line: color, fillFrom: color, fillTo: "transparent" }}
      h={SPARK_H}
      mode={mode}
      profile={series}
      w={SPARK_W}
    />
  );
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
  style: TemplateProps["style"];
}) {
  const sparkColor = c.shadow && style.dark ? "#ffffff" : style.accent2;
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
                color: style.accent2,
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
  style: TemplateProps["style"];
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

export function FramePanel({
  data,
  style,
  hasPhoto,
  index,
  total,
  stats,
  showEffort,
  showPageNumber,
}: TemplateProps) {
  const c = slideText(style, hasPhoto);
  const isLast = index === total - 1;
  const stat: StatItem | undefined = stats[0];

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

      {isLast || !stat ? (
        <FrameSignature
          c={c}
          data={data}
          showEffort={showEffort}
          style={style}
        />
      ) : (
        <FrameDatum c={c} data={data} stat={stat} style={style} />
      )}

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
