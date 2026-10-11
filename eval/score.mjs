#!/usr/bin/env node
// Evaluation harness for the screenshot scope-assessment MVP.
//
// Consumes eval/results.json (a list of prediction records produced by running
// each labeled fixture through the scope decision layer) and computes, per
// difficulty group and overall: precision, recall and abstention, where
//   - "correct" means predicted_scope === expected_scope,
//   - "abstention" means predicted_scope === "auto" (the model asked for
//     clarification instead of committing to image/article).
//
// Nothing here is a synthetic verdict: numbers are only as good as the
// human-labeled fixtures and the real predictions in results.json.
//
// A predicted_scope of null records a missing/unparsable model response and is
// counted separately as "unparseable", never as correct or abstention.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const resultsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'results.json'
);
if (!fs.existsSync(resultsPath)) {
  console.error(
    'No eval/results.json found. Add real prediction records first.'
  );
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

const groups = new Map();
for (const r of rows) {
  const key = r.difficulty || 'unknown';
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(r);
}

function summarize(name, list) {
  const total = list.length;
  const correct = list.filter(
    (r) =>
      r.predicted_scope !== 'auto' && r.predicted_scope === r.expected_scope
  ).length;
  const abstained = list.filter((r) => r.predicted_scope === 'auto').length;
  const unparseable = list.filter((r) => r.predicted_scope == null).length;
  const decided = total - abstained - unparseable;
  const correctAbstention = list.filter(
    (r) => r.predicted_scope === 'auto' && r.expected_scope === 'auto'
  ).length;
  return {
    name,
    n: total,
    precision: decided === 0 ? null : correct / decided,
    recall: total === 0 ? null : correct / total,
    abstention: total === 0 ? null : abstained / total,
    correct_abstention: correctAbstention,
    unparseable,
  };
}

const out = {
  overall: summarize('overall', rows),
  by_group: [...groups.entries()].map(([k, v]) => summarize(k, v)),
};

process.stdout.write(JSON.stringify(out, null, 2) + '\n');
