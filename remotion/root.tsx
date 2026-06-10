import type React from "react";
import { Composition } from "remotion";
import {
  EffortIntro,
  INTRO_DURATION_IN_FRAMES,
  INTRO_FPS,
  INTRO_HEIGHT,
  INTRO_WIDTH,
} from "./composition";

export const RemotionRoot: React.FC = () => (
  <Composition
    component={EffortIntro}
    durationInFrames={INTRO_DURATION_IN_FRAMES}
    fps={INTRO_FPS}
    height={INTRO_HEIGHT}
    id="Intro"
    width={INTRO_WIDTH}
  />
);
