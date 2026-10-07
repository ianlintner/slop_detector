import { NextRequest, NextResponse } from 'next/server';
import {
  detectImage,
  makePrompt,
  MAX_CONTEXT_CHARS,
  MAX_IMAGE_BYTES,
  parseAssessment,
  Scope,
} from '@/lib/screenshotScope';

export const runtime = 'nodejs';
const scopes: Scope[] = ['auto', 'image', 'article', 'whole'];

export async function POST(request: NextRequest) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key)
    return NextResponse.json(
      {
        error:
          'Vision analysis is not configured. Set OPENROUTER_API_KEY on the server.',
      },
      { status: 503 }
    );
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_IMAGE_BYTES + 10_000)
    return NextResponse.json(
      { error: 'Upload too large (5 MB image maximum).' },
      { status: 413 }
    );
  let form: FormData;
  try {
    // Bound chunked uploads too; Content-Length alone is not a security limit.
    const reader = request.body?.getReader();
    if (!reader) throw new Error('Missing body');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_BYTES + 10_000) {
        await reader.cancel();
        return NextResponse.json(
          { error: 'Upload too large (5 MB image maximum).' },
          { status: 413 }
        );
      }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }
    form = await new Request(request.url, {
      method: 'POST',
      headers: { 'content-type': request.headers.get('content-type') || '' },
      body,
    }).formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });
  }
  const file = form.get('image');
  const scope = form.get('scope');
  const context = form.get('context');
  const consent = form.get('consent');
  if (
    !(file instanceof File) ||
    typeof scope !== 'string' ||
    !scopes.includes(scope as Scope) ||
    typeof context !== 'string' ||
    context.length > MAX_CONTEXT_CHARS ||
    consent !== 'yes'
  ) {
    return NextResponse.json(
      {
        error:
          'Provide an image, scope, short context, and consent to send it to the configured vision provider.',
      },
      { status: 400 }
    );
  }
  if (!file.size || file.size > MAX_IMAGE_BYTES)
    return NextResponse.json(
      { error: 'Image must be between 1 byte and 5 MB.' },
      { status: 413 }
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectImage(bytes);
  if (!mime || mime !== file.type)
    return NextResponse.json(
      { error: 'Only genuine PNG, JPEG, or WebP images are supported.' },
      { status: 415 }
    );
  const model = 'openai/gpt-4.1-mini';
  try {
    const upstream = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          provider: {
            only: ['openai'],
            allow_fallbacks: false,
            data_collection: 'deny',
            require_parameters: true,
          },
          temperature: 0,
          max_tokens: 500,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: makePrompt(scope as Scope, context) },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Assess the selected visible content. If scope is ambiguous or text illegible, ask for clarification.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`,
                    detail: 'auto',
                  },
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!upstream.ok)
      return NextResponse.json(
        { error: 'Vision provider unavailable. Try again later.' },
        { status: 502 }
      );
    const raw = await upstream.text();
    if (raw.length > 16_000) throw new Error('Response too large');
    const content = JSON.parse(raw)?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('Missing response');
    const assessment = parseAssessment(JSON.parse(content), scope as Scope);
    return NextResponse.json({ assessment, model });
  } catch {
    return NextResponse.json(
      { error: 'Vision analysis failed or returned an invalid assessment.' },
      { status: 502 }
    );
  }
}
