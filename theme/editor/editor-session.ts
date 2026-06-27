// The one object `app/page.tsx` hands each editor: every piece of shared
// editing state + its handlers, grouped by concern (activity text, colour,
// photo, theme config). Both editors and the shared tools builder consume it,
// so adding a shared control is a one-place change instead of threading a new
// prop through page → editor → tools. Mode-specific things (the theme id +
// rail, the carousel controller, export) stay ordinary props.

import type { ActivityData, Sport } from "@/lib/activity";
import type { ImageTransform } from "@/lib/image-transform";
import type { ExtractedPalette } from "@/lib/palette";
import type { ParsedActivity } from "@/lib/parse-activity";
import type { PhotoEffects } from "@/lib/photo-effects";
import type { ColorChoice, ColorScheme } from "@/theme/core/colors";
import type { ParamDef } from "@/theme/core/params/kinds";
import type { Visibility } from "@/theme/core/visibility";

export interface EditorSession {
  /** raw editable overlay text (unstripped, for the inputs) */
  athleteName: string;
  /** which switches address data the current activity actually has,
   *  theme-gated for the active mode */
  available: Record<keyof Visibility, boolean>;
  color: {
    /** show the COLOUR control (hidden for fixed-palette themes) */
    adjustable: boolean;
    /** the effective choice (the active theme's default until the user picks) */
    choice: ColorChoice;
    /** true while the user hasn't customised — disables Reset */
    isDefault: boolean;
    /** `null` resets to the active theme's default choice */
    onChange: (choice: ColorChoice | null) => void;
    /** the resolved scheme the cards render with */
    scheme: ColorScheme;
  };
  config: {
    onChange: (next: Record<string, unknown>) => void;
    /** extracted photo palette — colour swatches + calculated param options */
    palette: ExtractedPalette | null;
    /** the active theme's parameter schema */
    params: ParamDef[];
    /** the active theme's coerced config */
    value: Record<string, unknown>;
  };
  /** visibility-stripped activity the cards render */
  data: ActivityData;
  location: string;
  onAthleteNameChange: (name: string) => void;
  onFilesLoaded: (parts: ParsedActivity[]) => void;
  onLocationChange: (location: string) => void;
  onOpenStravaPicker: () => void;
  onSportChange: (sport: Sport) => void;
  onTitleChange: (title: string) => void;
  onVisibilityChange: (visibility: Visibility) => void;
  photo: {
    /** lighter downscaled proxy for on-screen previews; falls back to `url`.
     *  Never an export source — exports rasterise the full-res `url`. */
    displayUrl: string | null;
    effects: PhotoEffects;
    onChange: (file: File | null) => void;
    onEffectsChange: (next: PhotoEffects) => void;
    onTransformChange: (next: ImageTransform) => void;
    /** pan/zoom, applied wherever a theme shows the photo */
    transform: ImageTransform;
    /** full-resolution object URL — the export source */
    url: string | null;
  };
  title: string;
  visibility: Visibility;
}
