/// <reference types="bun" />
import { afterEach, beforeEach, describe, expect, jest, test } from "bun:test";

import { createDebouncedWriter } from "@/lib/debounced-writer";

describe("createDebouncedWriter", () => {
  let writes: number[] = [];
  const writer = () =>
    createDebouncedWriter((value: number) => writes.push(value), 300);

  beforeEach(() => {
    writes = [];
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("collapses a burst into one write of the last value", () => {
    const w = writer();
    for (let tick = 1; tick <= 20; tick += 1) {
      w.schedule(tick);
      jest.advanceTimersByTime(50);
    }
    expect(writes).toEqual([]);

    jest.advanceTimersByTime(300);
    expect(writes).toEqual([20]);
  });

  test("flush writes the pending value immediately, exactly once", () => {
    const w = writer();
    w.schedule(7);
    w.flush();
    expect(writes).toEqual([7]);

    // The cancelled timer never writes it a second time …
    jest.advanceTimersByTime(1000);
    expect(writes).toEqual([7]);
    // … and a flush with nothing pending is a no-op.
    w.flush();
    expect(writes).toEqual([7]);
  });

  test("cancel drops the pending value", () => {
    const w = writer();
    w.schedule(3);
    w.cancel();
    jest.advanceTimersByTime(1000);
    w.flush();
    expect(writes).toEqual([]);
  });
});
