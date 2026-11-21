# Evaluation harness (scaffold)

Status: scaffold only. There are no real screenshot captures and no measured
results yet, so this repo makes no accuracy claim.

`fixtures.json` lists the planned human-labeled cases (expected scope chosen by
a human annotator), grouped by difficulty:

- easy: prominent image vs article
- unclear: illegible or ambiguous captures (the right answer is to abstain,
  i.e. scope `auto`)
- adversarial: on-page text that tries to steer the model

The screenshots themselves still have to be captured and labeled by a person.
Do not fill predictions with invented values.

## Running

1. Capture real screenshots, add them under `eval/images/` (git-ignored if they
   contain private content) and label them in `fixtures.json`.
2. Run each through the endpoint (needs owner-approved paid calls) and write
   `eval/results.json` using the shape in `results.example.json`
   (`predicted_scope` is `image`, `article`, `whole`, `auto` or `null`
   for an unparseable response).
3. `node eval/score.mjs` prints precision, recall and abstention overall and by
   difficulty group.

Definitions: precision is correct committed answers over committed answers;
recall is correct committed answers plus correct abstentions over all fixtures;
abstention is the share
of `auto` predictions, with `correct_abstention` counting those where `auto`
was the expected label.

## Frame evaluation harness (streaming frames)

A second harness assesses still frames/thumbnails (for the Converge streaming
spike) rather than full screenshots. It lives alongside this one:

```text
node eval/run.ts --dir <frames-dir> --labels <labels.csv> \
  [--provider mock|openrouter|azure|local] [--threshold <bits>] [--json]
```

- Inputs a directory of images plus a labels CSV (`file,label,scope,notes` with
  `label ∈ slop|not_slop|skip`).
- De-duplicates near-identical frames by perceptual hash before any provider
  call (the main cost lever for a repeating video feed).
- Defaults to `mock` (no network, no key); real providers (`openrouter`,
  `azure`, `local`) fail closed without credentials.
- Reports precision, recall, abstain rate, latency and estimated cost.

Full details, the provider/privacy model, and the current (unmeasured) status are
in `docs/frame-eval-harness.md`. Note: frame labels are binary, so an
`uncertain` verdict is scored as a non-answer (lowering recall coverage) rather
than as a "correct abstention" — unlike the scope harness above, whose
`expected_scope` can be `auto`.
