/**
 * Frame provider adapter interface.
 *
 * The harness assesses a still frame against a binary "slop" question and may
 * abstain when it cannot tell. A provider is any backend that can turn an
 * image into a {@link FrameAssessment}. The interface keeps the evaluation
 * loop agnostic to which backend is used, so the same labeled set can be run
 * against OpenRouter, Azure OpenAI or a local vision model without touching
 * the harness.
 *
 * The DEFAULT is the mock provider: it makes no network call and derives a
 * deterministic verdict from the image hash, so tests and dry-runs never
 * egress. Real providers must be explicitly selected with a CLI flag and will
 * refuse to run without an API key / endpoint, so a labeled run is impossible
 * to accidentally send to a paid backend.
 */

import type { Assessment, Verdict } from './screenshotScope.ts';

export type FrameProvider = {
  /** Stable, human-readable identifier (used in results). */
  readonly name: string;
  /**
   * Assess a single frame's bytes. Providers that require credentials or an
   * endpoint throw an Error explaining what is missing; they must not fall
   * back to a silently different behavior.
   */
  assess(
    bytes: Uint8Array,
    mime: string,
    context: string
  ): Promise<FrameAssessment>;
};

export type FrameAssessment = {
  /** Reused verdict space from the screenshot layer: slop | not_slop | uncertain. */
  verdict: Verdict;
  /** Short, bounded explanation of the verdict. */
  reason: string;
  /** Optional provider-reported confidence in [0, 1]. */
  confidence?: number;
  /** Optional per-call cost estimate in USD, when the provider can report it. */
  costUsd?: number;
  /** Model identifier the provider actually used (for auditability). */
  model?: string;
};

/** A minimal, always-available provider: deterministic, no network, no key. */
export const mockProvider: FrameProvider = {
  name: 'mock',
  async assess(bytes: Uint8Array): Promise<FrameAssessment> {
    // Deterministic signal: the mock is only for wiring/type-checking the
    // harness, so a reproducible hash of the bytes is the honest input.
    let acc = 0;
    for (const b of bytes) acc = (acc * 31 + b) >>> 0;
    const bucket = acc % 3;
    const verdict: Verdict =
      bucket === 0 ? 'not_slop' : bucket === 1 ? 'slop' : 'uncertain';
    return {
      verdict,
      reason: 'mock provider (deterministic hash), no vision model was called',
      confidence: 0.5,
      costUsd: 0,
      model: 'mock',
    };
  },
};

/**
 * Return the internal assessment verdict interpreted as a slop/non-slop
 * decision when combined with a label. ``uncertain`` maps to "abstain".
 */
export function verdictFromAssessment(
  a: FrameAssessment | Assessment
): Verdict {
  return a.verdict;
}
