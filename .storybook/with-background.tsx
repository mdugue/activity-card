// Feeds a background photo into theme stories. Resolves the URL from either a
// per-story file upload (the `bgUpload` arg) or the toolbar Background preset —
// the upload wins — then measures the image's natural size (the carousel sizes
// its panorama against it) and injects both `photoUrl` and `imageSize` as args.
//
// Every theme component (single card + carousel SeamlessCanvas) reads `photoUrl`
// under the same name, and ignores the extra `imageSize`/`bgUpload` props it
// doesn't use, so one decorator covers them all.

import type { Decorator } from "@storybook/nextjs-vite";
import type { ReactNode } from "react";
import {
  type ImageSize,
  useImageNaturalSize,
} from "@/hooks/use-image-natural-size";
import { BACKGROUND_PRESETS } from "./backgrounds";

function resolveUrl(
  globals: Record<string, unknown>,
  args: Record<string, unknown>
): string | null {
  // Storybook's `file` control yields an array of object URLs for the upload.
  const uploaded = args.bgUpload;
  if (
    Array.isArray(uploaded) &&
    uploaded.length > 0 &&
    typeof uploaded[0] === "string"
  ) {
    return uploaded[0];
  }
  const preset = globals.background;
  return typeof preset === "string"
    ? (BACKGROUND_PRESETS[preset]?.url ?? null)
    : null;
}

/** Measures the photo asynchronously (as the app does) then renders the story
 *  with the resolved `photoUrl` + `imageSize`. A component so the hook is legal. */
function WithBackgroundPhoto({
  url,
  render,
}: {
  url: string | null;
  render: (photo: {
    photoUrl?: string;
    imageSize: ImageSize | null;
  }) => ReactNode;
}) {
  const imageSize = useImageNaturalSize(url);
  return <>{render({ photoUrl: url ?? undefined, imageSize })}</>;
}

export const withBackground: Decorator = (Story, context) => {
  const url = resolveUrl(context.globals, context.args);
  return (
    <WithBackgroundPhoto
      render={(photo) => <Story args={{ ...context.args, ...photo }} />}
      url={url}
    />
  );
};
