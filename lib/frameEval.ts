/**
 * Labeled-frame I/O and evaluation metrics.
 *
 * A labeled set is a CSV with columns `file,label,scope,notes`:
 *   - `file`: path to the image, relative to the run directory
 *   - `label`: the ground-truth class, one of `slop` | `not_slop` | `skip`
 *   - `scope`: free text describing what the frame depicts (carried to context)
 *   - `notes`: annotation notes (carried through, not used for scoring)
 *
 * `label=skip` marks a frame that should be excluded from scoring (e.g. a
 * calibration image) but still hashed and reported for dedupe transparency.
 *
 * Prediction records pair each labeled file with a provider verdict plus
 * latency and cost; scoring computes precision, recall (counting a correct
 * abstention as correct, matching the screenshot eval convention), abstain
 * rate, unparseable rate, per-frame latency and cost.
 */

import type { Verdict } from './screenshotScope.ts';

export type Label = 'slop' | 'not_slop' | 'skip';
export type LabeledFrame = {
  file: string;
  label: Label;
  scope: string;
  notes: string;
};

export type Prediction = {
  file: string;
  /** Predicted verdict: slop | not_slop | uncertain (uncertain = abstain). */
  verdict: Verdict | null; // null = provider error / unparseable
  label: Label;
  latencyMs: number;
  costUsd: number;
  provider: string;
  model?: string;
  reason?: string;
  duplicate?: boolean;
};

export type Metrics = {
  n: number;
  deduped: number;
  errored: number;
  precision: number | null;
  recall: number | null;
  abstain_rate: number | null;
  avg_latency_ms: number | null;
  total_cost_usd: number;
  per_frame_cost_usd: number | null;
  decided: number;
  correct: number;
};

/** Parse a labels CSV. Throws on malformed rows; never fabricates labels. */
export function parseLabels(csvText: string): LabeledFrame[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) throw new Error('Labels CSV is empty');
  const header = lines[0].split(',').map((c) => c.trim().toLowerCase());
  const idx = {
    file: header.indexOf('file'),
    label: header.indexOf('label'),
    scope: header.indexOf('scope'),
    notes: header.indexOf('notes'),
  };
  if (idx.file < 0 || idx.label < 0)
    throw new Error("Labels CSV must have 'file' and 'label' columns");
  const frames: LabeledFrame[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const file = cols[idx.file]?.trim();
    const label = cols[idx.label]?.trim().toLowerCase();
    if (!file) throw new Error(`Row ${i + 1}: missing file`);
    if (!['slop', 'not_slop', 'skip'].includes(label))
      throw new Error(
        `Row ${i + 1}: label must be slop|not_slop|skip, got '${label}'`
      );
    const scopeCol = idx.scope >= 0 ? cols[idx.scope] : undefined;
    const notesCol = idx.notes >= 0 ? cols[idx.notes] : undefined;
    frames.push({
      file,
      label: label as Label,
      scope: scopeCol?.trim() || '',
      notes: notesCol?.trim() || '',
    });
  }
  return frames;
}

/** Minimal CSV line splitter that honors double quotes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

/** Score a set of predictions against their labels. */
export function scorePredictions(preds: Prediction[]): Metrics {
  const n = preds.length;
  const committed = preds.filter(
    (p) => p.verdict === 'slop' || p.verdict === 'not_slop'
  );
  const decided = committed.length;
  const correct = committed.filter((p) => p.verdict === p.label).length;
  const abstained = preds.filter((p) => p.verdict === 'uncertain').length;
  const errored = preds.filter((p) => p.verdict === null).length;
  const deduped = preds.filter((p) => p.duplicate).length;
  const latencies = preds
    .filter((p) => p.latencyMs >= 0)
    .map((p) => p.latencyMs);
  const totalCostUsd = preds.reduce((s, p) => s + (p.costUsd || 0), 0);

  return {
    n,
    deduped,
    errored,
    precision: decided === 0 ? null : correct / decided,
    // Recall = correct committed decisions over every labeled (non-skip) frame.
    // An abstention is a non-answer, so it pulls recall down — the honest cost
    // of the model not committing is reflected here, not hidden.
    recall: n === 0 ? null : correct / n,
    abstain_rate: n === 0 ? null : abstained / n,
    avg_latency_ms:
      latencies.length === 0
        ? null
        : latencies.reduce((s, v) => s + v, 0) / latencies.length,
    total_cost_usd: totalCostUsd,
    per_frame_cost_usd: n === 0 ? null : totalCostUsd / n,
    decided,
    correct,
  };
}
