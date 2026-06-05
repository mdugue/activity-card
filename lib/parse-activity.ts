/**
 * Entry point for file upload. Dispatches to a format-specific parser by
 * extension; each parser is dynamic-imported so a `.fit` upload never loads
 * `fast-xml-parser` (and a `.gpx` upload never loads `fit-file-parser`),
 * keeping the initial JS the empty state ships small.
 */

export type { ParsedActivity, ParsedSport } from "./parse-shared";

import type { ParsedActivity } from "./parse-shared";

/** Accepted upload extensions. */
export const ACTIVITY_FILE_RE = /\.(gpx|fit)$/i;

/**
 * Filter a drop/selection down to `.gpx`/`.fit` files and parse each into a
 * `ParsedActivity`. Throws `"Drop a .gpx or .fit file."` when nothing matches
 * and propagates parse errors — callers choose how to surface them (toast vs
 * inline). Shared by every upload surface so the accepted formats and the
 * empty-selection message live in one place.
 */
export async function parseActivityFiles(
  fileList: FileList | File[]
): Promise<ParsedActivity[]> {
  const files = Array.from(fileList).filter((f) =>
    ACTIVITY_FILE_RE.test(f.name)
  );
  if (files.length === 0) {
    throw new Error("Drop a .gpx or .fit file.");
  }
  const parts = await Promise.all(files.map((f) => parseActivityFile(f)));
  return parts;
}

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
