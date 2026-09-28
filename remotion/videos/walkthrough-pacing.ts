// Walkthrough pacing, shared by every tutorial built on walkthrough.tsx — kept
// apart from the scene components so durations are plain data.

/** Walkthrough pacing norms (frames @30fps) — slower than the hero's cuts. */
export const WALK = { fade: 12, outro: 110, title: 100 } as const;
