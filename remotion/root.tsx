import type React from "react";
import { Composition } from "remotion";
import {
  HERO_DURATION_IN_FRAMES,
  HERO_FPS,
  HERO_HEIGHT,
  HERO_WIDTH,
  Hero,
} from "./videos/hero";
import {
  HERO_VERTICAL_DURATION_IN_FRAMES,
  HERO_VERTICAL_FPS,
  HERO_VERTICAL_HEIGHT,
  HERO_VERTICAL_WIDTH,
  HeroVertical,
} from "./videos/hero-vertical";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      component={Hero}
      durationInFrames={HERO_DURATION_IN_FRAMES}
      fps={HERO_FPS}
      height={HERO_HEIGHT}
      id="Hero"
      width={HERO_WIDTH}
    />
    <Composition
      component={HeroVertical}
      durationInFrames={HERO_VERTICAL_DURATION_IN_FRAMES}
      fps={HERO_VERTICAL_FPS}
      height={HERO_VERTICAL_HEIGHT}
      id="HeroVertical"
      width={HERO_VERTICAL_WIDTH}
    />
  </>
);
