/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from '../route';

const png = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0,
]);
const originalKey = process.env.OPENROUTER_API_KEY;

function request(consent = 'yes') {
  const form = new FormData();
  form.set('image', new File([png], 'test.png', { type: 'image/png' }));
  form.set('scope', 'image');
  form.set('context', 'synthetic image');
  form.set('consent', consent);
  return new NextRequest('http://localhost/api/screenshot', {
    method: 'POST',
    body: form,
  });
}

afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalKey;
  jest.restoreAllMocks();
});

test('requires a server key before accepting an upload', async () => {
  delete process.env.OPENROUTER_API_KEY;
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect((await response.json()).error).toContain('OPENROUTER_API_KEY');
});

test('enforces consent before calling the provider', async () => {
  process.env.OPENROUTER_API_KEY = 'synthetic-test-key';
  const upstream = jest.spyOn(global, 'fetch');
  const response = await POST(request('no'));
  expect(response.status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
});

test('pins image routing to OpenAI on OpenRouter without fallbacks', async () => {
  process.env.OPENROUTER_API_KEY = 'synthetic-test-key';
  const upstream = jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                target: 'image',
                verdict: 'uncertain',
                reason: 'Not enough visible detail.',
                evidence: [],
                question: 'Can you upload a clearer image?',
              }),
            },
          },
        ],
      }),
      { status: 200 }
    )
  );
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect((await response.json()).assessment.verdict).toBe('uncertain');
  expect(upstream).toHaveBeenCalledTimes(1);
  const [url, options] = upstream.mock.calls[0];
  expect(url).toBe('https://openrouter.ai/api/v1/chat/completions');
  const headers = (options as RequestInit).headers as Record<string, string>;
  expect(headers.Authorization).toBe('Bearer synthetic-test-key');
  const payload = JSON.parse((options as RequestInit).body as string);
  expect(payload.model).toBe('openai/gpt-4.1-mini');
  expect(payload.provider).toEqual({
    only: ['openai'],
    allow_fallbacks: false,
    data_collection: 'deny',
    require_parameters: true,
  });
  expect(payload.messages[1].content[1].image_url.url).toMatch(
    /^data:image\/png;base64,/
  );
});
