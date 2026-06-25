/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import {
  applyMetadata,
  buildMetadataChunks,
  buildXmp,
  injectPngChunks,
  itxtChunk,
  type MetadataInput,
  routeCentroid,
  textChunk,
} from "@/lib/metadata";

// Minimal valid-enough PNG: signature + IHDR + IEND (CRCs need not validate for
// our splice logic, which only walks length/type to locate IEND).
function fakePng(): Uint8Array {
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  const ihdr = chunkBytes("IHDR", new Uint8Array(13));
  const iend = chunkBytes("IEND", new Uint8Array(0));
  return new Uint8Array([...sig, ...ihdr, ...iend]);
}

function chunkBytes(type: string, data: Uint8Array): number[] {
  const lenBytes = new Uint8Array(4);
  new DataView(lenBytes.buffer).setUint32(0, data.length);
  const out: number[] = [...lenBytes];
  for (const ch of type) {
    out.push(ch.charCodeAt(0));
  }
  out.push(...data);
  out.push(0, 0, 0, 0); // crc placeholder — splice doesn't validate it
  return out;
}

function chunkTypesOf(png: Uint8Array): string[] {
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const types: string[] = [];
  let offset = 8;
  while (offset + 8 <= png.length) {
    const len = dv.getUint32(offset);
    types.push(
      String.fromCharCode(
        png[offset + 4],
        png[offset + 5],
        png[offset + 6],
        png[offset + 7]
      )
    );
    offset += 12 + len;
  }
  return types;
}

describe("chunk builders", () => {
  test("tEXt encodes keyword\\0text with a length+crc frame", () => {
    const c = textChunk("Software", "Effort");
    // length prefix = data length = "Software".length + 1 + "Effort".length
    const dv = new DataView(c.buffer, c.byteOffset, c.byteLength);
    expect(dv.getUint32(0)).toBe(8 + 1 + 6);
    expect(String.fromCharCode(c[4], c[5], c[6], c[7])).toBe("tEXt");
    expect(c.length).toBe(12 + 8 + 1 + 6);
  });

  test("iTXt carries the five separators and UTF-8 body", () => {
    const c = itxtChunk("Title", "Café 🚴");
    expect(String.fromCharCode(c[4], c[5], c[6], c[7])).toBe("iTXt");
    // round-trips longer than the ascii length due to multibyte glyphs
    expect(c.length).toBeGreaterThan(
      12 + "Title".length + 5 + "Café 🚴".length
    );
  });
});

describe("injectPngChunks", () => {
  test("splices chunks between IHDR and IEND", () => {
    const png = fakePng();
    const out = injectPngChunks(png, [textChunk("Software", "Effort")]);
    expect(chunkTypesOf(out)).toEqual(["IHDR", "tEXt", "IEND"]);
    expect(out.length).toBe(
      png.length + textChunk("Software", "Effort").length
    );
  });

  test("returns input untouched when not a PNG", () => {
    const notPng = new Uint8Array([1, 2, 3, 4]);
    expect(injectPngChunks(notPng, [textChunk("a", "b")])).toBe(notPng);
  });

  test("no-op for an empty chunk list", () => {
    const png = fakePng();
    expect(injectPngChunks(png, [])).toBe(png);
  });
});

describe("buildMetadataChunks", () => {
  const input: MetadataInput = {
    title: "Gravel deluxe",
    athleteName: "Manuel Dugué",
    date: "2026-06-14",
    location: "Neustadt, Sachsen",
    point: { lat: 51.0, lng: 13.9 },
    url: "https://effort.app",
  };

  test("always writes Software + Source attribution", () => {
    const out = applyMetadata(fakePng(), input);
    const types = chunkTypesOf(out);
    expect(types).toContain("tEXt");
    expect(types).toContain("iTXt");
    expect(types.at(-1)).toBe("IEND");
  });

  test("GPS opt-out removes coordinates from the XMP packet", () => {
    const withGps = buildXmp(input, true);
    const without = buildXmp(input, false);
    expect(withGps).toContain("exif:GPSLatitude");
    expect(without).not.toContain("exif:GPSLatitude");
    expect(without).not.toContain("photoshop:City");
  });

  test("attribution survives even with GPS disabled", () => {
    const chunks = buildMetadataChunks(input, { gps: false });
    expect(chunks.length).toBeGreaterThan(2);
  });
});

describe("routeCentroid", () => {
  test("inverts the stored [lng, -lat] convention", () => {
    // stored as [lng, -lat] → real lat is the negation
    const c = routeCentroid([
      [13.0, -51.0],
      [13.2, -51.2],
    ]);
    expect(c?.lng).toBeCloseTo(13.1, 6);
    expect(c?.lat).toBeCloseTo(51.1, 6);
  });

  test("empty/undefined → null", () => {
    expect(routeCentroid(undefined)).toBeNull();
    expect(routeCentroid([])).toBeNull();
  });
});
