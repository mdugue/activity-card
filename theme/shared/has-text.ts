// The explicit form of a truthiness check on an optional string: present AND
// non-empty. Themes gate optional text (location, athlete name, units) and the
// photo URL on this, so an empty string renders exactly like a missing one.
// (The false branch still admits "", so don't lean on its narrowing.)
export const hasText = (s: string | null | undefined): s is string =>
  s !== undefined && s !== null && s !== "";
