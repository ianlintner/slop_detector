import { inspectImage, MAX_DIMENSION, MAX_PIXELS } from '../imageValidation';

const png = (w: number, h: number) => {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  b.set([0, 0, 0, 13], 8); // IHDR length
  b.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  b[16] = (w >>> 24) & 0xff;
  b[17] = (w >>> 16) & 0xff;
  b[18] = (w >>> 8) & 0xff;
  b[19] = w & 0xff;
  b[20] = (h >>> 24) & 0xff;
  b[21] = (h >>> 16) & 0xff;
  b[22] = (h >>> 8) & 0xff;
  b[23] = h & 0xff;
  b[24] = 8; // bit depth
  b[25] = 6; // color type RGBA
  return b;
};

describe('inspectImage', () => {
  test('parses real PNG dimensions', () => {
    const info = inspectImage(png(640, 480));
    expect(info).toEqual({ mime: 'image/png', width: 640, height: 480 });
  });

  test('rejects truncated PNG', () => {
    expect(inspectImage(png(640, 480).slice(0, 16))).toBeNull();
  });

  test('rejects oversized dimensions and pixel bombs', () => {
    expect(inspectImage(png(MAX_DIMENSION + 1, 1))).toBeNull();
    expect(inspectImage(png(1, MAX_DIMENSION + 1))).toBeNull();
    // width*height over MAX_PIXELS
    const side = Math.ceil(Math.sqrt(MAX_PIXELS)) + 1;
    expect(inspectImage(png(side, side))).toBeNull();
  });

  test('rejects unknown formats despite decoy extensions', () => {
    expect(inspectImage(Uint8Array.from([1, 2, 3, 4, 5]))).toBeNull();
  });

  test('rejects a PNG whose signature tail is corrupted', () => {
    const b = png(640, 480);
    b[4] = 0x00; // corrupt one of the four signature tail bytes
    expect(inspectImage(b)).toBeNull();
  });

  test('rejects a PNG whose IHDR length is not 13', () => {
    const b = png(640, 480);
    b[8] = 0;
    b[9] = 0;
    b[10] = 0;
    b[11] = 5; // bogus 5-byte IHDR
    expect(inspectImage(b)).toBeNull();
  });

  test('parses JPEG dimensions from the first SOF', () => {
    const b = Uint8Array.from([
      0xff,
      0xd8,
      0xff,
      0xe0,
      0x00,
      0x07,
      0x4a,
      0x46,
      0x49,
      0x46,
      0x00, // APP0 header
      0xff,
      0xc0,
      0x00,
      0x11, // SOF0, length 17
      0x08,
      0x02,
      0x80,
      0x01,
      0xe0, // precision, height=640, width=480
      0x03,
      0x01,
      0x11,
      0x00,
      0x02,
      0x11,
      0x01, // components
    ]);
    expect(inspectImage(b)).toEqual({
      mime: 'image/jpeg',
      width: 480,
      height: 640,
    });
  });

  test('rejects a JPEG that reaches scan start before any frame header', () => {
    const b = Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x08]);
    expect(inspectImage(b)).toBeNull();
  });

  test('parses WebP VP8X dimensions', () => {
    const b = new Uint8Array(30);
    b.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
    b.set([0x57, 0x45, 0x42, 0x50], 8); // WEBP
    b.set([0x56, 0x50, 0x38, 0x58], 12); // VP8X
    b[24] = 639 & 0xff; // width-1 = 639 => width 640
    b[25] = (639 >> 8) & 0xff;
    b[26] = (639 >> 16) & 0xff;
    b[27] = 479 & 0xff; // height-1 = 479 => height 480
    b[28] = (479 >> 8) & 0xff;
    b[29] = (479 >> 16) & 0xff;
    expect(inspectImage(b)).toEqual({
      mime: 'image/webp',
      width: 640,
      height: 480,
    });
  });
});
