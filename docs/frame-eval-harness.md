# Frame evaluation harness — spike findings

Status: **harness built; labeled Converge data not yet available.**

This spike answers one question: _can the screenshot assessment layer evaluate
still frames/thumbnails from the internal streaming service (Converge), and what
would it cost and expose before any integration?_ The answer is a working,
tested harness plus a set of open measurements that need owner input — not real
accuracy numbers yet.

## What was built

A standalone, local CLI (no web route, no network by default):

```text
node eval/run.ts --dir <frames-dir> --labels <labels.csv> \
  [--provider mock|openrouter|azure|local] [--threshold <bits>] [--json]
```

- **Input:** a directory of images plus a labels CSV (`file,label,scope,notes`,
  `label ∈ slop | not_slop | skip`).
- **Pre-filter:** a perceptual (average) hash with Hamming-distance
  de-duplication (`lib/frameHash.ts`) so near-identical frames are skipped
  _before_ any provider call — this is the primary cost lever for a streaming
  feed where many thumbnails repeat.
- **Provider adapter** (`lib/frameProviders.ts`, `lib/frameProviderImpls.ts`):
  `mock` (default, deterministic, zero-cost, no egress), `openrouter` (pinned to
  the screenshot MVP's model + `allow_fallbacks: false`, `data_collection: deny`),
  `azure` (Azure OpenAI chat-completions shape), and `local` (any
  OpenAI-compatible local vision endpoint, defaults to `127.0.0.1`). Real
  providers **fail closed** — no API key/endpoint, no request.
- **Metrics** (`lib/frameEval.ts`): precision, recall, abstain rate, per-frame
  latency, and estimated cost.

The mock provider exists to prove the wiring. It returns a verdict derived from a
byte hash, so **it tells you nothing about real slop quality**. Only a real
provider over labeled frames yields meaningful numbers.

## Measurement status (honest)

| Quantity                     | Status                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------- |
| Precision / recall / abstain | **Not measured** — no labeled Converge frames supplied yet                      |
| Cost per frame               | **Not measured** — depends on the provider's pricing and confirmed payload size |
| Latency per frame            | **Not measured** — depends on the deployed provider                             |
| Privacy                      | Assessed below (no egress by default; internal content needs approval)          |

**Labeled Converge data is not yet available.** Until Ian supplies 50–100
representative frames with labels and approves which provider may see them, this
repo makes no accuracy or cost claim. The harness is ready to produce those
numbers the moment the labeled set lands; the `--json` flag emits a
machine-readable result for diffing across providers.

## Privacy fit

- **Default is no egress.** `mock` never opens a socket. Tests never egress either.
- **Pinned routing.** The OpenRouter adapter reuses the screenshot MVP's
  `data_collection: deny` and `allow_fallbacks: false`, so a frame never goes to
  an arbitrary fallback model or a data-training pool.
- **Local-first option.** `local` targets a self-hosted endpoint, so internal
  Converge content can be assessed without leaving the enclosure. This is the
  recommended path for internal frames; OpenRouter/Azure should be held for
  content the owner explicitly approves for those providers.
- **No secrets.** Providers read keys/endpoints from environment variables and
  never write them to a file or log.

## Video sampling approach

The harness assesses still frames. For a stream, sample rather than assessing
every frame: extract one keyframe per _N_ seconds (or on scene change) and run
frames through the same pipeline. The pHash de-duplicator is the natural fit for
this — scene-similar frames collapse and are not re-sent to a paid provider.
Recommended flow:

1. Decode the stream to keyframes into a frame directory.
2. Generate a labels CSV by hand-labeling each keyframe.
3. Run the harness with `mock` first to sanity-check dedupe, then with the
   approved provider (default `local` for internal content).

## Known limitations

- **aHash flats collapse.** Two solid/flat frames (all-black vs all-white) hash
  identically because every sample ties the average. This is deliberate: flat
  frames are treated as "blank/placeholder" and grouped together for dedupe.
- **Standalone CLI warns about module type.** Running `node eval/run.ts` directly
  prints a `MODULE_TYPELESS_PACKAGE_JSON` reparse hint (the repo root has no
  `"type": "module"`). It is cosmetic and does not affect Jest or the Next build.
- **No "correct abstention" label.** Unlike `eval/score.mjs` (scope MVP), the
  frame labels are binary `slop`/`not_slop`, so an `uncertain` verdict cannot be
  scored as "correct" — it is counted as a non-answer that lowers recall
  coverage. If "this frame should abstain" becomes a first-class label, the
  scoring can be aligned with `score.mjs`'s convention.

## Next steps (owner inputs needed)

1. Converge repo/API location, and what "slop" means for that stream.
2. 50–100 representative frames + labels, plus provider approval for internal
   content (recommend `local` for internal data).
3. Re-run with the approved provider and record measured precision/recall,
   latency, and cost into these findings.
