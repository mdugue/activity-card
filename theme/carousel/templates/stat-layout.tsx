// Shared scaffold for the stat-led detail slides. The title + stat grid are
// grouped and anchored as one block (low under the route / photo, high above the
// elevation range) so the slide reads balanced instead of cramming numbers at
// the top. The slide derives its own stats (all but the hero metric) from the
// activity — StatRow and StatGrid just choose the grid shape.

import { detailStats } from "@/theme/carousel/stats";
import type { PanelProps } from "../define-theme";
import { DetailViz } from "../detail-viz";
import { Stat } from "../stat-block";
import { MetaBand } from "./parts";
import { SlideScaffold } from "./scaffold";
import { slideText } from "./shared";

interface StatLayoutProps extends PanelProps {
  /** gridTemplateColumns — content-sized columns (e.g. "max-content max-content") */
  columns: string;
  numeralSize: number;
  titleSize: number;
}

export function StatLayout({
  data,
  style,
  hasPhoto,
  index,
  total,
  statOpts,
  showPageNumber,
  columns,
  numeralSize,
  titleSize,
}: StatLayoutProps) {
  const colors = slideText(style, hasPhoto);
  const anchor = style.contentAnchor;
  // Every stat except the one the hero slide headlines (no repeated big number).
  const stats = detailStats(data, style.heroMetric, statOpts);

  const group = (
    <div>
      {/* Themes whose hero isn't the route/elevation (Exposure) show small path
          + altitude graphics here so those dimensions still read. */}
      {style.detailViz ? (
        <div style={{ marginBottom: 40 }}>
          <DetailViz
            color={colors.fg}
            data={data}
            fonts={style.fonts}
            kinds={["route", "elevation"]}
            muted={colors.muted}
            w={300}
          />
        </div>
      ) : null}
      <div
        aria-hidden
        style={{
          width: 64,
          height: 4,
          background: style.accent,
          marginBottom: 18,
        }}
      />
      {data.title ? (
        <h2
          style={{
            fontFamily: style.fonts.display,
            fontWeight: style.fonts.displayWeight,
            fontSize: titleSize,
            lineHeight: 0.98,
            margin: "0 0 44px 0",
            color: colors.fg,
            maxWidth: "88%",
            textWrap: "pretty",
            textShadow: colors.shadow || undefined,
          }}
        >
          {data.title}
        </h2>
      ) : null}

      {/* Content-sized columns packed from the start, so stats sit together
          (not justified to the slide edges) and the block grows upward, row by
          row, as more stats are shown. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns,
          justifyContent: "start",
          gap: "38px 72px",
        }}
      >
        {stats.map((item) => (
          <Stat
            fonts={style.fonts}
            ink={colors.fg}
            item={item}
            key={item.key}
            muted={colors.muted}
            numeralSize={numeralSize}
            shadow={colors.shadow}
          />
        ))}
      </div>
    </div>
  );

  return (
    <SlideScaffold
      anchor={anchor}
      top={
        <MetaBand
          colors={colors}
          data={data}
          fonts={style.fonts}
          index={index}
          showPageNumber={showPageNumber}
          total={total}
        />
      }
    >
      {group}
    </SlideScaffold>
  );
}
