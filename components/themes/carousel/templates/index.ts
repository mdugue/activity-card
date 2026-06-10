// Template registry + dispatcher. Maps a SlideTemplate id to its renderer and
// carries the picker metadata (label + one-line description). The route
// silhouette spans the whole strip globally (see seamless-canvas), so templates
// are type/stats layouts only.

import type { SlideTemplate } from "@/lib/carousel/types";
import { EditorialSlide } from "./editorial";
import { HeroSlide } from "./hero";
import type { PanelProps } from "./shared";
import { StatGridSlide } from "./stat-grid";
import { StatRowSlide } from "./stat-row";

export const TEMPLATES: Record<
  SlideTemplate,
  (props: PanelProps) => React.JSX.Element
> = {
  hero: HeroSlide,
  statRow: StatRowSlide,
  statGrid: StatGridSlide,
  editorial: EditorialSlide,
};

export interface TemplateMeta {
  description: string;
  id: SlideTemplate;
  label: string;
}

export const TEMPLATE_META: Record<SlideTemplate, TemplateMeta> = {
  hero: { id: "hero", label: "Hero", description: "one huge stat" },
  statRow: { id: "statRow", label: "Stat Row", description: "1×3 line" },
  statGrid: { id: "statGrid", label: "Stat Grid", description: "2×2 metrics" },
  editorial: { id: "editorial", label: "Editorial", description: "signature" },
};
