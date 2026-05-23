import { Redis } from '@upstash/redis';
import { HOSTED_MODEL_ID } from '@/lib/hostedSession';

// Lazy singleton — only connects when Upstash env vars are set
let redis: Redis | null = null;
let checked = false;

function getRedis(): Redis | null {
  if (checked) return redis;
  checked = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

// ---------------------------------------------------------------------------
// Rate limiting — track unique session IDs per IP per day
// ---------------------------------------------------------------------------

const SESSION_TTL = 86400; // 24 hours
const DAILY_SESSION_LIMIT = () => parseInt(process.env.DAILY_SESSION_LIMIT || '3', 10);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

async function inspectRateLimit(ip: string, sessionId: string, register: boolean): Promise<RateLimitResult> {
  const r = getRedis();
  const limit = DAILY_SESSION_LIMIT();
  if (!r) return { allowed: true, remaining: limit, limit };

  const key = `sessions:${ip}`;

  try {
    const isMember = await r.sismember(key, sessionId);
    if (isMember) {
      const count = await r.scard(key);
      return { allowed: true, remaining: Math.max(0, limit - count), limit };
    }

    const count = await r.scard(key);
    if (count >= limit) {
      return { allowed: false, remaining: 0, limit };
    }

    if (register) {
      await r.sadd(key, sessionId);
      if (count === 0) {
        await r.expire(key, SESSION_TTL);
      }
    }

    return { allowed: true, remaining: Math.max(0, limit - count - (register ? 1 : 0)), limit };
  } catch (err) {
    console.error(`[Redis] Rate limit ${register ? 'check' : 'peek'} failed, allowing request:`, err);
    return { allowed: true, remaining: limit, limit };
  }
}

/**
 * Check (and optionally register) a session against the per-IP rate limit.
 * Returns { allowed, remaining, limit }.
 *
 * Uses a Redis set `sessions:{ip}` keyed by sessionId so that all API calls
 * within one Fishbowl session count as a single session.
 */
export async function checkRateLimit(ip: string, sessionId: string): Promise<RateLimitResult> {
  return inspectRateLimit(ip, sessionId, true);
}

export async function peekRateLimit(ip: string, sessionId: string): Promise<RateLimitResult> {
  return inspectRateLimit(ip, sessionId, false);
}

// ---------------------------------------------------------------------------
// Daily spend cap — track cumulative API cost per day
// ---------------------------------------------------------------------------

const SPEND_TTL = 172800; // 48 hours (spans midnight safely)
const DAILY_SPEND_CAP = () => parseFloat(process.env.DAILY_SPEND_CAP || '100');

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-haiku-4-5-20251001': { input: 1 / 1_000_000, output: 5 / 1_000_000 },
  [HOSTED_MODEL_ID]: { input: 3 / 1_000_000, output: 15 / 1_000_000 },
  'claude-opus-4-7': { input: 15 / 1_000_000, output: 75 / 1_000_000 },
};

export interface SpendCheckResult {
  allowed: boolean;
  currentSpend: number;
  cap: number;
}

/**
 * Check if the daily spend cap has been exceeded.
 */
export async function checkSpendCap(): Promise<SpendCheckResult> {
  const r = getRedis();
  const cap = DAILY_SPEND_CAP();
  if (!r) return { allowed: true, currentSpend: 0, cap };

  const key = `spend:${todayKey()}`;

  try {
    const current = (await r.get<number>(key)) || 0;
    return { allowed: current < cap, currentSpend: current, cap };
  } catch (err) {
    console.error('[Redis] Spend cap check failed, allowing request:', err);
    return { allowed: true, currentSpend: 0, cap };
  }
}

/**
 * Record token usage against the daily spend counter.
 * Fire-and-forget — caller doesn't need to await this.
 */
export async function recordSpend(modelId: string, inputTokens: number, outputTokens: number): Promise<void> {
  const r = getRedis();
  if (!r) return;

  const pricing = MODEL_PRICING[modelId] || MODEL_PRICING[HOSTED_MODEL_ID];
  const cost = inputTokens * pricing.input + outputTokens * pricing.output;
  if (cost <= 0) return;

  const key = `spend:${todayKey()}`;

  try {
    const exists = await r.exists(key);
    await r.incrbyfloat(key, cost);
    if (!exists) {
      await r.expire(key, SPEND_TTL);
    }
  } catch (err) {
    console.error('[Redis] Failed to record spend:', err);
  }
}

// ---------------------------------------------------------------------------
// Lead capture
// ---------------------------------------------------------------------------

export async function saveLead(email: string, ideaText?: string): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;

  try {
    await r.lpush('leads', JSON.stringify({
      email,
      ideaText: ideaText?.slice(0, 500) || '',
      timestamp: new Date().toISOString(),
    }));
    return true;
  } catch (err) {
    console.error('[Redis] Failed to save lead:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}
