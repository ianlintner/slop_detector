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
});
