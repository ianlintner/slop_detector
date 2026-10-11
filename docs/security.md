# Screenshot endpoint security & threat model

The `/api/screenshot` route sends user-uploaded image bytes to a paid vision
provider (OpenRouter, pinned to `openai/gpt-4.1-mini`). Because it spends money
and forwards untrusted bytes, it is gated by three independent controls and
fails closed when the tokens or the spend cap are not configured (the rate
limit has a default of 10/hour).

## Controls

1. **Bearer-token authentication** (`lib/accessControl.ts`). Requests must send
   `Authorization: Bearer <token>`. Tokens come from the
   `SCREENSHOT_ACCESS_TOKENS` env var as `user:token` pairs. Only SHA-256
   digests are held in memory; comparison is constant-time across every
   configured user so timing does not reveal which entry matched.
2. **Sliding-window rate limit.** Each authenticated user is capped at
   `SCREENSHOT_RATE_LIMIT_PER_HOUR` requests/hour (default 10). The 429 response
   carries a `Retry-After` header.
3. **Hard daily spend cap.** `SCREENSHOT_DAILY_SPEND_CAP_USD` bounds total
   provider spend per UTC day. The estimated per-request cost
   (`SCREENSHOT_ESTIMATED_COST_USD`, default 0.01) is _reserved before_ the
   provider is called and is never refunded, so a failed provider call still
   counts. Requests rejected earlier (400/413/415) do not. The cap bounds
   estimated spend (`SCREENSHOT_ESTIMATED_COST_USD`), not billed spend: set the
   estimate at or above the worst-case per-request cost.

State lives in process memory: rate-limit windows and the spend ledger reset on
restart and are per-instance. If the endpoint is scaled to more than one
instance, move them to a shared store (Redis with atomic counters) so the locks
bind across replicas.

## Upload validation

The route never trusts the filename or `Content-Type`. It reads magic bytes and
then structurally validates the image header (see `lib/imageValidation.ts`),
recovering real dimensions for PNG, JPEG, and WebP. This rejects:

- files whose detected type does not match the declared MIME type;
- truncated or garbage files with no valid size header;
- images over 8000 px per side or 40 Mpx, which blocks decompression-bomb-sized
  canvases before any pixel decoding happens.

Combined with the existing 5 MB byte cap, uploads are small, header-validated (dimensions only; pixels are never decoded) and
known-dimensioned before they reach the provider.

## Prompt-injection hardening

The screenshot and user context are treated as untrusted data inside the vision
prompt (`lib/screenshotScope.ts`): the context is serialized as JSON and the
prompt explicitly instructs the model to ignore instructions embedded in the
image or context. The parsed response is validated against a strict schema
(target/verdict/reason/evidence/question with length and shape limits), and a
model cannot silently substitute a subject other than the one the user selected
(`Scope mismatch` reject).

## Retention, deletion and consent

- The server does not persist uploads, context or provider responses. Image
  bytes live in request memory only and are dropped when the request ends. The
  route never logs them.
- Consent is explicit and per request: the UI checkbox is required and the API
  rejects a missing `consent=yes` with 400 before any provider call.
- Because nothing is stored here, there is nothing to delete on this side.
  OpenRouter and the upstream OpenAI provider have their own retention terms;
  `data_collection: deny` is a routing preference, not a guarantee.
- Access-control and rate-limit state hold only user ids, token digests,
  request timestamps and a spend counter, all in memory.

## Image editing (not implemented; design constraint)

No image-editing code exists. If added, it must be: (a) triggered only by an
explicit user request, never as part of the assessment call; (b) a separate
endpoint behind the same auth, rate limit and spend cap; and (c) non-destructive,
returning a new derived image and never overwriting or replacing the original
upload. The assessment response must not contain edit suggestions.

## Acceptances & residual risk

- The remaining transitive `braces` DoS advisory chain (via eslint → minimatch →
  brace-expansion and via eslint-config-next → fast-glob → micromatch → braces)
  is dev-only: it runs at build/lint time, not at runtime, and upstream has not
  published a patched release above the vulnerable range. `brace-expansion` is
  overridden to a patched version; the rest are documented and accepted here.
- In-memory limits do not survive a restart and are not shared across
  instances. Acceptable for a single-instance deployment; scale-out needs a
  shared store.
