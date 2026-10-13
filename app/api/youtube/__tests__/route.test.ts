/** @jest-environment node */
import { NextRequest } from 'next/server';
import { YoutubeTranscript } from 'youtube-transcript';
import { MAX_CONTENT_CHARS } from '@/lib/previewGate';
import { POST } from '../route';

jest.mock('youtube-transcript', () => ({
  YoutubeTranscript: { fetchTranscript: jest.fn() },
}));

const fetchTranscript = YoutubeTranscript.fetchTranscript as jest.Mock;
const SECRET = 'SECRET-URL-CONTENT-xyzzy';
const AUTH = { 'x-ms-client-principal-id': 'tester-oid' };

function req(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/youtube', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  });
}

let errorSpy: jest.SpyInstance;
beforeEach(() => {
  fetchTranscript.mockReset();
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  delete process.env.RESTRICTED_PREVIEW;
  jest.restoreAllMocks();
});

test('denied without platform identity; no upstream call', async () => {
  process.env.RESTRICTED_PREVIEW = 'true';
  const res = await POST(req({ url: 'dQw4w9WgXcQ' }));
  expect(res.status).toBe(401);
  expect(fetchTranscript).not.toHaveBeenCalled();
});

test('allowed with identity', async () => {
  process.env.RESTRICTED_PREVIEW = 'true';
  fetchTranscript.mockResolvedValue([{ text: 'hello' }, { text: 'world' }]);
  const res = await POST(req({ url: 'dQw4w9WgXcQ' }, AUTH));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ text: 'hello world', truncated: false });
});

test('oversize URL is rejected with no upstream call or echo', async () => {
  const res = await POST(req({ url: SECRET + 'a'.repeat(5000) }));
  expect(res.status).toBe(413);
  expect(JSON.stringify(await res.json())).not.toContain(SECRET);
  expect(fetchTranscript).not.toHaveBeenCalled();
});

test('oversize body is rejected', async () => {
  const res = await POST(req({ url: 'x' }, { 'content-length': '999999' }));
  expect(res.status).toBe(413);
  expect(fetchTranscript).not.toHaveBeenCalled();
});

test('non-string url and invalid ids are 400 with no upstream call', async () => {
  expect((await POST(req({ url: { a: 1 } }))).status).toBe(400);
  expect((await POST(req({ url: `https://youtu.be/${SECRET}` }))).status).toBe(
    400
  );
  expect(fetchTranscript).not.toHaveBeenCalled();
});

test('transcript is truncated to the analysis limit', async () => {
  fetchTranscript.mockResolvedValue([
    { text: 'a'.repeat(MAX_CONTENT_CHARS + 100) },
  ]);
  const body = await (await POST(req({ url: 'dQw4w9WgXcQ' }))).json();
  expect(body.text).toHaveLength(MAX_CONTENT_CHARS);
  expect(body.truncated).toBe(true);
});

test('provider failure is generic and logs no message content', async () => {
  fetchTranscript.mockRejectedValue(new Error(`failed for ${SECRET}`));
  const res = await POST(req({ url: 'dQw4w9WgXcQ' }));
  expect(res.status).toBe(500);
  expect(JSON.stringify(await res.json())).not.toContain(SECRET);
  expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(SECRET);
});
