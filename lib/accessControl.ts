// Fail-closed access control for the paid screenshot endpoint: bearer-token
// authentication, per-user sliding-window rate limit, and a hard daily spend
// cap. State is in process memory, so limits are per server instance and reset
// on restart; a multi-instance deployment needs a shared store (see
// docs/security.md). Nothing here persists uploads or user content.

import { createHash, timingSafeEqual } from 'node:crypto';

export const MIN_TOKEN_LENGTH = 24;
const DEFAULT_RATE_LIMIT = 10; // requests per user per hour
const DEFAULT_COST_USD = 0.01; // pessimistic per-request provider cost
const HOUR_MS = 60 * 60 * 1000;

type Env = Record<string, string | undefined>;

export type AccessConfig = {
  users: { id: string; digest: Buffer }[];
  ratePerHour: number;
  dailyCapUsd: number;
  costPerRequestUsd: number;
};

const digest = (token: string) => createHash('sha256').update(token).digest();

/** Parses env into a config, or returns an error string naming what is missing.
 * SCREENSHOT_ACCESS_TOKENS="alice:<token>,bob:<token>"; tokens are hashed in
 * memory and compared in constant time. */
export function loadAccessConfig(env: Env): AccessConfig | string {
  const users: AccessConfig['users'] = [];
  for (const entry of (env.SCREENSHOT_ACCESS_TOKENS || '').split(',')) {
    if (!entry.trim()) continue;
    const at = entry.indexOf(':');
    const id = entry.slice(0, at).trim();
    const token = entry.slice(at + 1).trim();
    if (at < 1 || !/^[\w.-]{1,64}$/.test(id) || token.length < MIN_TOKEN_LENGTH)
      return `SCREENSHOT_ACCESS_TOKENS entries must be "user:token" with a token of at least ${MIN_TOKEN_LENGTH} characters.`;
    users.push({ id, digest: digest(token) });
  }
  if (!users.length) return 'SCREENSHOT_ACCESS_TOKENS is not configured.';
  const dailyCapUsd = Number(env.SCREENSHOT_DAILY_SPEND_CAP_USD);
  if (!Number.isFinite(dailyCapUsd) || dailyCapUsd <= 0)
    return 'SCREENSHOT_DAILY_SPEND_CAP_USD must be set to a positive number.';
  const ratePerHour = Number(
    env.SCREENSHOT_RATE_LIMIT_PER_HOUR ?? DEFAULT_RATE_LIMIT
  );
  const costPerRequestUsd = Number(
    env.SCREENSHOT_ESTIMATED_COST_USD ?? DEFAULT_COST_USD
  );
  if (!Number.isInteger(ratePerHour) || ratePerHour < 1)
    return 'SCREENSHOT_RATE_LIMIT_PER_HOUR must be a positive integer.';
  if (!Number.isFinite(costPerRequestUsd) || costPerRequestUsd <= 0)
    return 'SCREENSHOT_ESTIMATED_COST_USD must be a positive number.';
  return { users, ratePerHour, dailyCapUsd, costPerRequestUsd };
}

/** Returns the user id for a valid `Authorization: Bearer` header, else null.
 * Every configured user is compared so timing does not reveal which matched. */
export function authenticate(
  header: string | null,
  config: AccessConfig
): string | null {
  const match = /^Bearer (\S+)$/.exec(header || '');
  if (!match) return null;
  const given = digest(match[1]);
  let found: string | null = null;
  for (const user of config.users)
    if (timingSafeEqual(given, user.digest)) found = user.id;
  return found;
}

type State = {
  hits: Map<string, number[]>;
  spendDay: string;
  spentUsd: number;
};
const g = globalThis as unknown as { __slopAccessState?: State };
const state = (): State =>
  (g.__slopAccessState ??= { hits: new Map(), spendDay: '', spentUsd: 0 });

export function resetAccessState() {
  delete g.__slopAccessState;
}

/** Records an attempt for `user`; returns retry-after seconds when limited. */
export function checkRate(
  user: string,
  limit: number,
  now = Date.now()
): number | null {
  const hits = (state().hits.get(user) || []).filter((t) => now - t < HOUR_MS);
  if (hits.length >= limit) {
    state().hits.set(user, hits);
    return Math.max(1, Math.ceil((hits[0] + HOUR_MS - now) / 1000));
  }
  hits.push(now);
  state().hits.set(user, hits);
  return null;
}

/** Reserves `costUsd` against the UTC-day cap before the provider is called.
 * Reservations are never refunded, so failures cannot be used to exceed the
 * cap. Returns false when the reservation would exceed the cap. */
export function reserveSpend(
  costUsd: number,
  capUsd: number,
  now = Date.now()
): boolean {
  const s = state();
  const day = new Date(now).toISOString().slice(0, 10);
  if (s.spendDay !== day) {
    s.spendDay = day;
    s.spentUsd = 0;
  }
  if (s.spentUsd + costUsd > capUsd + 1e-9) return false;
  s.spentUsd += costUsd;
  return true;
}
