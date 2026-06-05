// Rasterises the brand mark in `public/icons/icon-source.svg` into the PNG
// app-icons referenced by the web manifest and the iOS home-screen icon.
//
// The source SVG keeps the logo inside the central ~64% "safe zone" so it
// survives both Android maskable circles and the iOS rounded-square mask.
//
// Run with: `bun run generate-icons`
// Uses the pure-wasm resvg build so it works on any platform without native
// libvips/sharp binaries.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

const root = fileURLToPath(new URL("..", import.meta.url));
const wasm = readFileSync(
  `${root}node_modules/@resvg/resvg-wasm/index_bg.wasm`
);
await initWasm(wasm);

const svg = readFileSync(`${root}public/icons/icon-source.svg`, "utf8");

interface IconTarget {
  out: string;
  size: number;
}

const targets: IconTarget[] = [
  { out: "public/icons/icon-192.png", size: 192 },
  { out: "public/icons/icon-512.png", size: 512 },
  { out: "public/icons/icon-maskable-512.png", size: 512 },
  // Next.js serves `app/apple-icon.png` as the <link rel="apple-touch-icon">.
  { out: "app/apple-icon.png", size: 180 },
];

for (const { out, size } of targets) {
  const png = new Resvg(svg, { fitTo: { mode: "width", value: size } })
    .render()
    .asPng();
  writeFileSync(`${root}${out}`, png);
  process.stdout.write(`wrote ${out} (${size}×${size})\n`);
}
