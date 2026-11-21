/**
 * Frame-evaluation harness CLI.
 *
 * Runs the slop detector's vision assessment against a directory of still
 * frames labeled in a CSV (`file,label,scope,notes`) and reports
 * precision/recall/abstain rate, latency and estimated cost — after a
 * perceptual-hash de-duplication pass so near-identical frames are not sent to
 * a paid provider.
 *
 * Run with the mocked provider by default (no network, no key):
 *
 *     node eval/run.ts --dir eval/frames --labels eval/labels.csv
 *
 * Real providers are opt-in and fail closed without credentials:
 *
 *     node eval/run.ts --dir eval/frames --labels eval/labels.csv --provider openrouter
 *
 * This is a local spike tool, not a web route. It never reads internal Converge
 * frames; only feed it publicly licensed sample frames until the owner approves
 * a provider for internal content.
 *
 * Node 22.6+ runs this file directly via native type-stripping; no build step.
 */
import { readFile } from 'node:fs/promises';
import { ahashFromRaster, contentHash, FrameDedupe } from '../lib/frameHash.ts';
import type { FrameAssessment } from '../lib/frameProviders.ts';
import type { FrameProvider } from '../lib/frameProviders.ts';
import { resolveProvider } from '../lib/frameProviderImpls.ts';
import {
  parseLabels,
  parseThreshold,
  resolveCliPath,
  resolveFramePath,
  scorePredictions,
} from '../lib/frameEval.ts';
import type { Prediction, LabeledFrame } from '../lib/frameEval.ts';

type Args = {
  dir: string;
  labels: string;
  provider: string;
  threshold: number;
  json: boolean;
  allowContentHash: boolean;
};

function parseArgs(argv: string[]): Args {
  const a: Args = {
    dir: '',
    labels: '',
    provider: 'mock',
    threshold: 10,
    json: false,
    allowContentHash: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const val = argv[i + 1];
    if (flag === '--dir') a.dir = val;
    else if (flag === '--labels') a.labels = val;
    else if (flag === '--provider') a.provider = val;
    else if (flag === '--threshold') {
      try {
        a.threshold = parseThreshold(val);
      } catch (e) {
        console.error(e instanceof Error ? e.message : String(e));
        process.exit(2);
      }
    } else if (flag === '--json') a.json = true;
    else if (flag === '--allow-content-hash') a.allowContentHash = true;
    else if (flag === '--help') {
      console.log(
        'Usage: node eval/run.ts --dir <frames-dir> --labels <labels.csv> [--provider mock|openrouter|azure|local] [--threshold <bits>] [--json] [--allow-content-hash]'
      );
      process.exit(0);
    }
  }
  if (!a.dir || !a.labels) {
    console.error('Missing --dir or --labels. See --help.');
    process.exit(2);
  }
  return a;
}

/** Detect MIME from magic bytes (mirrors lib/screenshotScope.detectImage). */
function detectMime(bytes: Uint8Array): string | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return 'image/png';
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return 'image/jpeg';
  if (
    bytes.length >= 12 &&
    String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) === 'RIFF' &&
    String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) === 'WEBP'
  )
    return 'image/webp';
  return null;
}

/** Load sharp, failing loudly: a content hash has no perceptual meaning. */
async function loadSharp(allowContentHash: boolean) {
  try {
    return (await import('sharp')).default;
  } catch (e) {
    if (!allowContentHash) {
      console.error(
        `sharp failed to load (${e instanceof Error ? e.message : String(e)}). ` +
          'Perceptual de-duplication needs it; install dependencies, or pass ' +
          '--allow-content-hash to fall back to exact-duplicate detection only.'
      );
      process.exit(2);
    }
    console.error(
      'WARNING: sharp unavailable; using exact content hash. The --threshold ' +
        'Hamming distance has no perceptual meaning in this mode.'
    );
    return null;
  }
}

type Sharp = NonNullable<Awaited<ReturnType<typeof loadSharp>>>;

async function hashBytes(bytes: Uint8Array, sharp: Sharp | null) {
  if (sharp) {
    try {
      const { data, info } = await sharp(bytes)
        .resize(32, 32, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return ahashFromRaster(new Uint8Array(data), 32, 32, info.channels);
    } catch {
      // undecodable — fall through to content hash
    }
  }
  return contentHash(bytes);
}

async function main() {
  const args = parseArgs(process.argv);
  const labelsPath = resolveCliPath(args.labels);
  const dirPath = resolveCliPath(args.dir);

  const csvText = await readFile(labelsPath, 'utf8');
  const frames: LabeledFrame[] = parseLabels(csvText);

  let provider: FrameProvider;
  try {
    provider = resolveProvider(args.provider);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(2);
  }

  const sharp = await loadSharp(args.allowContentHash);
  const dedupe = new FrameDedupe(args.threshold);
  const predictions: Prediction[] = [];
  // Prediction for each unique (first-seen) frame, in dedupe registration order.
  const uniquePreds: Prediction[] = [];

  for (const frame of frames) {
    let bytes: Uint8Array;
    let mime: string | null;
    try {
      const filePath = resolveFramePath(dirPath, frame.file);
      bytes = new Uint8Array(await readFile(filePath));
      mime = detectMime(bytes);
    } catch {
      predictions.push({
        file: frame.file,
        verdict: null,
        label: frame.label,
        latencyMs: -1,
        costUsd: 0,
        provider: provider.name,
        reason: 'file missing, unreadable or outside frames dir',
      });
      continue;
    }
    if (!mime) {
      predictions.push({
        file: frame.file,
        verdict: null,
        label: frame.label,
        latencyMs: -1,
        costUsd: 0,
        provider: provider.name,
        reason: 'unsupported image format',
      });
      continue;
    }

    if (frame.label === 'skip') {
      // Skipped frames are excluded from scoring and must not enter the
      // dedupe set (a calibration frame must not suppress a later labeled one).
      predictions.push({
        file: frame.file,
        verdict: null,
        label: frame.label,
        latencyMs: 0,
        costUsd: 0,
        provider: provider.name,
        reason: 'skip',
      });
      continue;
    }

    const origIdx = dedupe.match(await hashBytes(bytes, sharp));
    if (origIdx >= 0) {
      // De-duplicated: no provider call; inherit the original frame's verdict
      // so the cost lever does not distort precision/recall.
      const orig = uniquePreds[origIdx];
      predictions.push({
        file: frame.file,
        verdict: orig.verdict,
        label: frame.label,
        latencyMs: 0,
        costUsd: 0,
        provider: provider.name,
        model: orig.model,
        duplicate: true,
        reason: `duplicate of ${orig.file} — skipped provider call`,
      });
      continue;
    }
    // Reserve this unique slot; filled in below by whichever path pushes.
    const slot = uniquePreds.length;
    uniquePreds.push(undefined as unknown as Prediction);

    const t0 = performance.now();
    let pred: Prediction;
    try {
      const assessment: FrameAssessment = await provider.assess(
        bytes,
        mime,
        `${frame.scope} ${frame.notes}`.trim()
      );
      pred = {
        file: frame.file,
        verdict: assessment.verdict,
        label: frame.label,
        latencyMs: performance.now() - t0,
        costUsd: assessment.costUsd ?? 0,
        provider: provider.name,
        model: assessment.model,
        reason: assessment.reason,
      };
    } catch (e) {
      pred = {
        file: frame.file,
        verdict: null,
        label: frame.label,
        latencyMs: performance.now() - t0,
        costUsd: 0,
        provider: provider.name,
        reason: e instanceof Error ? e.message : String(e),
      };
    }
    predictions.push(pred);
    uniquePreds[slot] = pred;
  }

  const metrics = scorePredictions(
    predictions.filter((p) => p.label !== 'skip')
  );

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          provider: provider.name,
          dedupe_threshold: args.threshold,
          metrics,
          predictions,
        },
        null,
        2
      )
    );
  } else {
    console.log(`\nProvider: ${provider.name}`);
    console.log(
      `Frames labeled: ${metrics.n}  deduped: ${metrics.deduped}  errored: ${metrics.errored}`
    );
    console.log(
      `Precision: ${metrics.precision == null ? 'n/a' : (metrics.precision * 100).toFixed(1) + '%'}`
    );
    console.log(
      `Recall (coverage): ${metrics.recall == null ? 'n/a' : (metrics.recall * 100).toFixed(1) + '%'}`
    );
    console.log(
      `Abstain rate: ${metrics.abstain_rate == null ? 'n/a' : (metrics.abstain_rate * 100).toFixed(1) + '%'}`
    );
    console.log(
      `Avg latency: ${metrics.avg_latency_ms == null ? 'n/a' : metrics.avg_latency_ms.toFixed(0) + ' ms'}`
    );
    console.log(
      `Total cost: $${metrics.total_cost_usd.toFixed(4)}  (per frame $${(metrics.per_frame_cost_usd ?? 0).toFixed(4)})`
    );
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
