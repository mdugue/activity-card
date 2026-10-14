// A minimal ZIP writer for bundling export images into one download. Entries
// are STORED, not deflated: PNGs are already compressed, so deflate would cost
// time on a phone and save next to nothing. The archive is assembled as a Blob
// of parts, so the image bytes are never copied into one big buffer.

export interface ZipEntry {
  file: Blob;
  /** the path inside the archive, `/`-separated (a folder per format) */
  path: string;
}

// CRC-32 (IEEE) is defined over XOR, so its two XOR lines carry the only
// bitwise operators here; shifts are written as the divisions they are.
const CRC_POLYNOMIAL = 0xed_b8_83_20;
const UINT32_MAX = 0xff_ff_ff_ff;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      const half = Math.floor(c / 2);
      // oxlint-disable-next-line eslint/no-bitwise -- CRC-32 is defined over XOR
      c = c % 2 === 1 ? (CRC_POLYNOMIAL ^ half) >>> 0 : half;
    }
    table[n] = c;
  }
  return table;
})();

export const crc32 = (bytes: Uint8Array): number => {
  let crc = UINT32_MAX;
  for (const byte of bytes) {
    // oxlint-disable-next-line eslint/no-bitwise -- CRC-32 is defined over XOR
    crc = (CRC_TABLE[(crc % 256) ^ byte] ^ Math.floor(crc / 256)) >>> 0;
  }
  // The final inversion: every bit flipped, i.e. UINT32_MAX - crc.
  return UINT32_MAX - crc;
};

/** A ZIP header's DOS timestamp (local time, 2 s resolution). */
interface DosStamp {
  date: number;
  time: number;
}

/** Pack `date` into the DOS date/time fields a ZIP header stores — bit fields
 *  written as the multiplications they are. */
const dosDateTime = (date: Date): DosStamp => ({
  date:
    (Math.max(1980, date.getFullYear()) - 1980) * 512 +
    (date.getMonth() + 1) * 32 +
    date.getDate(),
  time:
    date.getHours() * 2048 +
    date.getMinutes() * 32 +
    Math.floor(date.getSeconds() / 2),
});

// General-purpose flag bit 11: file names are UTF-8.
const UTF8_FLAG = 0x08_00;

interface Written {
  crc: number;
  name: Uint8Array<ArrayBuffer>;
  offset: number;
  size: number;
}

/** Bundle `entries` into a ZIP archive (STORED, UTF-8 names). */
export const createZip = async (
  entries: ZipEntry[],
  now: Date = new Date()
): Promise<Blob> => {
  const encoder = new TextEncoder();
  const stamp = dosDateTime(now);
  const parts: BlobPart[] = [];
  const written: Written[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- one file's bytes at a time: only its checksum is kept, so a phone never holds the whole set twice
    const crc = crc32(new Uint8Array(await entry.file.arrayBuffer()));
    const { size } = entry.file;
    const header = new DataView(new ArrayBuffer(30));
    header.setUint32(0, 0x04_03_4b_50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, UTF8_FLAG, true);
    header.setUint16(8, 0, true);
    header.setUint16(10, stamp.time, true);
    header.setUint16(12, stamp.date, true);
    header.setUint32(14, crc, true);
    header.setUint32(18, size, true);
    header.setUint32(22, size, true);
    header.setUint16(26, name.length, true);
    header.setUint16(28, 0, true);
    parts.push(header.buffer, name, entry.file);
    written.push({ crc, name, offset, size });
    offset += 30 + name.length + size;
  }

  const directoryStart = offset;
  for (const entry of written) {
    const record = new DataView(new ArrayBuffer(46));
    record.setUint32(0, 0x02_01_4b_50, true);
    record.setUint16(4, 20, true);
    record.setUint16(6, 20, true);
    record.setUint16(8, UTF8_FLAG, true);
    record.setUint16(10, 0, true);
    record.setUint16(12, stamp.time, true);
    record.setUint16(14, stamp.date, true);
    record.setUint32(16, entry.crc, true);
    record.setUint32(20, entry.size, true);
    record.setUint32(24, entry.size, true);
    record.setUint16(28, entry.name.length, true);
    // extra length, comment length, disk number, internal + external attributes
    record.setUint32(42, entry.offset, true);
    parts.push(record.buffer, entry.name);
    offset += 46 + entry.name.length;
  }

  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06_05_4b_50, true);
  end.setUint16(8, written.length, true);
  end.setUint16(10, written.length, true);
  end.setUint32(12, offset - directoryStart, true);
  end.setUint32(16, directoryStart, true);
  parts.push(end.buffer);

  return new Blob(parts, { type: "application/zip" });
};

/** Read a STORED archive back into its entries — the inverse of `createZip`,
 *  for tests. Throws on anything `createZip` would not have written. */
export const readZip = (
  bytes: Uint8Array
): { data: Uint8Array; path: string }[] => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const out: { data: Uint8Array; path: string }[] = [];
  let at = 0;
  while (view.getUint32(at, true) === 0x04_03_4b_50) {
    if (view.getUint16(at + 8, true) !== 0) {
      throw new Error("only STORED entries are supported");
    }
    const crc = view.getUint32(at + 14, true);
    const size = view.getUint32(at + 18, true);
    const nameLength = view.getUint16(at + 26, true);
    const extraLength = view.getUint16(at + 28, true);
    const start = at + 30 + nameLength + extraLength;
    const data = bytes.subarray(start, start + size);
    if (crc32(data) !== crc) {
      throw new Error("checksum mismatch");
    }
    out.push({
      data,
      path: decoder.decode(bytes.subarray(at + 30, at + 30 + nameLength)),
    });
    at = start + size;
  }
  return out;
};
