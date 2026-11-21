/**
 * @jest-environment node
 */
import { mockProvider } from '../frameProviders';
import {
  azureProvider,
  readBoundedText,
  framePrompt,
  localProvider,
  openRouterProvider,
  resolveProvider,
} from '../frameProviderImpls';

describe('mockProvider', () => {
  test('is the deterministic default and makes no network calls', async () => {
    const a = await mockProvider.assess(
      new Uint8Array([1, 2, 3]),
      'image/png',
      ''
    );
    const b = await mockProvider.assess(
      new Uint8Array([1, 2, 3]),
      'image/png',
      ''
    );
    expect(a.verdict).toBe(b.verdict);
    expect(a.model).toBe('mock');
    expect(a.costUsd).toBe(0);
  });
});

describe('framePrompt', () => {
  test('instructs binary verdict and marks context as data', () => {
    const p = framePrompt('some frame');
    expect(p).toContain('slop');
    expect(p).toContain('uncertain');
    expect(p).toContain('"some frame"');
  });
});

describe('resolveProvider', () => {
  test('returns the shared mock provider for "mock"', () => {
    expect(resolveProvider('mock').name).toBe('mock');
  });
  test('rejects unknown provider names', () => {
    expect(() => resolveProvider('bogus')).toThrow(/Unknown provider/);
  });
  test('openrouter provider reports its name without needing to call', () => {
    expect(openRouterProvider('').name).toBe('openrouter');
  });
  test('azure and local providers report names without needing to call', () => {
    expect(azureProvider().name).toBe('azure');
    expect(localProvider().name).toBe('local');
  });
});

describe('real providers fail closed without credentials', () => {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  test('openrouter throws without a key', async () => {
    await expect(
      openRouterProvider('').assess(bytes, 'image/jpeg', '')
    ).rejects.toThrow(/OPENROUTER_API_KEY/);
  });
  test('azure throws without a key/endpoint', async () => {
    await expect(
      azureProvider().assess(bytes, 'image/jpeg', '')
    ).rejects.toThrow(/AZURE_OPENAI/);
  });
});

describe('response bounds and URL encoding (fetch mocked)', () => {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  const okBody = JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify({
            target: 'unknown',
            verdict: 'not_slop',
            reason: 'ok',
            evidence: [],
            question: null,
          }),
        },
      },
    ],
  });
  const orig = global.fetch;
  afterEach(() => {
    global.fetch = orig;
  });
  const mockFetch = (text: string) => {
    const fn = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => text,
    }));
    global.fetch = fn as unknown as typeof fetch;
    return fn;
  };

  test('readBoundedText rejects oversized bodies', async () => {
    await expect(
      readBoundedText({ text: async () => 'x'.repeat(20) }, 10)
    ).rejects.toThrow(/too large/);
  });

  test('readBoundedText stops reading oversized streams', async () => {
    const chunks = [new Uint8Array(8), new Uint8Array(8)];
    const cancel = jest.fn(async () => {});
    const reader = {
      read: async () =>
        chunks.length
          ? { done: false, value: chunks.shift()! }
          : { done: true, value: undefined },
      cancel,
    };
    await expect(
      readBoundedText(
        {
          text: async () => '',
          body: { getReader: () => reader as never },
        },
        10
      )
    ).rejects.toThrow(/too large/);
    expect(cancel).toHaveBeenCalled();
  });

  test('azure and local reject oversized responses', async () => {
    mockFetch('x'.repeat(20_000));
    await expect(
      azureProvider({ apiKey: 'k', endpoint: 'https://e.test' }).assess(
        bytes,
        'image/jpeg',
        ''
      )
    ).rejects.toThrow(/too large/);
    await expect(
      localProvider({ endpoint: 'http://127.0.0.1:1/v1' }).assess(
        bytes,
        'image/jpeg',
        ''
      )
    ).rejects.toThrow(/too large/);
  });

  test('azure encodes the deployment name in the URL', async () => {
    const fn = mockFetch(okBody);
    await azureProvider({
      apiKey: 'k',
      endpoint: 'https://e.test',
      deployment: '../x?y#z',
    }).assess(bytes, 'image/jpeg', '');
    const url = (fn.mock.calls[0] as unknown[])[0] as string;
    expect(url).toContain('/deployments/..%2Fx%3Fy%23z/chat/completions');
  });
});
