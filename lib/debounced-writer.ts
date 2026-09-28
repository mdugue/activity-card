// Trailing-edge debounce for a write whose latest value is all that matters
// (e.g. persisting UI prefs to localStorage). Unlike a plain debounce it can
// be flushed on demand, so a caller can force the pending value out when the
// page is being hidden or unloaded and the timer would never fire.

export interface DebouncedWriter<T> {
  /** Drop the pending value without writing it. */
  cancel: () => void;
  /** Write the pending value now (no-op when nothing is pending). */
  flush: () => void;
  /** Replace the pending value and restart the quiet period. */
  schedule: (value: T) => void;
}

export const createDebouncedWriter = <T>(
  write: (value: T) => void,
  delayMs: number
): DebouncedWriter<T> => {
  let pending: { value: T } | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const stopTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const flush = () => {
    stopTimer();
    if (pending) {
      const { value } = pending;
      pending = null;
      write(value);
    }
  };

  return {
    cancel: () => {
      stopTimer();
      pending = null;
    },
    flush,
    schedule: (value) => {
      pending = { value };
      stopTimer();
      timer = setTimeout(flush, delayMs);
    },
  };
};
