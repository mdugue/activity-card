import { createStore, del, get, set } from "idb-keyval";
import { type DraftMetaV1, draftMetaSchema } from "@/lib/draft-schema";

const META_KEY = "meta";
const IMAGE_KEY = "image";
// Synchronous "is there a draft?" hint, mirrored in localStorage so the app can
// decide on first paint whether to wait for the async IndexedDB read or render
// the empty state immediately (avoids a flash of empty → editor on reload).
const FLAG_KEY = "effort:draft:present";

// `createStore` opens IndexedDB immediately, which would throw during SSR /
// prerender (there's no `indexedDB` on the server). Create it lazily on first
// use — every exported function below runs only in browser effects / handlers.
let store: ReturnType<typeof createStore> | undefined;
function draftStore(): ReturnType<typeof createStore> {
  store ??= createStore("effort-draft", "draft");
  return store;
}

function setDraftFlag(present: boolean): void {
  try {
    if (typeof window === "undefined") {
      return;
    }
    if (present) {
      window.localStorage.setItem(FLAG_KEY, "1");
    } else {
      window.localStorage.removeItem(FLAG_KEY);
    }
  } catch {
    // Soft-fail.
  }
}

/**
 * Synchronous check for a restorable draft. A hint only — `loadDraft` still
 * validates the actual IndexedDB contents — but it lets the UI skip the async
 * round-trip (and the empty-state flash) when nothing is saved.
 */
export function hasSavedDraft(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      window.localStorage.getItem(FLAG_KEY) === "1"
    );
  } catch {
    return false;
  }
}

export interface LoadedDraft {
  image: Blob | null;
  meta: DraftMetaV1;
}

/**
 * Read and validate the saved draft. Returns null when there's nothing stored,
 * or when the stored shape doesn't match the current schema (e.g. a draft from
 * an older app version) — the caller then simply starts fresh.
 */
export async function loadDraft(): Promise<LoadedDraft | null> {
  try {
    const s = draftStore();
    // Both keys in one round-trip — they're independent, and this read gates
    // first paint (the hydrating spinner), so latency is on the critical path.
    const [raw, image] = await Promise.all([
      get<unknown>(META_KEY, s),
      get<unknown>(IMAGE_KEY, s),
    ]);
    const parsed = draftMetaSchema.safeParse(raw);
    if (!parsed.success) {
      return null;
    }
    return { image: image instanceof Blob ? image : null, meta: parsed.data };
  } catch {
    return null;
  }
}

export async function saveDraftMeta(meta: DraftMetaV1): Promise<void> {
  // Set the hint before the await so a concurrent clearDraft() (Start over)
  // running during the write can't be undone by this resolving afterwards.
  setDraftFlag(true);
  try {
    await set(META_KEY, meta, draftStore());
  } catch {
    // Storage may be unavailable (private mode, quota, eviction); soft-fail.
  }
}

export async function saveDraftImage(blob: Blob): Promise<void> {
  try {
    await set(IMAGE_KEY, blob, draftStore());
  } catch {
    // Soft-fail: the card still works, it just won't survive a reload.
  }
}

export async function clearDraftImage(): Promise<void> {
  try {
    await del(IMAGE_KEY, draftStore());
  } catch {
    // Soft-fail.
  }
}

export async function clearDraft(): Promise<void> {
  // Clear the hint first so a failed IndexedDB delete can't leave us trying to
  // restore a draft the user asked to discard.
  setDraftFlag(false);
  try {
    await Promise.all([
      del(META_KEY, draftStore()),
      del(IMAGE_KEY, draftStore()),
    ]);
  } catch {
    // Soft-fail.
  }
}

/**
 * Ask the browser to exempt our storage from eviction under disk pressure.
 * Best-effort: support and the grant decision vary by browser, and iOS Safari
 * still caps inactive script storage at ~7 days regardless.
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (typeof navigator !== "undefined" && navigator.storage?.persist) {
      await navigator.storage.persist();
    }
  } catch {
    // Soft-fail.
  }
}
