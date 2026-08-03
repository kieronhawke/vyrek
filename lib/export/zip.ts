/**
 * A minimal ZIP writer, because an .xlsx is a zip of XML parts.
 *
 * Stored (uncompressed) entries only. The spec allows it, Excel and Numbers
 * both open it, and a training week is a few kilobytes of XML — compression
 * would save nothing worth a dependency. Adding one to write a spreadsheet
 * that ships as static XML is the kind of thing that quietly costs a hundred
 * transitive packages.
 */

/** CRC-32, table built once. */
const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export type ZipEntry = { path: string; data: string };

function u16(n: number) {
  return [n & 0xff, (n >>> 8) & 0xff];
}
function u32(n: number) {
  return [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
}

/**
 * DOS timestamp. Fixed rather than "now": a spreadsheet generated twice from
 * the same plan should be byte-identical, which makes it testable and keeps
 * a diff meaningful.
 */
const DOS_TIME = u16(0);
const DOS_DATE = u16(((2026 - 1980) << 9) | (1 << 5) | 1);

export function zip(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const locals: number[] = [];
  const central: number[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = enc.encode(entry.path);
    const data = enc.encode(entry.data);
    const sum = crc32(data);

    const header = [
      ...u32(0x04034b50),
      ...u16(20), // version needed
      ...u16(0),  // flags
      ...u16(0),  // stored
      ...DOS_TIME,
      ...DOS_DATE,
      ...u32(sum),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(name.length),
      ...u16(0),
    ];

    locals.push(...header, ...name, ...data);

    central.push(
      ...u32(0x02014b50),
      ...u16(20), // version made by
      ...u16(20), // version needed
      ...u16(0),
      ...u16(0),
      ...DOS_TIME,
      ...DOS_DATE,
      ...u32(sum),
      ...u32(data.length),
      ...u32(data.length),
      ...u16(name.length),
      ...u16(0), // extra
      ...u16(0), // comment
      ...u16(0), // disk
      ...u16(0), // internal attrs
      ...u32(0), // external attrs
      ...u32(offset),
      ...name,
    );

    offset += header.length + name.length + data.length;
  }

  const eocd = [
    ...u32(0x06054b50),
    ...u16(0),
    ...u16(0),
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(central.length),
    ...u32(offset),
    ...u16(0),
  ];

  return Uint8Array.from([...locals, ...central, ...eocd]);
}

/** XML text escaping. Excel is unforgiving about a stray ampersand. */
export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
