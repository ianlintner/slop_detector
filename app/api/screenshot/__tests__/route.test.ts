/** @jest-environment node */
import { NextRequest } from 'next/server';
import { resetAccessState } from '@/lib/accessControl';
import { POST } from '../route';

const png = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44,
  0x52, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0,
]);
const originalKey = process.env.OPENROUTER_API_KEY;

const TEST_TOKEN = 'test-token-0123456789abcdef';
const TEST_USER = 'test-user';

beforeEach(() => {
  process.env.SCREENSHOT_ACCESS_TOKENS = `${TEST_USER}:${TEST_TOKEN}`;
  process.env.SCREENSHOT_DAILY_SPEND_CAP_USD = '100';
  resetAccessState();
});

function request(consent = 'yes') {
  const form = new FormData();
  form.set('image', new File([png], 'test.png', { type: 'image/png' }));
  form.set('scope', 'image');
  form.set('context', 'synthetic image');
  form.set('consent', consent);
  return new NextRequest('http://localhost/api/screenshot', {
    method: 'POST',
    body: form,
    headers: { authorization: `Bearer ${TEST_TOKEN}` },
  });
}

afterEach(() => {
  if (originalKey === undefined) delete process.env.OPENROUTER_API_KEY;
  else process.env.OPENROUTER_API_KEY = originalKey;
  delete process.env.SCREENSHOT_ACCESS_TOKENS;
  delete process.env.SCREENSHOT_DAILY_SPEND_CAP_USD;
  delete process.env.RESTRICTED_PREVIEW;
  jest.restoreAllMocks();
});

test('requires the platform identity when the preview gate is on', async () => {
  process.env.RESTRICTED_PREVIEW = '1';
  process.env.OPENROUTER_API_KEY = 'synthetic-test-key';
  const upstream = jest.spyOn(global, 'fetch');
  const response = await POST(
    new NextRequest('http://localhost/api/screenshot', {
      method: 'POST',
      body: new FormData(),
      headers: { authorization: `Bearer ${TEST_TOKEN}` },
    })
  );
  expect(response.status).toBe(401);
  expect(response.headers.get('WWW-Authenticate')).toBeNull();
  expect(upstream).not.toHaveBeenCalled();
});

test('requires a server key before accepting an upload', async () => {
  delete process.env.OPENROUTER_API_KEY;
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect((await response.json()).error).toContain('OPENROUTER_API_KEY');
});

test('rejects unauthenticated requests with 401', async () => {
  process.env.OPENROUTER_API_KEY = 'synthetic-test-key';
  const upstream = jest.spyOn(global, 'fetch');
  const form = new FormData();
  form.set('image', new File([png], 'test.png', { type: 'image/png' }));
  const response = await POST(
    new NextRequest('http://localhost/api/screenshot', {
      method: 'POST',
      body: form,
    })
  );
  expect(response.status).toBe(401);
  expect(response.headers.get('WWW-Authenticate')).toBe('Bearer');
  expect(upstream).not.toHaveBeenCalled();
});

test('rejects a mislabeled or malformed image with 415 and no provider call', async () => {
  process.env.OPENROUTER_API_KEY = 'synthetic-test-key';
  const upstream = jest.spyOn(global, 'fetch');
  const form = new FormData();
  form.set('image', new File([png], 'test.png', { type: 'image/jpeg' })); // MIME mismatch
  form.set('scope', 'image');
  form.set('context', 'synthetic image');
  form.set('consent', 'yes');
  const response = await POST(
    new NextRequest('http://localhost/api/screenshot', {
      method: 'POST',
      body: form,
      headers: { authorization: `Bearer ${TEST_TOKEN}` },
    })
  );
  expect(response.status).toBe(415);
  expect(upstream).not.toHaveBeenCalled();
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
