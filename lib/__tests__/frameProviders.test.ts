import { mockProvider } from '../frameProviders';
import {
  azureProvider,
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
