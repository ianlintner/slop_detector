# Screenshot MVP

The existing text and YouTube tools remain available. The screenshot panel adds a separate, explicit-consent path for PNG/JPEG/WebP (5 MB maximum). The browser cannot capture another app or tab on demand: take a screenshot with the device's normal screenshot tool and upload it. Select the prominent image, visible article text, or whole page; `auto` uses the optional note but **asks for clarification** when image-vs-text intent is ambiguous. Unreadable or out-of-frame content should return `uncertain` instead of a confident verdict.

## Run

```bash
npm ci
OPENAI_API_KEY=your-server-side-key npm run dev
# open http://localhost:3000
npm test -- --runInBand
npm run lint
npm run build
```

`SLOP_VISION_MODEL` optionally overrides the default `gpt-4.1-mini` (use a vision-capable OpenAI chat-completions model supporting JSON mode). The key is server-only; do not set `NEXT_PUBLIC_` on it. With no key, the screenshot API returns 503 rather than a mock verdict. The API never logs image bytes, context or provider response. The image and note go to OpenAI only after the user checks the consent box; do not upload confidential material. This is not a privacy-preserving deployment, and a public production deployment needs authentication, rate limiting and a spend cap before accepting strangers' uploads.

## Decision contract

The vision model separates page layout, prominent imagery and visible text, then returns `target`, `slop|not_slop|uncertain`, short evidence, and a clarification question. The server validates the output and rejects a subject mismatch; no numerical score or AI-authorship claim is inferred. The current text heuristic and optional AI consensus are _separate_ tools with different criteria, not comparable calibration. A screenshot does not reveal the whole article, article provenance, or video content.

This is a narrow router: explicit user scope takes priority; auto scope asks for clarification when the vision model _recognizes_ ambiguity, but cannot guarantee detection of every ambiguous page. Select a target explicitly when precision matters. Untrusted screenshot text and notes can still influence the model despite prompt-injection instructions; treat the verdict as advisory. Jev/System One is a candidate _shadow_ decision layer for the typed slop/intent judgment after a separate consented vision/OCR extraction stage—not a vision or image-editing engine. Before enabling it, define allowlisted visual features/text sent to Jev, compare against consented human labels and measure abstention, false positives, provider cost and latency. No screenshot or extracted text is currently sent to Jev. Video frame sampling, OCR, editing, browser extension capture and evaluation harness are follow-ups, not implemented here.
