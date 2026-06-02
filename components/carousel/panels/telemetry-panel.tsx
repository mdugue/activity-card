// Telemetry — dense instrument panel. Bordered metric grid, HR/power zone bars,
// monospace everywhere, technical micro-graphic. Each slide focuses a different
// readout so the deck doesn't just repeat one dashboard.

import type { Zone } from "@/components/app/sample-data";
import { buildStats, type StatItem } from "@/lib/carousel/stats";
import { formatClock } from "@/lib/format";
import { MicroGraphicLayer } from "../micro-graphic-layer";
import {
  SLIDE_PAD,
  slideNumber,
  slideText,
  sportWord,
  type TemplateProps,
} from "../templates/shared";

function Header({
  data,
  style,
  colorMuted,
  index,
  total,
}: TemplateProps & { colorMuted: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontFamily: style.fonts.mono,
        fontSize: 19,
        letterSpacing: "0.2em",
        color: colorMuted,
        borderBottom: `1px solid ${colorMuted}`,
        paddingBottom: 14,
      }}
    >
      <span style={{ color: style.accent }}>TELEMETRY</span>
      <span>
        {sportWord(data.sport)} · {slideNumber(index, total)}
      </span>
    </div>
  );
}

function MetricGrid({
  cells,
  style,
  ink,
  muted,
}: {
  cells: StatItem[];
  ink: string;
  muted: string;
  style: TemplateProps["style"];
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        borderTop: `1px solid ${muted}`,
        borderLeft: `1px solid ${muted}`,
      }}
    >
      {cells.map((cell) => (
        <div
          key={cell.key}
          style={{
            borderRight: `1px solid ${muted}`,
            borderBottom: `1px solid ${muted}`,
            padding: "20px 22px",
          }}
        >
          <div
            style={{
              fontFamily: style.fonts.mono,
              fontSize: 17,
              letterSpacing: "0.14em",
              color: muted,
            }}
          >
            {cell.label}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              marginTop: 8,
            }}
          >
            <span
              style={{
                fontFamily: style.fonts.numeral,
                fontSize: 76,
                lineHeight: 0.85,
                color: ink,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {cell.value}
            </span>
            <span
              style={{
                fontFamily: style.fonts.mono,
                fontSize: 20,
                color: muted,
              }}
            >
              {cell.unit}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ZoneBars({
  title,
  zones,
  style,
  ink,
  muted,
}: {
  ink: string;
  muted: string;
  style: TemplateProps["style"];
  title: string;
  zones: Zone[];
}) {
  return (
    <div style={{ marginTop: 30 }}>
      <div
        style={{
          fontFamily: style.fonts.mono,
          fontSize: 18,
          letterSpacing: "0.2em",
          color: muted,
          marginBottom: 16,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {zones.map((z, i) => (
          <div
            key={z.zone}
            style={{ display: "flex", alignItems: "center", gap: 14 }}
          >
            <span
              style={{
                fontFamily: style.fonts.mono,
                fontSize: 20,
                color: ink,
                width: 44,
              }}
            >
              {z.zone}
            </span>
            <div style={{ flex: 1, height: 22, background: muted }}>
              <div
                style={{
                  width: `${z.pct}%`,
                  height: "100%",
                  background: i % 2 === 0 ? style.accent : style.accent2,
                }}
              />
            </div>
            <span
              style={{
                fontFamily: style.fonts.numeral,
                fontSize: 30,
                color: ink,
                width: 70,
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {z.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TelemetryPanel(props: TemplateProps) {
  const { data, style, hasPhoto, index, total } = props;
  const c = slideText(style, hasPhoto);
  const cells = buildStats(data);
  const zones = data.powerZones ?? data.hrZones;
  const lastIndex = total - 1;
  const hasZones = (zones?.length ?? 0) > 0;
  const isLast = index === lastIndex;
  // The zone page (when zones exist) sits at slide 1.
  const isZonePage = !isLast && index === 1 && hasZones;

  const body = () => {
    if (isLast) {
      return (
        <div style={{ marginTop: "auto" }}>
          <div
            style={{
              fontFamily: style.fonts.mono,
              fontSize: 20,
              letterSpacing: "0.2em",
              color: c.muted,
            }}
          >
            SESSION COMPLETE
          </div>
          <h1
            style={{
              fontFamily: style.fonts.display,
              fontSize: 72,
              lineHeight: 0.95,
              margin: "16px 0 28px",
              color: c.fg,
            }}
          >
            {data.title}
          </h1>
          <MetricGrid
            cells={cells.slice(0, 2)}
            ink={c.fg}
            muted={c.muted}
            style={style}
          />
          {data.athleteName ? (
            <div
              style={{
                marginTop: 26,
                fontFamily: style.fonts.mono,
                fontSize: 20,
                letterSpacing: "0.2em",
                color: style.accent,
              }}
            >
              — {data.athleteName.toUpperCase()}
            </div>
          ) : null}
        </div>
      );
    }
    if (isZonePage && zones) {
      return (
        <>
          <ZoneBars
            ink={c.fg}
            muted={c.muted}
            style={style}
            title={data.powerZones ? "POWER ZONES · %" : "HEART-RATE ZONES · %"}
            zones={zones}
          />
          <MetricGrid
            cells={cells.slice(0, 2)}
            ink={c.fg}
            muted={c.muted}
            style={style}
          />
        </>
      );
    }
    // Metric slides page through the full stat set, distributed evenly across
    // the metric slots (the zone page and the final summary slide don't count),
    // so no two slides repeat the same cells and every stat is shown once.
    const metricSlots = Math.max(1, lastIndex - (hasZones ? 1 : 0));
    const ord = hasZones && index > 1 ? index - 1 : index;
    const from = Math.floor((ord * cells.length) / metricSlots);
    const to = Math.floor(((ord + 1) * cells.length) / metricSlots);
    return (
      <MetricGrid
        cells={cells.slice(from, to)}
        ink={c.fg}
        muted={c.muted}
        style={style}
      />
    );
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: SLIDE_PAD,
        display: "flex",
        flexDirection: "column",
        gap: 26,
      }}
    >
      <Header {...props} colorMuted={c.muted} />
      {body()}
      {index === 0 ? (
        <div
          style={{
            marginTop: "auto",
            fontFamily: style.fonts.mono,
            fontSize: 18,
            letterSpacing: "0.16em",
            color: c.muted,
          }}
        >
          {data.location ? data.location.toUpperCase() : ""}
          {data.durationSec
            ? ` · ELAPSED ${formatClock(data.durationSec)}`
            : ""}
        </div>
      ) : null}

      {style.microGraphic ? (
        <MicroGraphicLayer
          color={c.fg}
          corner="br"
          data={data}
          fonts={style.fonts}
        />
      ) : null}
    </div>
  );
}
