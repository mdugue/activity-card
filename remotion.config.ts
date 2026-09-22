import path from "node:path";

import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";

// Studio/CLI entry. The on-page <Player> (components/app/intro-player.tsx,
// composition-player.tsx) imports compositions directly and never reads this.
Config.setEntryPoint("./remotion/index.ts");

Config.overrideWebpackConfig((current) => {
  // The compositions reuse the app's Tailwind layer (app/globals.css) and its
  // `@/` path alias; Remotion's webpack knows about neither out of the box.
  const withTailwind = enableTailwind(current);
  return {
    ...withTailwind,
    resolve: {
      ...withTailwind.resolve,
      // webpack accepts `alias` as an array of { name, alias } entries or as a
      // record; spreading the array form into an object would turn it into
      // numeric index keys, so each form is merged in its own shape.
      alias: Array.isArray(withTailwind.resolve?.alias)
        ? [
            ...withTailwind.resolve.alias,
            { name: "@", alias: path.resolve(process.cwd()) },
          ]
        : {
            ...withTailwind.resolve?.alias,
            "@": path.resolve(process.cwd()),
          },
    },
  };
});
