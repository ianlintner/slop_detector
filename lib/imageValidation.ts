// Structural validation of uploaded images. Magic bytes alone (detectImage) are
// not enough: this also parses the header to obtain real dimensions so that
// truncated/garbage files and decompression-bomb-sized canvases are rejected
// before the bytes are forwarded to a paid provider. No pixel decoding happens.

export const MAX_DIMENSION = 8000;
export const MAX_PIXELS = 40_000_000;

export type ImageInfo = { mime: string; width: number; height: number };

function u32be(b: Uint8Array, i: number) {
  return ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
}

function ascii(b: Uint8Array, start: number, end: number) {
  let s = '';
  for (let i = start; i < end; i++) s += String.fromCharCode(b[i]);
  return s;
}

function pngSize(b: Uint8Array) {
  if (b.length < 24 || ascii(b, 12, 16) !== 'IHDR') return null;
  return { width: u32be(b, 16), height: u32be(b, 20) };
}

function jpegSize(b: Uint8Array) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    // Standalone markers carry no length.
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    ) {
      i += 2;
      continue;
    }
    const length = (b[i + 2] << 8) | b[i + 3];
    if (length < 2) return null;
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isSof)
      return {
        height: (b[i + 5] << 8) | b[i + 6],
        width: (b[i + 7] << 8) | b[i + 8],
      };
    if (marker === 0xda) return null; // start of scan before any frame header
    i += 2 + length;
  }
  return null;
}

function webpSize(b: Uint8Array) {
  if (b.length < 30) return null;
  const chunk = ascii(b, 12, 16);
  if (chunk === 'VP8X')
    return {
      width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
      height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
    };
  if (chunk === 'VP8L') {
    if (b[20] !== 0x2f) return null;
    const bits = (b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)) >>> 0;
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8 ') {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return {
      width: (b[26] | (b[27] << 8)) & 0x3fff,
      height: (b[28] | (b[29] << 8)) & 0x3fff,
    };
  }
  return null;
}

/** Returns validated image info, or null when the file is not a well-formed,
 * reasonably sized PNG/JPEG/WebP. */
export function inspectImage(bytes: Uint8Array): ImageInfo | null {
  let mime: string;
  let size: { width: number; height: number } | null;
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(bytes, 1, 4) === 'PNG') {
    mime = 'image/png';
    size = pngSize(bytes);
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    mime = 'image/jpeg';
    size = jpegSize(bytes);
  } else if (
    bytes.length >= 12 &&
    ascii(bytes, 0, 4) === 'RIFF' &&
    ascii(bytes, 8, 12) === 'WEBP'
  ) {
    mime = 'image/webp';
    size = webpSize(bytes);
  } else return null;
  if (!size) return null;
  const { width, height } = size;
  if (
    width < 1 ||
    height < 1 ||
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION ||
    width * height > MAX_PIXELS
  )
    return null;
  return { mime, width, height };
}
