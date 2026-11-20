import { parseLabels, scorePredictions } from '../frameEval';
import type { Prediction } from '../frameEval';

describe('parseLabels', () => {
  test('parses a valid CSV', () => {
    const csv =
      'file,label,scope,notes\na.png,slop,art,low effort\nb.png,not_slop,footage,real\n';
    const frames = parseLabels(csv);
    expect(frames).toHaveLength(2);
    expect(frames[0]).toEqual({
      file: 'a.png',
      label: 'slop',
      scope: 'art',
      notes: 'low effort',
    });
  });

  test('tolerates quoted commas', () => {
    const csv = 'file,label,scope,notes\na.png,slop,"AI, art",note\n';
    expect(parseLabels(csv)[0].scope).toBe('AI, art');
  });

  test('rejects unknown labels', () => {
    const csv = 'file,label,scope,notes\na.png,maybe,art,\n';
    expect(() => parseLabels(csv)).toThrow(/label must be/);
  });

  test('rejects a header missing required columns', () => {
    expect(() => parseLabels('file,scope\na.png,x\n')).toThrow(/file.*label/);
  });
});

describe('scorePredictions', () => {
  function pred(
    file: string,
    verdict: string | null,
    label: string,
    extra: Partial<Prediction> = {}
  ): Prediction {
    return {
      file,
      verdict: verdict as Prediction['verdict'],
      label: label as Prediction['label'],
      latencyMs: 100,
      costUsd: 0.01,
      provider: 'mock',
      ...extra,
    };
  }

  test('perfect predictions give precision/recall 1.0 and no abstention', () => {
    const m = scorePredictions([
      pred('a.png', 'slop', 'slop'),
      pred('b.png', 'not_slop', 'not_slop'),
    ]);
    expect(m.precision).toBe(1);
    expect(m.recall).toBe(1);
    expect(m.abstain_rate).toBe(0);
    expect(m.correct).toBe(2);
  });

  test('one wrong committed prediction drops precision and recall', () => {
    const m = scorePredictions([
      pred('a.png', 'slop', 'slop'),
      pred('b.png', 'slop', 'not_slop'), // wrong
    ]);
    expect(m.precision).toBe(0.5);
    expect(m.recall).toBe(0.5);
  });

  test('an abstention lowers recall and raises abstain rate', () => {
    const m = scorePredictions([
      pred('a.png', 'slop', 'slop'),
      pred('b.png', 'uncertain', 'not_slop'), // abstain
    ]);
    expect(m.abstain_rate).toBe(0.5);
    expect(m.recall).toBe(0.5); // only 1 of 2 answered correctly
    expect(m.precision).toBe(1); // of committed, all correct
  });

  test('null verdicts are counted as errors, excluded from precision', () => {
    const m = scorePredictions([
      pred('a.png', 'slop', 'slop'),
      pred('b.png', null, 'not_slop'),
    ]);
    expect(m.errored).toBe(1);
    expect(m.precision).toBe(1);
  });

  test('averages latency and sums cost', () => {
    const m = scorePredictions([
      pred('a.png', 'slop', 'slop', { latencyMs: 100, costUsd: 0.5 }),
      pred('b.png', 'not_slop', 'not_slop', { latencyMs: 300, costUsd: 0.5 }),
    ]);
    expect(m.avg_latency_ms).toBe(200);
    expect(m.total_cost_usd).toBeCloseTo(1.0);
    expect(m.per_frame_cost_usd).toBeCloseTo(0.5);
  });
});
