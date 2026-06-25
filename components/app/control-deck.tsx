"use client";

// Focused-toolbar editor chrome, shared by the Single Card and Carousel editors.
//
// One DOM, three layouts — driven purely by CSS so each control group renders
// exactly once (no duplicated inputs/state). The shell is a CSS grid whose three
// children — the preview, the controls panel, and the dock (category tabs +
// export) — are re-placed via `grid-template-areas` per breakpoint/orientation:
//
//   • Mobile portrait — a non-scrolling app-shell that fills the dynamic
//     viewport (no page scroll, which felt flickery). Preview on top (it fills
//     the space and the card scales to fit it), the active group's panel beneath
//     (bounded height, scrolls internally) and the dock pinned at the foot.
//     Opening a group SHRINKS the preview instead of covering it; the carousel
//     rail steps aside to give the card room.
//   • Mobile landscape — the same three regions, but preview and panel sit side
//     by side with the dock spanning the foot, so a short viewport keeps both
//     the card and a tall group usable.
//   • Desktop (lg+) — a sticky preview on the left; every group plus the export
//     button stacked in the right column. There's room for everything, so the
//     tabs hide and the page scrolls normally.
//
// Open/close is a real `open` state (separate from the active group, which is
// kept so its content can animate while collapsing). The panel itself carries a
// pure-CSS transition: portrait animates `max-height`, landscape `max-width`,
// both plus opacity. The preview is grid `1fr`, so it reflows — growing/
// shrinking in lockstep — as the panel animates, no JS per frame. Honoured under
// `prefers-reduced-motion`. The preview can never disappear: the panel is height-
// capped (portrait) or fixed-width (landscape) and scrolls inside its own bounds.

import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface ControlTool {
  content: React.ReactNode;
  /** duotone Phosphor icon element */
  icon: React.ReactNode;
  /** stable id; also exposed as the `tool-<id>` test hook on the mobile tab */
  id: string;
  /** tab label (the content carries its own section header) */
  label: string;
}

export interface ControlDeckAction {
  icon: React.ReactNode;
  isBusy: boolean;
  /** desktop label, e.g. "Download PNG" / "Export carousel" */
  label: string;
  /** desktop sub-label, e.g. "1080 × 1350" */
  meta: string;
  onAction: () => void;
}

interface ControlDeckProps {
  action: ControlDeckAction;
  /** off-screen export mounts and any other siblings */
  children?: React.ReactNode;
  preview: React.ReactNode;
  /** a preview-level control pinned beside the action (e.g. the format picker) —
   *  distinct from the scrolling settings tabs and the action itself */
  previewControl?: React.ReactNode;
  tools: ControlTool[];
}

// Shared open/close transition (a gentle, settling curve) — exported so the
// carousel rail's collapse animates in lockstep from one source of truth.
// `visibility` is in the list so the panel/rail flip to inert (not focusable or
// clickable) only AFTER they finish collapsing; visible again immediately on
// open. Disabled under reduced motion via `motion-reduce:transition-none`.
export const PANEL_MOTION =
  "max-lg:transition-[max-height,max-width,opacity,visibility] max-lg:duration-300 max-lg:ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none";

export function ControlDeck({
  tools,
  preview,
  previewControl,
  action,
  children,
}: ControlDeckProps) {
  // Lead with the first tool (THEME) open, so the theme rail is on screen the
  // moment the editor mounts. `active` is kept even while closed so its content
  // is still mounted to animate the collapse; `open` drives the size.
  const [active, setActive] = useState<string | null>(tools[0]?.id ?? null);
  const [open, setOpen] = useState(true);
  const panelRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Drive the portrait panel's height from its content's natural height via a
  // CSS variable, so the size *animates* on open/close AND when switching groups
  // (the var feeds a `max-height` transition). A ResizeObserver keeps it in sync
  // as the active group — or its data — changes. Pure CSS can't transition
  // between two intrinsic heights cross-browser (`interpolate-size` is
  // Chrome-only), so this measured var is the clean, Safari-safe path. Measured
  // before paint, so the panel opens at the right height with no mount jump.
  useLayoutEffect(() => {
    const content = contentRef.current;
    const panel = panelRef.current;
    if (!(content && panel)) {
      return;
    }
    const setVar = (h: number) =>
      panel.style.setProperty("--panel-content-h", `${h}px`);
    setVar(content.offsetHeight); // initial measure, before first paint
    const ro = new ResizeObserver(([entry]) => {
      // Use the box the observer already computed (off the main thread) rather
      // than reading offsetHeight again, which would force a synchronous reflow.
      const box = entry.borderBoxSize?.[0];
      setVar(box ? box.blockSize : content.offsetHeight);
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  // Tapping the active tab deselects it (value === null) → collapse. Tapping any
  // other tab selects that group and expands. Closing keeps `active` so the
  // panel still has content to animate down.
  const handleTab = (next: string | null) => {
    if (next === null) {
      setOpen(false);
      return;
    }
    setActive(next);
    setOpen(true);
  };

  return (
    // `group/deck` + `data-open` let the preview's carousel rail collapse itself
    // while a panel is open on mobile (see the rail wrapper in the carousel
    // editor) without threading the open state back through props.
    <div
      className={cn(
        "group/deck relative mx-auto grid w-full max-w-[1180px] flex-1",
        // Mobile app-shell: fill the bounded height; panels scroll, not the page.
        // `min-h-0` is mobile-only — on desktop the shell must grow with its
        // content so the (taller-than-viewport) control column drives page
        // scroll instead of being clipped by the root's overflow-hidden. No side
        // padding here: the panel + dock run full-bleed, the preview pads itself.
        "max-lg:min-h-0 max-lg:pt-2",
        // Portrait — preview / panel / dock stacked.
        "max-lg:portrait:grid-cols-1 max-lg:portrait:grid-rows-[minmax(0,1fr)_auto_auto] max-lg:portrait:[grid-template-areas:'preview'_'panel'_'dock']",
        // Landscape — preview | panel up top, dock spanning the foot.
        "max-lg:landscape:grid-cols-[minmax(0,1fr)_auto] max-lg:landscape:grid-rows-[minmax(0,1fr)_auto] max-lg:landscape:[grid-template-areas:'preview_panel'_'dock_dock']",
        // Desktop — sticky preview + a right column of every group then export.
        "lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-x-12 lg:gap-y-6 lg:px-10 lg:pt-6 lg:pb-8 lg:[grid-template-areas:'preview_panel'_'preview_dock']"
      )}
      data-open={open || undefined}
    >
      {/* PREVIEW — the hero. Fills its area on mobile (a flex column so the
          carousel can add its rail below the card; padded so the card clears the
          full-bleed panel edges); sticky on desktop. `z-10` keeps it — and the
          card's drop shadow — painting ABOVE the panel, so the shadow falls onto
          the toolbar instead of being clipped under it during the animation. */}
      <div className="min-w-0 [grid-area:preview] max-lg:relative max-lg:z-10 max-lg:flex max-lg:min-h-0 max-lg:flex-col max-lg:px-4 lg:sticky lg:top-6 lg:block lg:self-start">
        {preview}
      </div>

      {/* PANEL — the active group on mobile; every group on desktop. A full-bleed
          surface that collapses (height in portrait, width in landscape) when
          closed, scrolling internally when its content overflows. */}
      <section
        aria-label="Card controls"
        className={cn(
          "min-h-0 [grid-area:panel]",
          "max-lg:overflow-x-hidden max-lg:border-foreground/12 max-lg:bg-popover",
          PANEL_MOTION,
          // Portrait — height tracks the content (capped), so it animates on both
          // open/close and group switches.
          open
            ? "max-lg:visible max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:opacity-100 max-lg:portrait:max-h-[min(var(--panel-content-h,42dvh),42dvh)] max-lg:portrait:border-t"
            : "max-lg:invisible max-lg:overflow-y-hidden max-lg:opacity-0 max-lg:portrait:max-h-0",
          // Landscape — a fixed-width column beside the card, full height.
          "max-lg:landscape:h-full",
          open
            ? "max-lg:landscape:max-w-[min(46vw,360px)] max-lg:landscape:border-l"
            : "max-lg:landscape:max-w-0",
          // Desktop — every group, no surface, no animation.
          "lg:block lg:max-h-none lg:max-w-none lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:opacity-100"
        )}
        ref={panelRef}
      >
        {/* Inner wrapper carries the padding and is what the ResizeObserver
            measures — its height is the active group's natural height (the panel
            itself is clamped, so measuring it would feed back during the
            transition). */}
        <div className="max-lg:px-5 max-lg:py-4" ref={contentRef}>
          {tools.map((tool, i) => (
            <div
              className={cn(
                active === tool.id ? "max-lg:block" : "max-lg:hidden",
                "lg:block",
                i > 0 && "lg:mt-7"
              )}
              key={tool.id}
            >
              {tool.content}
            </div>
          ))}
        </div>
      </section>

      {/* DOCK — category tabs (mobile) + the export action (both). Full-bleed,
          pinned at the foot; tabs hide on desktop where the panel shows
          everything at once. On desktop it sticks to the bottom of the right
          column so the format picker + Export stay in reach while the (often
          taller-than-viewport) controls scroll behind it — the bottom mirror of
          the preview's `lg:sticky lg:top-6`. `bg-background` masks the scrolled
          controls; `border-t` separates it from them. */}
      <div
        className={cn(
          "flex items-stretch gap-2 [grid-area:dock]",
          "max-lg:border-foreground/12 max-lg:border-t max-lg:bg-popover max-lg:p-2 max-lg:pb-[max(0.5rem,env(safe-area-inset-bottom))]",
          // Desktop: span the full right column (both grid rows) and sit at its
          // foot via `self-end`, so the sticky box has the whole column as its
          // containing block to range over — a one-row cell gives sticky no room.
          // Then pin to the viewport bottom; `bg-background` masks the controls
          // scrolling behind it, `border-t` divides it from them.
          "lg:sticky lg:bottom-0 lg:z-20 lg:gap-2 lg:self-end lg:border-foreground/10 lg:border-t lg:bg-background lg:px-0 lg:pt-4 lg:pb-4 lg:[grid-area:1/2/-1/-1]"
        )}
      >
        <ToggleGroup
          aria-label="Edit categories"
          className="no-scrollbar flex w-auto min-w-0 flex-1 items-stretch gap-1 overflow-x-auto lg:hidden"
          onValueChange={(vals) => handleTab(vals[0] ?? null)}
          spacing={1}
          value={open && active ? [active] : []}
        >
          {tools.map((tool) => (
            <ToggleGroupItem
              aria-label={tool.label}
              className={cn(
                "h-auto w-14 shrink-0 flex-col gap-1 rounded-md border-0 bg-transparent px-1 py-2 text-foreground/55 hover:bg-foreground/5",
                "aria-pressed:!bg-primary aria-pressed:!text-primary-foreground data-[pressed]:!bg-primary data-[pressed]:!text-primary-foreground"
              )}
              data-testid={`tool-${tool.id}`}
              key={tool.id}
              value={tool.id}
            >
              {tool.icon}
              <span className="font-mono font-semibold text-[9px] uppercase tracking-wide">
                {tool.label}
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Preview-level control (e.g. the format picker) — pinned beside the
            action, never part of the scrolling settings tabs. */}
        {previewControl}

        <Button
          className="h-auto w-14 shrink-0 flex-col gap-1 rounded-md px-1 py-2 lg:w-auto lg:flex-1 lg:flex-row lg:justify-between lg:px-8 lg:py-4"
          data-testid="export-action"
          disabled={action.isBusy}
          onClick={action.onAction}
          size="lg"
        >
          <span className="flex flex-col items-center gap-1 lg:flex-row lg:gap-2.5">
            {action.icon}
            <span className="font-mono text-[8.5px] tracking-wide lg:hidden">
              EXPORT
            </span>
            <span className="hidden font-heading text-lg lg:inline">
              {action.isBusy ? "Rendering…" : action.label}
            </span>
          </span>
          <span className="hidden font-medium font-mono text-[10px] tracking-[0.18em] opacity-75 lg:inline">
            {action.meta}
          </span>
        </Button>
      </div>

      {children}
    </div>
  );
}
