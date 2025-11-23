# Slop Detector · Copilot Field Notes

## Architecture snapshot
- Next.js 16 App Router project (`app/`) with a single client page (`app/page.tsx`) that calls serverless route handlers under `app/api/*`.
- Core scoring logic lives in pure TypeScript modules inside `lib/`, so it can run both server-side (API) and client-side (when AI consensus is off).
- Optional AI "consensus" flow enriches the internal score by orchestrating provider calls (`lib/aiConsensus.ts` + `lib/aiProviders.ts`).
- No database: API routes are stateless and simply transform request payloads.

## Files you will touch most
- `lib/slopDetector.ts` — deterministic scoring functions. Each factor pushes human-friendly messages into `details`; update `lib/__tests__/slopDetector.test.ts` whenever you tweak weights, phrases, or helper functions.
- `lib/aiConsensus.ts` — glues provider calls together, normalizes weights, and blends the internal score with consensus output. Use `performAIConsensus` + `enrichWithAI` instead of rolling custom blends.
- `lib/aiProviders.ts` — concrete provider adapters. Only allow provider names defined in `PROVIDER_IMPLEMENTATIONS`; new providers must follow that registry pattern and respect env-key lookups.
- `app/api/ai-analyze/route.ts` — POST endpoint used by the UI. It validates content, performs internal scoring up front, normalizes any custom weights (summing to 1), and degrades gracefully by returning internal results plus `warning` when AI calls fail.
- `app/api/youtube/route.ts` — wraps `youtube-transcript`. Always go through `extractVideoId()` to support `watch`, `youtu.be`, `embed`, and bare IDs.
- `app/page.tsx` — only place that mutates UI state. When adding features, keep heavy work in libraries and call `/api/*` endpoints via `fetch` inside `handleAnalyze*` helpers.

## Development & verification
- Install & run: `npm install`, `npm run dev`. Production parity: `npm run build && npm start`.
- Quality gates: `npm run lint`, `npm run format`, and `npm test` (Jest 30 + React Testing Library). Coverage when touching scoring logic: `npm run test:coverage`.
- Docs use MkDocs Material; preview via `pip install -r requirements.txt` once, then `mkdocs serve` or `npm run docs:serve`.

## Environment & secrets
- Internal scoring works offline, but AI providers require env vars: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, and optional `NEXT_PUBLIC_DEFAULT_AI_PROVIDER` for the UI toggle.
- Provider configs supplied by users are merged onto `DEFAULT_AI_CONFIG`; never trust raw `provider.name`—sanitize/validate before invoking implementations (see `analyzeWithNamedProvider`).

## Patterns & gotchas
- Any new detection heuristic should add a friendly `details.push(...)` message so the UI can surface it without further work.
- Keep response JSON small: truncate or sanitize large user input via `createSlopAnalysisPrompt` (already caps at 10k chars and escapes `"""`). Follow that pattern if you create new prompts.
- When tweaking weight math, remember `app/api/ai-analyze/route.ts` rebalances weights to sum to 1; align client expectations (UI shows both internal + AI numbers when `finalScore` exists).
- The YouTube transcript endpoint assumes captions exist; propagate descriptive 4xx errors for invalid URLs and reserve 5xx for transcript failures to match current UI handling.
- Client-side analysis path (`useAI === false`) calls `analyzeSlopContent` directly—keep that function safe for browser execution (no Node-only APIs).

## Azure AKS + Istio deployment
- Kubernetes manifests live in `k8s/apps/slop-detector/base/` (deployment, service, Istio gateway, virtual service, kustomization).
- Default subdomain: `slop.cat-herding.net`, container port: `3000`, ACR: `gabby.azurecr.io/slop-detector`.
- Use `kubectl apply -k k8s/apps/slop-detector/base` to deploy; validates with `kubectl kustomize` first.
- TLS cert secret `slop-tls` required (via cert-manager or manual); API keys stored in `slop-detector-secrets` K8s secret.
- See `docs/azure-deployment.md` for full DNS setup, certificate config, deployment steps, monitoring, and troubleshooting.

## Documentation breadcrumbs
- User-facing behavior lives in `docs/*.md` (MkDocs). Update `docs/api-reference.md` when you adjust scoring logic, and `docs/ai-consensus.md` if you add providers or change consensus behavior.
- Azure deployment guide in `docs/azure-deployment.md` covers AKS + Istio setup, DNS config, TLS certs, and operational procedures.
- High-level onboarding, workflows, and screenshots live in `README.md`; mirror any notable workflow changes there so new contributors and AI helpers stay in sync.
