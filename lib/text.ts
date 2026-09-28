// Explicit "has content" checks for optional strings — the house replacement
// for truthiness tests (`typescript/strict-boolean-expressions`). An empty
// string counts as absent everywhere in the app: an empty location, athlete
// name, query param or header all mean "not provided".

/** `s` holds at least one character. */
export const hasText = (s: string | null | undefined): s is string =>
  s !== undefined && s !== null && s !== "";

/** `s` when it holds text, `undefined` when it's empty or missing. */
export const nonEmpty = (s: string | null | undefined): string | undefined =>
  hasText(s) ? s : undefined;
