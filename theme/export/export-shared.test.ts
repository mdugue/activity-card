/// <reference types="bun" />
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  spyOn,
  test,
} from "bun:test";

import {
  createInFlightGuard,
  effortDateSlug,
  REVOKE_DELAY_MS,
  triggerDownload,
} from "@/theme/export/export-shared";

describe("effortDateSlug", () => {
  test("keeps a plain ISO date untouched", () => {
    expect(effortDateSlug("2026-05-18")).toBe("2026-05-18");
  });

  test("strips time-of-day characters from a full timestamp", () => {
    expect(effortDateSlug("2026-05-18T07:00:00Z")).toBe("2026-05-18070000");
  });

  test("falls back to 'undated' for empty or digit-free input", () => {
    expect(effortDateSlug("")).toBe("undated");
    expect(effortDateSlug("no digits here")).toBe("undated");
  });
});

describe("triggerDownload", () => {
  const realDocument = globalThis.document;
  let events: string[] = [];

  beforeEach(() => {
    events = [];
    jest.useFakeTimers();
    spyOn(URL, "createObjectURL").mockReturnValue("blob:effort/1");
    spyOn(URL, "revokeObjectURL").mockImplementation((url: string) => {
      events.push(`revoke ${url}`);
    });
    const anchor = {
      click: () => events.push("click"),
      download: "",
      href: "",
      remove: () => events.push("remove"),
    };
    // reason: a minimal stand-in for the DOM — only what triggerDownload touches.
    globalThis.document = {
      body: { append: () => events.push("append") },
      createElement: () => anchor,
    } as unknown as Document;
  });

  afterEach(() => {
    jest.useRealTimers();
    globalThis.document = realDocument;
    jest.restoreAllMocks();
  });

  test("keeps the object URL alive past the click, then revokes it", () => {
    triggerDownload(new File(["png"], "card.png", { type: "image/png" }));
    expect(events).toEqual(["append", "click", "remove"]);

    jest.advanceTimersByTime(REVOKE_DELAY_MS - 1);
    expect(events).not.toContain("revoke blob:effort/1");

    jest.advanceTimersByTime(1);
    expect(events).toContain("revoke blob:effort/1");
  });
});

describe("createInFlightGuard", () => {
  test("drops a second run while the first is in flight", async () => {
    const guard = createInFlightGuard();
    let release: () => void = () => {};
    let calls = 0;
    const task = async () => {
      calls += 1;
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    };

    const first = guard.run(task);
    expect(guard.busy).toBe(true);
    // A double click lands before the first capture settles.
    expect(await guard.run(task)).toBe(false);
    expect(calls).toBe(1);

    release();
    expect(await first).toBe(true);
    expect(guard.busy).toBe(false);
  });

  test("frees the gate when the task throws", async () => {
    const guard = createInFlightGuard();
    const outcome = await guard
      .run(async () => {
        await Promise.resolve();
        throw new Error("capture failed");
      })
      .catch((error: unknown) => (error as Error).message);
    expect(outcome).toBe("capture failed");
    expect(guard.busy).toBe(false);
    expect(await guard.run(async () => {})).toBe(true);
  });
});
