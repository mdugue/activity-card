import type { ComponentProps } from "react";
import type { ActivityData } from "@/components/app/sample-data";
import { type AltitudeMood, ThemeAltitude } from "@/components/themes/altitude";
import { ThemeData } from "@/components/themes/data";
import { ThemeEditorial } from "@/components/themes/editorial";
import { ThemePath } from "@/components/themes/path";
import { ThemePhoto } from "@/components/themes/photo";
import { ThemeTriathlon } from "@/components/themes/triathlon";

export type ThemeId =
  | "path"
  | "altitude"
  | "photo"
  | "data"
  | "editorial"
  | "triathlon";

interface RenderThemeProps {
  altitudeMood?: AltitudeMood;
  data: ActivityData;
  photoUrl?: string | null;
  theme: ThemeId;
}

/** Dispatcher: picks the right theme component for the given id. */
export function RenderTheme({
  theme,
  data,
  photoUrl,
  altitudeMood = "night",
}: RenderThemeProps) {
  if (theme === "altitude") {
    return (
      <ThemeAltitude data={data} mood={altitudeMood} photoUrl={photoUrl} />
    );
  }
  if (theme === "photo") {
    return <ThemePhoto data={data} photoUrl={photoUrl} />;
  }
  if (theme === "data") {
    return <ThemeData data={data} photoUrl={photoUrl} />;
  }
  if (theme === "editorial") {
    return <ThemeEditorial data={data} photoUrl={photoUrl} />;
  }
  if (theme === "triathlon") {
    return <ThemeTriathlon data={data} photoUrl={photoUrl} />;
  }
  return <ThemePath data={data} photoUrl={photoUrl} />;
}

// Keep the ActivityCardProps shape inferable from any theme component.
export type ThemeProps = ComponentProps<typeof ThemePath>;
