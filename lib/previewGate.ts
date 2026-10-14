// Restricted-preview request gate and bounded JSON body reader shared by the
// legacy analysis routes. Nothing here logs or echoes request content.

import { NextRequest, NextResponse } from 'next/server';

export const MAX_JSON_BODY_BYTES = 256 * 1024;
export const MAX_CONTENT_CHARS = 50_000;
export const MAX_URL_CHARS = 2048;
export const MAX_PROVIDERS = 3;

/**
 * Defense in depth for the restricted Azure preview. When RESTRICTED_PREVIEW
 * is "1"/"true", every gated route requires the identity header that Azure
 * Container Apps built-in authentication injects after a successful sign-in
 * (the platform overwrites any client-supplied value). The header is only
 * trustworthy when the platform auth gate is enabled with unauthenticated
 * requests rejected; see docs/azure-container-apps-plan.md. Unset means local
 * development.
 */
export function previewGateDenied(request: NextRequest): NextResponse | null {
  const v = (process.env.RESTRICTED_PREVIEW || '').toLowerCase();
  if (v !== '1' && v !== 'true') return null;
  if (request.headers.get('x-ms-client-principal-id')?.trim()) return null;
  return NextResponse.json(
    { error: 'Authentication required.' },
    { status: 401 }
  );
}

export type BoundedJson =
  | { ok: true; value: unknown }
  | { ok: false; response: NextResponse };

const reject = (status: number, error: string): BoundedJson => ({
  ok: false,
  response: NextResponse.json({ error }, { status }),
});

/** Reads a JSON body, enforcing the byte limit on Content-Length and on the
 * actual stream (chunked uploads can omit or lie about the length). */
export async function readBoundedJson(
  request: NextRequest,
  maxBytes = MAX_JSON_BODY_BYTES
): Promise<BoundedJson> {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) return reject(413, 'Request body too large.');
  const reader = request.body?.getReader();
  if (!reader) return reject(400, 'Request body must be JSON.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return reject(413, 'Request body too large.');
    }
    chunks.push(value);
  }
  try {
    return {
      ok: true,
      value: JSON.parse(Buffer.concat(chunks).toString('utf8')),
    };
  } catch {
    return reject(400, 'Request body must be valid JSON.');
  }
}
