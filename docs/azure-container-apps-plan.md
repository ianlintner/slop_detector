# Azure deployment plan (review proposal)

## Decision

Host the existing Next.js app on **Azure Container Apps (Consumption)**, not Azure Functions. This preserves the web UI and Node route handlers (multipart image upload, YouTube transcript, AI analysis). Set `output: 'standalone'`, ship a small non-root Node image, and run one replica maximum for the first private preview. Functions would require splitting/rehosting the full web app and are not the smallest change.

Live inventory checked before this plan: `ianlintner/slop_detector` is public; current `main` has no Dockerfile or real health endpoint, only an illustrative Docker snippet in `docs/deployment.md`. Azure subscription `79307c77-54c3-4738-be2a-dc96da7464d9` has a healthy Consumption-capable Container Apps environment `bigboy-hosted-env-eus2` in `bigboy-hosted-rg`, East US 2, already hosting `oauth2-staging` and `oauth2-prod`. Reuse its environment for a _separate_ Slop Detector app/identity initially; do not alter the OAuth apps, their ingress, secrets or DNS. Validate environment profile and quota before applying. No Azure changes are authorized by this document.

## Gates in order

1. **Security baseline and policy (#16 / PR #19).** Review and integrate the current hardening PR before a staging image. Its in-memory per-user limiter and daily spend reservation are **not durable hard caps** across restarts, scale-to-zero, revisions or replicas. Keep `maxReplicas: 1` for preview, require a _separate OpenRouter key with an enforced dollar limit_, and test exhaustion/fail-closed behavior; never use the shared Hermes key in Azure. Protect **all routes**, including `/api/ai-analyze` and `/api/youtube`, and audit error logging/response details for request content or provider data. A full-app sign-in gate should precede external ingress; an API bearer token alone does not protect the UI or those routes. Do not present the unfilled evaluation scaffold as measured accuracy.
2. **Image/package.** Add `output: 'standalone'`, multi-stage pinned Node runtime Dockerfile, `.dockerignore`, non-root user, copied `public` and `.next/static`, real `/api/health` endpoint, and a local container smoke for UI, assets, unauthorized API, bounded upload and provider-disabled path. Build without secrets; no tokens in layers. Replace the stale Docker example/inaccurate environment guidance in `docs/deployment.md`. CI must build and test the image, and the registry publish must use an immutable commit-SHA tag. Prefer GHCR for this public source unless image access or policy requires ACR. Check IkitClaw App Workflows and Packages permissions before adding publish workflow files; do not publish with personal credentials as a fallback.
3. **Private staging on ACA.** IaC for a separate `slop-detector-preview` app in the existing environment; system/user-assigned managed identity, Key Vault secret reference for a _dedicated_ budget-limited OpenRouter key, `minReplicas: 0`, `maxReplicas: 1`, modest CPU/memory and concurrency, no public DNS. Create internal ingress first; enable and verify Microsoft Entra built-in authentication (restricted tester access, unauthenticated denied) before exposing the default HTTPS FQDN. If the existing environment's security policy disallows shared tenancy, price a separate Consumption environment before provisioning. Never carry the local `~/.hermes/.env` or hard-code secrets into IaC. Use ACA platform metrics and bounded logs, not a new observability stack.
4. **Staging verification and rollback.** Read back app revision, image digest, identity/Key Vault binding and auth settings. Probe unauthenticated UI and _each_ API route (no paid calls), sign in as an allowed tester, then run one synthetic screenshot through the published endpoint with explicit consent. Check image/notes never enter logs; verify 5 MB/type/pixel bounds, concurrency, 429, budget exhaustion, provider outage/timeout, scale-from-zero, secret rotation and previous-revision rollback. Verify the OpenRouter key's live limit separately. Re-run npm audit for runtime dependencies and record remaining accepted dev-only advisories. No external announcement or open public upload until human-labeled evaluation and owner sign-off.
5. **Evaluation/public-access decision.** Ian or another human captures/labels consented representative screenshots (prominent image versus article versus whole page, ambiguous/illegible/adversarial). Run the labeled set with the dedicated capped key; report precision/recall, false positives/negatives, abstention, cost and latency by scope, without claiming AI-authorship detection. Decide whether to retain a sign-in-only preview, open limited public access with shared durable abuse controls, or stop. Video/image editing/Jev remain separate future work.

## Cost and risk guardrails

Consumption can scale to zero, but cold starts, request CPU/memory, image registry storage, Log Analytics ingestion, Key Vault, network egress, and OpenRouter usage remain billable; no fixed monthly estimate is asserted without measured traffic/retail prices. A dedicated key's provider-enforced dollar ceiling is the emergency spend boundary; app in-memory counters are advisory defense-in-depth. Set budget alerts, cap replicas and image size, and keep no uploaded media on disk. Retention and telemetry must be verified with the real staging configuration, not inferred from code.

## Review and sequencing

Open one feature PR per gate, with CI plus independent exact-head review; request `ianlintner` as GitHub reviewer on every security, package and Azure/IaC PR that needs a decision. No automatic merge or external deployment from a draft PR. Packaging and deployment worktrees must start from a main branch containing the accepted #19 security changes; a kanban `done` marker alone is not integration proof. Track stages on the dedicated `slop-detector` board and GitHub issues: security baseline [#16](https://github.com/ianlintner/slop_detector/issues/16) / [PR #19](https://github.com/ianlintner/slop_detector/pull/19), package [#20](https://github.com/ianlintner/slop_detector/issues/20), access and spend [#21](https://github.com/ianlintner/slop_detector/issues/21), restricted ACA preview [#22](https://github.com/ianlintner/slop_detector/issues/22), and labeled evaluation [#23](https://github.com/ianlintner/slop_detector/issues/23). Release only the first safe task at a time; owner approval gates remain blocked until evidence is read back.

### References

- [Azure Container Apps Consumption profiles](https://learn.microsoft.com/en-us/azure/container-apps/workload-profiles-overview)
- [Container Apps built-in Entra authentication](https://learn.microsoft.com/en-us/azure/container-apps/authentication-entra)
- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [OpenRouter API-key spending limits](https://openrouter.ai/docs/api/api-reference/api-keys/create-keys)

## Restricted preview: auth and spend specification (not applied)

This section specifies, without provisioning, the preview access and spend
controls for the legacy analysis routes (`/api/ai-analyze`, `/api/youtube`)
and `/api/screenshot`. It is a written target for Gate 3 (#22), not a deployed
configuration; nothing here is applied until that gate's owner-approved PR.

### Application-level gate (`lib/previewGate.ts`)

When `RESTRICTED_PREVIEW` is `1` or `true`, the gated routes require
`X-MS-CLIENT-PRINCIPAL-ID` (injected by ACA built-in Entra auth after sign-in)
and answer `401 Authentication required.` otherwise. When the flag is unset,
the routes behave as before for local development. The header is a defense-in-
depth confirmation only: it is authoritative solely because the platform gate
below overwrites it and rejects unauthenticated traffic.

### ACA built-in Entra authentication (specification)

- Enable the Container App's built-in Authentication (Microsoft identity
  provider) with **allow unauthenticated access disabled** and unauthenticated
  requests **rejected before reaching the app**.
- Restrict access to an explicit list of tester identities (owner-decided:
  the allowed principals/group and any token lifetime are not chosen here).
- Confirm `X-MS-CLIENT-PRINCIPAL-ID` is reset by the platform for every
  request, so the application-layer check cannot be spoofed by a client
  header.

### Dedicated OpenRouter key and Key Vault binding (specification)

- Use a dedicated OpenRouter key, never the shared Hermes key. The key's
  provider-enforced spending limit (owner-decided value) is the emergency
  bound; the app's in-memory counters are advisory only.
- Store the key as a Secret in the existing Key Vault and bind it to the app
  via the Container App's secret reference (managed identity), so the key
  never appears in revision secrets, env, images or IaC source.
- Keep analytic numeric limits and the allowed-tester identity as owner
  decisions; the code and this spec deliberately do not guess them.

### Route hardening shipped in this slice

- Bounded JSON bodies (256 KiB default; `CONTENT`/`URL` length limits),
  oversized-body rejection before any upstream call, and provider-name/
  provider-count validation on the AI route.
- Caller-supplied provider `apiKey`/`endpoint` are stripped; only
  server-configured keys are used.
- Error responses are generic (no `details`) and logs record only error
  classes, so provider messages that echo request content are not returned or
  persisted. The YouTube transcript response is truncated to the AI-route
  limit.
