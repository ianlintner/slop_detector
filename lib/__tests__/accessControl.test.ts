import {
  loadAccessConfig,
  authenticate,
  checkRate,
  reserveSpend,
  resetAccessState,
  AccessConfig,
} from '../accessControl';

const TOKEN = 'a-very-long-token-0123456789';

function config(over: Record<string, string> = {}): AccessConfig {
  const result = loadAccessConfig({
    SCREENSHOT_ACCESS_TOKENS: `alice:${TOKEN},bob:${TOKEN}-bob`,
    SCREENSHOT_DAILY_SPEND_CAP_USD: '10',
    ...over,
  });
  if (typeof result === 'string') throw new Error(result);
  return result;
}

beforeEach(resetAccessState);

describe('loadAccessConfig', () => {
  test('rejects a missing or short token', () => {
    expect(
      loadAccessConfig({ SCREENSHOT_ACCESS_TOKENS: 'alice:short' })
    ).toHaveProperty('length');
    expect(loadAccessConfig({})).toHaveProperty('length');
    expect(
      loadAccessConfig({
        SCREENSHOT_ACCESS_TOKENS: `alice:${TOKEN}`,
      })
    ).toHaveProperty('length'); // missing cap
  });

  test('parses users and numeric limits', () => {
    const cfg = config();
    expect(cfg.users.map((u) => u.id)).toEqual(['alice', 'bob']);
    expect(cfg.dailyCapUsd).toBe(10);
  });
});

describe('authenticate', () => {
  test('accepts only a matching token', () => {
    const cfg = config();
    expect(authenticate(`Bearer ${TOKEN}`, cfg)).toBe('alice');
    expect(authenticate(`Bearer ${TOKEN}-bob`, cfg)).toBe('bob');
    expect(authenticate(`Bearer ${TOKEN}-nope`, cfg)).toBeNull();
    expect(authenticate(null, cfg)).toBeNull();
    expect(authenticate('no-scheme', cfg)).toBeNull();
  });
});

describe('checkRate', () => {
  test('allows up to the limit then reports retry-after', () => {
    const cfg = config({ SCREENSHOT_RATE_LIMIT_PER_HOUR: '3' });
    expect(checkRate('alice', cfg.ratePerHour, 0)).toBeNull();
    expect(checkRate('alice', cfg.ratePerHour, 1000)).toBeNull();
    expect(checkRate('alice', cfg.ratePerHour, 2000)).toBeNull();
    expect(checkRate('alice', cfg.ratePerHour, 3000)).toBeGreaterThan(0);
  });
});

describe('reserveSpend', () => {
  test('caps cumulative daily spend without refunds', () => {
    const cfg = config();
    const t = Date.UTC(2026, 0, 1, 12);
    expect(reserveSpend(cfg.costPerRequestUsd, cfg.dailyCapUsd, t)).toBe(true);
    expect(reserveSpend(cfg.dailyCapUsd, cfg.dailyCapUsd, t + 1)).toBe(false);
  });
});
