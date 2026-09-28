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
import type { Args, Globals } from "storybook/internal/types";
import { z } from "zod";

import { useImageNaturalSize } from "@/hooks/use-image-natural-size";
import type { ImageSize } from "@/hooks/use-image-natural-size";

import { BACKGROUND_ORDER, BACKGROUND_PRESETS } from "./backgrounds";

// Storybook's `file` control yields an array of object URLs for the upload;
// the first one is the photo.
export default {}
const UploadSchema = z.tuple([z.string()]).rest(z.unknown());
const BackgroundIdSchema = z.enum(BACKGROUND_ORDER);

/** The upload wins; otherwise the toolbar preset (unknown values = no photo). */
const resolveUrl = (
  background: Globals[string],
  bgUpload: Args[string]
): string | null => {
  const uploaded = UploadSchema.safeParse(bgUpload);
  if (uploaded.success) {
    return uploaded.data[0];
  }
  const preset = BackgroundIdSchema.safeParse(background);
  return preset.success ? BACKGROUND_PRESETS[preset.data].url : null;
};

/** Measures the photo asynchronously (as the app does) then renders the story
 *  with the resolved `photoUrl` + `imageSize`. A component so the hook is legal. */
const WithBackgroundPhoto = ({
  url,
  render,
}: {
  url: string | null;
  render: (photo: {
    photoUrl?: string;
    imageSize: ImageSize | null;
  }) => ReactNode;
}) => {
  const imageSize = useImageNaturalSize(url);
  return <>{render({ imageSize, photoUrl: url ?? undefined })}</>;
};

export const withBackground: Decorator = (Story, context) => {
  const url = resolveUrl(context.globals.background, context.args.bgUpload);
  return (
    <WithBackgroundPhoto
      render={(photo) => <Story args={{ ...context.args, ...photo }} />}
      url={url}
    />
  );
};
