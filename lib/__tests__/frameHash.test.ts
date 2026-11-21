import {
  ahashFromRaster,
  contentHash,
  FrameDedupe,
  hamming,
  popcount,
} from '../frameHash';

describe('ahashFromRaster', () => {
  test('solid raster hashes to all-bits-set (every sample above average)', () => {
    // 32x32 single channel all 255 -> average 255 -> every sample >= avg -> 64 bits set
    const raster = new Uint8Array(32 * 32).fill(255);
    const hash = ahashFromRaster(raster, 32, 32, 1);
    expect(popcount(hash)).toBe(64);
  });

  test('empty raster hashes to zero', () => {
    expect(ahashFromRaster(new Uint8Array(0), 0, 0, 0)).toBe(BigInt(0));
  });

  test('distinct rasters produce distinct hashes', () => {
    // Use non-degenerate rasters: an all-black frame and an all-white frame are
    // both "flat/blank" and aHash collapses both to the same all-bits result
    // (every sample ties the average). Two genuinely different patterns must
    // hash differently.
    const a = new Uint8Array(32 * 32);
    const b = new Uint8Array(32 * 32);
    for (let i = 0; i < 32 * 32; i++) {
      a[i] = i % 2 === 0 ? 0 : 255; // vertical stripes
      b[i] = (i >> 2) % 2 === 0 ? 0 : 255; // finer stripes
    }
    expect(ahashFromRaster(a, 32, 32, 1)).not.toBe(
      ahashFromRaster(b, 32, 32, 1)
    );
  });
});

describe('contentHash', () => {
  test('is deterministic and distinct for different bytes', () => {
    const a = contentHash(new Uint8Array([1, 2, 3]));
    const b = contentHash(new Uint8Array([1, 2, 4]));
    expect(a).toBe(contentHash(new Uint8Array([1, 2, 3])));
    expect(a).not.toBe(b);
  });
});

describe('hamming / popcount', () => {
  test('hamming of identical hashes is zero', () => {
    expect(hamming(BigInt(5), BigInt(5))).toBe(0);
  });
  test('hamming counts differing bits', () => {
    expect(hamming(BigInt(0), BigInt(0b1111))).toBe(4);
  });
});

describe('FrameDedupe', () => {
  test('flags near-identical hashes as duplicates, keeps distinct ones as unique', () => {
    const d = new FrameDedupe(2);
    const base = BigInt('0x000000000000000f');
    const near = base ^ BigInt(1); // 1 bit apart
    const far = BigInt('0xf0f0f0f0f0f0f0f0');
    expect(d.isDuplicate(base)).toBe(false);
    expect(d.isDuplicate(near)).toBe(true); // within threshold
    expect(d.isDuplicate(far)).toBe(false); // > threshold
    expect(d.count).toBe(2); // base + far
  });

  test('threshold 0 is exact-match only', () => {
    const d = new FrameDedupe(0);
    expect(d.isDuplicate(BigInt(3))).toBe(false);
    expect(d.isDuplicate(BigInt(3))).toBe(true);
    expect(d.isDuplicate(BigInt(2))).toBe(false);
  });
});
