"use client";

// Focused-toolbar editor chrome, shared by the Single Card and Carousel editors.
//
// One abstraction, two layouts — mobile first:
//   • Mobile — a bottom sheet. A row of category tabs sits at the foot; tapping
//     one expands the sheet to show ONLY that group's controls above the tabs
//     (tap the tab again, or the backdrop, to collapse). Export is the detached
//     button beside the tabs.
//   • Desktop — the SAME groups laid out horizontally: a sticky preview on the
//     left, every group visible at once in the right column, export at the foot.
//     There's room to show everything, so the tabs hide.
//
// Both layouts render each group exactly once (no duplicated inputs/state),
// driven by the same `tools` array. `active` only governs the mobile sheet —
// desktop is always fully open.

import { useState } from "react";
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
  tools: ControlTool[];
}

export function ControlDeck({
  tools,
  preview,
  action,
  children,
}: ControlDeckProps) {
  // Open the first tool (THEME) by default so the mobile sheet — and the theme
  // rail it leads with — is on screen the moment the editor mounts.
  const [active, setActive] = useState<string | null>(tools[0]?.id ?? null);
  const open = active !== null && tools.some((t) => t.id === active);

  return (
    <div className="relative mx-auto w-full max-w-[1180px] flex-1 px-6 pt-6 pb-8 md:px-10">
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-12">
        {/* PREVIEW — the hero. Sticky on desktop so it never leaves while the
            controls scroll; padded on mobile so the sheet never covers the card. */}
        <div className="flex min-w-0 flex-col gap-5 pb-24 lg:sticky lg:top-6 lg:self-start lg:pb-0">
          {preview}
        </div>

        {/* CONTROLS — a sidebar column on desktop; a bottom sheet (+ backdrop)
            on mobile. The wrapper groups both into one grid cell. */}
        <div>
          {/* Backdrop — mobile only, shown while a tab is open. Tap to collapse. */}
          {open ? (
            <button
              aria-label="Close controls"
              className="fixed inset-0 z-20 bg-foreground/20 lg:hidden"
              onClick={() => setActive(null)}
              type="button"
            />
          ) : null}

          {/* The sheet: panel (top) + tab bar (bottom) as one surface on mobile;
              a plain column on desktop. */}
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 z-30 flex flex-col border-foreground/12 border-t bg-popover/95 shadow-[0_-8px_30px_rgba(26,23,20,0.12)] backdrop-blur supports-[backdrop-filter]:bg-popover/85",
              "lg:static lg:z-auto lg:gap-6 lg:border-0 lg:bg-transparent lg:shadow-none lg:backdrop-blur-none"
            )}
          >
            {/* Panel — the active tool on mobile (when open); every tool on
                desktop. */}
            <section
              aria-label="Card controls"
              className={cn(
                "max-h-[50vh] overflow-y-auto px-5 pt-4 pb-3",
                open ? "block border-foreground/10 border-b" : "hidden",
                "lg:block lg:max-h-none lg:overflow-visible lg:border-0 lg:p-0"
              )}
            >
              {tools.map((tool, i) => (
                <div
                  className={cn(
                    active === tool.id ? "block" : "hidden",
                    "lg:block",
                    i > 0 && "lg:mt-7"
                  )}
                  key={tool.id}
                >
                  {tool.content}
                </div>
              ))}
            </section>

            {/* Tab bar (mobile) + export action (both). */}
            <div className="flex items-stretch gap-2 p-2 lg:mt-2 lg:gap-0 lg:p-0">
              <ToggleGroup
                aria-label="Edit categories"
                className="no-scrollbar flex w-auto min-w-0 flex-1 items-stretch gap-1 overflow-x-auto lg:hidden"
                onValueChange={(vals) => setActive(vals[0] ?? null)}
                spacing={1}
                value={active ? [active] : []}
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

              <Button
                className="h-auto w-14 shrink-0 flex-col gap-1 rounded-md px-1 py-2 lg:w-full lg:flex-row lg:justify-between lg:px-8 lg:py-4"
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
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
