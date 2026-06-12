import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { cn } from "@/lib/utils";
import { FONT_VARS } from "../design/fonts";
import { INK, PAPER } from "../design/tokens";

/**
 * The shared composition template — every Effort video mounts inside it. It
 * pins the brand stage (warm ink under warm paper type), re-creates the app's
 * `--font-*` variables outside Next (FONT_VARS) and gives scenes one place to
 * inherit the base look from, so all videos share one canvas by construction.
 */
export function VideoFrame({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <AbsoluteFill
      className={cn("font-sans", className)}
      style={{ backgroundColor: INK, color: PAPER, ...FONT_VARS, ...style }}
    >
      {children}
    </AbsoluteFill>
  );
}
