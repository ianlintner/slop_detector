/**
 * Cheap perceptual hashing for frame de-duplication.
 *
 * A frame-evaluation run over a sampled video can contain many near-identical
 * stills (adjacent frames, repeated thumbnails). Calling a paid vision
 * provider for each one wastes money and skews latency/cost numbers, so we
 * compute a small average-hash (aHash) per image *before* any provider call
 * and skip images whose hash is within a small Hamming distance of one already
 * seen.
 *
 * This module is pure and dependency-free: it computes hashes and Hamming
 * distance over a decoded raster. Decoding compressed images (PNG/JPEG/WebP)
 * lives in the CLI runner (eval/), which uses the ``sharp`` codec; that keeps
 * the native dependency out of the web application's library surface. When no
 * raster is available the caller supplies a content hash instead (useful for
 * exact-duplicate detection only, not visual similarity).
 */

export type FrameHash = {
  /** Average hash as a BigInt (only when a decoded raster was supplied). */
  ahash: bigint;
  /** Pixel count of the source raster (0 when hashing raw bytes). */
  pixels: number;
  /** True when derived from decoded pixels; false for a content-hash fallback. */
  perceptual: boolean;
};

/**
 * Downsample a flat RGB(A) raster to a 64-bit average hash. Channels must be
 * 1 (gray), 3 (RGB) or 4 (RGBA). Alpha is ignored for hash purposes.
 */
export function ahashFromRaster(
  raster: Uint8Array,
  width: number,
  height: number,
  channels: number
): bigint {
  if (width < 1 || height < 1 || channels < 1) return BigInt(0);
  const SIZE = 8;
  const grays = new Uint8Array(SIZE * SIZE);
  // Sample the centroid of each 8x8 cell (cheap, deterministic).
  for (let gy = 0; gy < SIZE; gy++) {
    for (let gx = 0; gx < SIZE; gx++) {
      const sx = Math.min(width - 1, Math.floor(((gx + 0.5) / SIZE) * width));
      const sy = Math.min(height - 1, Math.floor(((gy + 0.5) / SIZE) * height));
      const i = (sy * width + sx) * channels;
      const r = raster[i];
      const g = channels >= 3 ? raster[i + 1] : r;
      const b = channels >= 3 ? raster[i + 2] : r;
      grays[gy * SIZE + gx] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
  }
  const avg = Math.round(grays.reduce((s, v) => s + v, 0) / (SIZE * SIZE));
  let hash = BigInt(0);
  for (let i = 0; i < SIZE * SIZE; i++) {
    if (grays[i] >= avg) hash |= BigInt(1) << BigInt(i);
  }
  return hash;
}

/** 64-bit FNV-1a over bytes (a cheap content hash, not perceptual). */
export function contentHash(bytes: Uint8Array): bigint {
  const FNV_PRIME = BigInt('0x100000001b3');
  const FNV_OFFSET = BigInt('0xcbf29ce484222325');
  const MASK = BigInt('0xffffffffffffffff');
  let h = FNV_OFFSET;
  for (const b of bytes) {
    h ^= BigInt(b);
    h = (h * FNV_PRIME) & MASK;
  }
  return h;
}

/** Population count of a BigInt (Hamming weight). */
export function popcount(x: bigint): number {
  let n = 0;
  let v = x;
  while (v) {
    v &= v - BigInt(1);
    n++;
  }
  return n;
}

/** Hamming distance between two hashes. */
export function hamming(a: bigint, b: bigint): number {
  return popcount(a ^ b);
}

/**
 * Streaming de-duplicator. Feed hashes in encounter order; ``isDuplicate``
 * returns true when a hash is within ``threshold`` bits of a prior one, using
 * a linear scan (fine for the tens-of-frames spike volume targeted here).
 */
export class FrameDedupe {
  private seen: bigint[] = [];
  private readonly threshold: number;
  constructor(threshold = 10) {
    this.threshold = threshold;
  }

  isDuplicate(hash: bigint): boolean {
    for (const prior of this.seen) {
      if (hamming(hash, prior) <= this.threshold) return true;
    }
    this.seen.push(hash);
    return false;
  }

  get count(): number {
    return this.seen.length;
  }
}
