/**
 * Entry point for file upload. Dispatches to a format-specific parser by
 * extension; each parser is dynamic-imported so a `.fit` upload never loads
 * `fast-xml-parser` (and a `.gpx` upload never loads `fit-file-parser`),
 * keeping the initial JS the empty state ships small.
 */

export type { ParsedActivity, ParsedSport } from "./parse-shared";

import type { ParsedActivity } from "./parse-shared";

export async function parseActivityFile(file: File): Promise<ParsedActivity> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "gpx") {
    const [text, { parseGpx }] = await Promise.all([
      file.text(),
      import("./parse-gpx"),
    ]);
    return parseGpx(text, file.name);
  }
  if (ext === "fit") {
    const [buffer, { parseFit }] = await Promise.all([
      file.arrayBuffer(),
      import("./parse-fit"),
    ]);
    return parseFit(buffer, file.name);
  }
  throw new Error(`Unsupported file extension: ${ext}`);
}
