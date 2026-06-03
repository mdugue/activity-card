// Shared scaffold for the stat-led slides: MetaBand + title + a centred grid of
// Stat blocks + SlideFooter. StatRow (1×3) and StatGrid (2×2) are the same
// layout with a different grid shape and type sizes, so they're thin wrappers
// over this — keeping the title/footer/grid scaffold in one place.

import { buildStats } from "@/lib/carousel/stats";
import { Stat } from "../stat-block";
import { MetaBand, SlideFooter } from "./parts";
import { SLIDE_PAD, slideText, type TemplateProps } from "./shared";

interface StatLayoutProps extends TemplateProps {
  /** gridTemplateColumns */
  columns: string;
  /** how many stats to show */
  count: number;
  /** extra top margin on the grid (statGrid breathes a little more) */
  gridMarginTop?: number;
  numeralSize: number;
  /** gridTemplateRows, when the grid needs explicit rows */
  rows?: string;
  titleMargin: string;
  titleSize: number;
}

export function StatLayout({
  data,
  style,
  hasPhoto,
  index,
  total,
  count,
  columns,
  rows,
  numeralSize,
  titleSize,
  titleMargin,
  gridMarginTop,
}: StatLayoutProps) {
  const colors = slideText(style, hasPhoto);
  const stats = buildStats(data).slice(0, count);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: SLIDE_PAD,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <MetaBand
        colors={colors}
        data={data}
        fonts={style.fonts}
        index={index}
        total={total}
      />

      <h2
        style={{
          fontFamily: style.fonts.display,
          fontSize: titleSize,
          lineHeight: 0.98,
          margin: titleMargin,
          color: colors.fg,
          maxWidth: "85%",
          textWrap: "pretty",
        }}
      >
        {data.title}
      </h2>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: columns,
          gridTemplateRows: rows,
          gap: 28,
          alignContent: "center",
          marginTop: gridMarginTop,
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
          />
        ))}
      </div>

      <SlideFooter
        accent={style.accent}
        colors={colors}
        data={data}
        fonts={style.fonts}
      />
    </div>
  );
}
