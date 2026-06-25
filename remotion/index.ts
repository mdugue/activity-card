import { registerRoot } from "remotion";
// Studio/CLI only — inside the Next app the <Player> renders inline in the
// page, where app/layout.tsx already loads this stylesheet (and next/font
// provides the `--font-*` variables; see remotion/design/fonts.ts).
import "../app/globals.css";
import { RemotionRoot } from "./root";

registerRoot(RemotionRoot);
