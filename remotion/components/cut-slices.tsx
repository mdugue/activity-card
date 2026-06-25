import type {
  TransitionPresentation,
  TransitionPresentationComponentProps,
} from "@remotion/transitions";
import { AbsoluteFill } from "remotion";
import { EASE_CUT, PAPER } from "../design/tokens";

export interface CutSlicesProps extends Record<string, unknown> {
  /** number of vertical slices (the landing intro cuts into 3) */
  slices?: number;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * The brand's guillotine cut as a scene transition: the entering scene is
 * revealed top-down in staggered vertical slices — one clip-path "skyline"
 * polygon, so the scene renders once. Seam hairlines flash mid-cut, echoing
 * the landing intro's gutter bars.
 */
function SlicePresentation({
  children,
  passedProps,
  presentationDirection,
  presentationProgress,
}: TransitionPresentationComponentProps<CutSlicesProps>) {
  if (presentationDirection === "exiting") {
    return <AbsoluteFill>{children}</AbsoluteFill>;
  }

  const slices = passedProps.slices ?? 4;
  // Column i starts its drop a beat after column i-1 (the intro's 0.18s
  // stagger, expressed as a fraction of the transition).
  const stagger = 0.16;
  const overdrive = 1 + (slices - 1) * stagger;

  const points: string[] = ["0% 0%"];
  for (let i = 0; i < slices; i++) {
    const local = clamp01(presentationProgress * overdrive - i * stagger);
    const drop = EASE_CUT(local) * 100;
    const x0 = (i / slices) * 100;
    const x1 = ((i + 1) / slices) * 100;
    points.push(`${x0}% ${drop}%`, `${x1}% ${drop}%`);
  }
  points.push("100% 0%");

  // Seams flash while the cut travels, gone by the time it settles.
  const seamOpacity =
    4 * presentationProgress * (1 - presentationProgress) * 0.35;

  return (
    <AbsoluteFill style={{ clipPath: `polygon(${points.join(", ")})` }}>
      {children}
      {Array.from({ length: slices - 1 }, (_, i) => {
        const left = `${((i + 1) / slices) * 100}%`;
        return (
          <div
            key={left}
            style={{
              backgroundColor: PAPER,
              bottom: 0,
              left,
              opacity: seamOpacity,
              position: "absolute",
              top: 0,
              width: 3,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/** Use with `TransitionSeries.Transition` as the `presentation`. */
export function cutSlices(
  props: CutSlicesProps = {}
): TransitionPresentation<CutSlicesProps> {
  return { component: SlicePresentation, props };
}
