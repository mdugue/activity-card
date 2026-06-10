import type React from "react";
import { Composition } from "remotion";
import { MyComposition } from "./composition";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      component={MyComposition}
      durationInFrames={60}
      fps={30}
      height={720}
      id="Empty"
      width={1280}
    />
  </>
);
