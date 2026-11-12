/**
 * Lightweight, zero-dependency browser-compatible ZIP archive generator.
 * Creates standard PKWARE ZIP format 2.0 archives (Store method, CRC-32 validated).
 */

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c >>> 0;
}

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16LE(arr: Uint8Array, offset: number, value: number) {
  arr[offset] = value & 0xff;
  arr[offset + 1] = (value >> 8) & 0xff;
}

function writeUint32LE(arr: Uint8Array, offset: number, value: number) {
  arr[offset] = value & 0xff;
  arr[offset + 1] = (value >> 8) & 0xff;
  arr[offset + 2] = (value >> 16) & 0xff;
  arr[offset + 3] = (value >> 24) & 0xff;
}

function getDosDateTime(date: Date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const d = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return {time, date: d};
}

export type ZipFileEntry = {
  name: string;
  data: Uint8Array | string;
};

/**
 * Creates a standard ZIP archive from an array of file entries.
 */
export function createZipArchive(files: ZipFileEntry[], now: Date = new Date()): Blob {
  const encoder = new TextEncoder();
  const {time, date} = getDosDateTime(now);

  type PreparedEntry = {
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    offset: number;
  };

  const prepared: PreparedEntry[] = [];
  let currentOffset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name.replace(/\\/g, '/'));
    const dataBytes = typeof file.data === 'string' ? encoder.encode(file.data) : file.data;
    const crc = crc32(dataBytes);

    prepared.push({
      nameBytes,
      dataBytes,
      crc,
      offset: currentOffset,
    });

    // Local header: 30 bytes + name length + data length
    currentOffset += 30 + nameBytes.length + dataBytes.length;
  }

  const centralDirectoryOffset = currentOffset;
  let centralDirectorySize = 0;

  for (const entry of prepared) {
    // Central directory header: 46 bytes + name length
    centralDirectorySize += 46 + entry.nameBytes.length;
  }

  // End of central directory record: 22 bytes
  const totalSize = centralDirectoryOffset + centralDirectorySize + 22;
  const buffer = new Uint8Array(totalSize);

  // 1. Write Local File Headers + File Data
  for (const entry of prepared) {
    const offset = entry.offset;
    // Signature 0x04034b50
    writeUint32LE(buffer, offset, 0x04034b50);
    // Version needed: 20 (2.0)
    writeUint16LE(buffer, offset + 4, 20);
    // General purpose flag: bit 11 (0x0800) = UTF-8 filename
    writeUint16LE(buffer, offset + 6, 0x0800);
    // Compression method: 0 (Store)
    writeUint16LE(buffer, offset + 8, 0);
    // Last mod file time and date
    writeUint16LE(buffer, offset + 10, time);
    writeUint16LE(buffer, offset + 12, date);
    // CRC-32
    writeUint32LE(buffer, offset + 14, entry.crc);
    // Compressed size
    writeUint32LE(buffer, offset + 18, entry.dataBytes.length);
    // Uncompressed size
    writeUint32LE(buffer, offset + 22, entry.dataBytes.length);
    // Filename length
    writeUint16LE(buffer, offset + 26, entry.nameBytes.length);
    // Extra field length
    writeUint16LE(buffer, offset + 28, 0);
    // Filename
    buffer.set(entry.nameBytes, offset + 30);
    // File data
    buffer.set(entry.dataBytes, offset + 30 + entry.nameBytes.length);
  }

  // 2. Write Central Directory Headers
  let cdOffset = centralDirectoryOffset;
  for (const entry of prepared) {
    // Signature 0x02014b50
    writeUint32LE(buffer, cdOffset, 0x02014b50);
    // Version made by: 20
    writeUint16LE(buffer, cdOffset + 4, 20);
    // Version needed: 20
    writeUint16LE(buffer, cdOffset + 6, 20);
    // General purpose flag: UTF-8
    writeUint16LE(buffer, cdOffset + 8, 0x0800);
    // Compression method: 0 (Store)
    writeUint16LE(buffer, cdOffset + 10, 0);
    // Time and date
    writeUint16LE(buffer, cdOffset + 12, time);
    writeUint16LE(buffer, cdOffset + 14, date);
    // CRC-32
    writeUint32LE(buffer, cdOffset + 16, entry.crc);
    // Compressed size
    writeUint32LE(buffer, cdOffset + 20, entry.dataBytes.length);
    // Uncompressed size
    writeUint32LE(buffer, cdOffset + 24, entry.dataBytes.length);
    // Filename length
    writeUint16LE(buffer, cdOffset + 28, entry.nameBytes.length);
    // Extra field length
    writeUint16LE(buffer, cdOffset + 30, 0);
    // File comment length
    writeUint16LE(buffer, cdOffset + 32, 0);
    // Disk number start
    writeUint16LE(buffer, cdOffset + 34, 0);
    // Internal file attributes
    writeUint16LE(buffer, cdOffset + 36, 0);
    // External file attributes
    writeUint32LE(buffer, cdOffset + 38, 0);
    // Relative offset of local header
    writeUint32LE(buffer, cdOffset + 42, entry.offset);
    // Filename
    buffer.set(entry.nameBytes, cdOffset + 46);

    cdOffset += 46 + entry.nameBytes.length;
  }

  // 3. Write End of Central Directory Record (EOCD)
  // Signature 0x06054b50
  writeUint32LE(buffer, cdOffset, 0x06054b50);
  // Number of this disk: 0
  writeUint16LE(buffer, cdOffset + 4, 0);
  // Disk with start of central directory: 0
  writeUint16LE(buffer, cdOffset + 6, 0);
  // Total entries on this disk
  writeUint16LE(buffer, cdOffset + 8, prepared.length);
  // Total entries
  writeUint16LE(buffer, cdOffset + 10, prepared.length);
  // Size of central directory
  writeUint32LE(buffer, cdOffset + 12, centralDirectorySize);
  // Offset of central directory
  writeUint32LE(buffer, cdOffset + 16, centralDirectoryOffset);
  // Comment length: 0
  writeUint16LE(buffer, cdOffset + 20, 0);

  return new Blob([buffer], {type: 'application/zip'});
}
