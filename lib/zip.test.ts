/// <reference types="bun" />
import { describe, expect, test } from "bun:test";

import { crc32, createZip, readZip } from "@/lib/zip";

const bytesOf = async (blob: Blob): Promise<Uint8Array> =>
  new Uint8Array(await blob.arrayBuffer());

describe("crc32", () => {
  test("matches the standard check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcb_f4_39_26);
  });
});

describe("createZip", () => {
  test("round-trips entries with folders and UTF-8 names", async () => {
    const zip = await createZip([
      { file: new Blob(["first"]), path: "instagram-feed/slide_01.png" },
      { file: new Blob(["zweite Ü"]), path: "square/slide_02.png" },
    ]);
    expect(zip.type).toBe("application/zip");
    const entries = readZip(await bytesOf(zip));
    expect(entries.map((entry) => entry.path)).toEqual([
      "instagram-feed/slide_01.png",
      "square/slide_02.png",
    ]);
    expect(new TextDecoder().decode(entries[1].data)).toBe("zweite Ü");
  });

  test("ends with an end-of-central-directory record counting every entry", async () => {
    const bytes = await bytesOf(
      await createZip([
        { file: new Blob(["a"]), path: "a.png" },
        { file: new Blob(["b"]), path: "b.png" },
        { file: new Blob(["c"]), path: "c.png" },
      ])
    );
    const view = new DataView(bytes.buffer);
    const end = bytes.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06_05_4b_50);
    expect(view.getUint16(end + 10, true)).toBe(3);
    const directoryStart = view.getUint32(end + 16, true);
    expect(view.getUint32(directoryStart, true)).toBe(0x02_01_4b_50);
  });
});
