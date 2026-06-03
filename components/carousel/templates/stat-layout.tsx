// Shared scaffold for the stat-led detail slides. The title + stat grid are
// grouped and anchored as one block (low under the route / photo, high above the
// elevation range) so the slide reads balanced instead of cramming numbers at
// the top. Stats are pre-assigned per slide by the deck planner, so StatRow and
// StatGrid just lay out whatever they're handed.

import { Stat } from "../stat-block";
import { MetaBand } from "./parts";
import {
  contentAnchor,
  SLIDE_PAD,
  slideText,
  type TemplateProps,
} from "./shared";

interface StatLayoutProps extends TemplateProps {
  /** gridTemplateColumns */
  columns: string;
  numeralSize: number;
  /** gridTemplateRows, when the grid needs explicit rows */
  rows?: string;
  titleSize: number;
}

export function StatLayout({
  data,
  style,
  hasPhoto,
  index,
  total,
  stats,
  showPageNumber,
  columns,
  rows,
  numeralSize,
  titleSize,
}: StatLayoutProps) {
  const colors = slideText(style, hasPhoto);
  const anchor = contentAnchor(style);

  const group = (
    <div>
      <div
        aria-hidden
        style={{
          width: 64,
          height: 4,
          background: style.accent,
          marginBottom: 18,
        }}
      />
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns,
          gridTemplateRows: rows,
          gap: "44px 28px",
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
        showPageNumber={showPageNumber}
        total={total}
      />
      {anchor === "bottom" ? <div style={{ flex: 1 }} /> : null}
      {group}
      {anchor === "top" ? <div style={{ flex: 1 }} /> : null}
    </div>
  );
}
