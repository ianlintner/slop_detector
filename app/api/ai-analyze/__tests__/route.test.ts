/** @jest-environment node */
import { NextRequest } from 'next/server';
import { MAX_CONTENT_CHARS } from '@/lib/previewGate';
import { GET, POST } from '../route';

const SECRET = 'SECRET-USER-CONTENT-xyzzy';
const AUTH = { 'x-ms-client-principal-id': 'tester-oid' };

function req(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/ai-analyze', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

let fetchSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;
let logSpy: jest.SpyInstance;

beforeEach(() => {
  fetchSpy = jest.spyOn(global, 'fetch');
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  delete process.env.RESTRICTED_PREVIEW;
  delete process.env.OPENAI_API_KEY;
  jest.restoreAllMocks();
});

function logged() {
  return JSON.stringify([...errorSpy.mock.calls, ...logSpy.mock.calls]);
}

describe('restricted preview auth boundary', () => {
  beforeEach(() => {
    process.env.RESTRICTED_PREVIEW = '1';
  });

  test('denies POST without platform identity, no upstream call', async () => {
    const res = await POST(
      req({ content: SECRET, config: { useAI: true, providers: [] } })
    );
    expect(res.status).toBe(401);
    expect(JSON.stringify(await res.json())).not.toContain(SECRET);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logged()).not.toContain(SECRET);
  });

  test('denies GET without platform identity', async () => {
    const res = await GET(
      new NextRequest('http://localhost/api/ai-analyze', { method: 'GET' })
    );
    expect(res.status).toBe(401);
  });

  test('GET is allowed when gate is off', async () => {
    delete process.env.RESTRICTED_PREVIEW;
    const res = await GET(
      new NextRequest('http://localhost/api/ai-analyze', { method: 'GET' })
    );
    expect(res.status).toBe(200);
  });

  test('blank identity header is denied', async () => {
    const res = await POST(
      req({ content: 'hello world' }, { 'x-ms-client-principal-id': '  ' })
    );
    expect(res.status).toBe(401);
  });

  test('allows request carrying platform identity', async () => {
    const res = await POST(req({ content: 'hello world' }, AUTH));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  test('gate is off when RESTRICTED_PREVIEW is unset', async () => {
    delete process.env.RESTRICTED_PREVIEW;
    const res = await POST(req({ content: 'hello world' }));
    expect(res.status).toBe(200);
  });
});

describe('input bounds', () => {
  test('rejects oversize content with 413 and no upstream call', async () => {
    process.env.OPENAI_API_KEY = 'synthetic-key';
    const content = SECRET + 'a'.repeat(MAX_CONTENT_CHARS);
    const res = await POST(
      req({
        content,
        config: { useAI: true, providers: [{ name: 'openai' }] },
      })
    );
    expect(res.status).toBe(413);
    expect(JSON.stringify(await res.json())).not.toContain(SECRET);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(logged()).not.toContain(SECRET);
  });

  test('rejects oversize body by declared content-length', async () => {
    const res = await POST(
      req({ content: 'x' }, { 'content-length': String(10 * 1024 * 1024) })
    );
    expect(res.status).toBe(413);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('rejects oversize chunked body without content-length', async () => {
    const big = JSON.stringify({ content: 'a'.repeat(400 * 1024) });
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(big));
        c.close();
      },
    });
    const r = new NextRequest('http://localhost/api/ai-analyze', {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as ConstructorParameters<typeof NextRequest>[1]);
    expect((await POST(r)).status).toBe(413);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('malformed JSON returns 400 without echoing the body', async () => {
    const res = await POST(req(`{"content": "${SECRET}`));
    expect(res.status).toBe(400);
    expect(JSON.stringify(await res.json())).not.toContain(SECRET);
    expect(logged()).not.toContain(SECRET);
  });

  test('rejects too many providers and non-object config', async () => {
    const many = Array.from({ length: 10 }, () => ({ name: 'mock' }));
    const a = await POST(
      req({ content: 'hi', config: { useAI: true, providers: many } })
    );
    expect(a.status).toBe(400);
    const b = await POST(req({ content: 'hi', config: 'nope' }));
    expect(b.status).toBe(400);
  });

  test('content at the limit is accepted', async () => {
    const res = await POST(req({ content: 'a'.repeat(MAX_CONTENT_CHARS) }));
    expect(res.status).toBe(200);
  });
});

describe('provider failure privacy', () => {
  test('provider error that echoes content is neither returned nor logged', async () => {
    process.env.OPENAI_API_KEY = 'synthetic-key';
    fetchSpy.mockRejectedValue(new Error(`upstream echoed ${SECRET}`));
    const res = await POST(
      req({
        content: SECRET,
        config: { useAI: true, providers: [{ name: 'openai' }] },
      })
    );
    expect(res.status).toBe(200);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain('upstream echoed');
    expect(fetchSpy).toHaveBeenCalled();
    expect(text).toContain('No AI analysis results available');
    expect(logged()).not.toContain(SECRET);
  });

  test('invalid provider names are rejected with 400 and no upstream call', async () => {
    for (const name of [123, null, 'x'.repeat(33)]) {
      const res = await POST(
        req({ content: SECRET, config: { useAI: true, providers: [{ name }] } })
      );
      expect(res.status).toBe(400);
      expect(JSON.stringify(await res.json())).not.toContain(SECRET);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('caller-supplied provider apiKey is ignored in favor of the server key', async () => {
    process.env.OPENAI_API_KEY = 'server-side-key';
    fetchSpy.mockRejectedValue(new Error('boom'));
    await POST(
      req({
        content: 'hello there',
        config: {
          useAI: true,
          providers: [{ name: 'openai', apiKey: 'attacker-key' }],
        },
      })
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const options = fetchSpy.mock.calls[0][1] as RequestInit;
    const auth = (options.headers as Record<string, string>).Authorization;
    expect(auth).toContain('server-side-key');
    expect(JSON.stringify(fetchSpy.mock.calls)).not.toContain('attacker-key');
  });
});
