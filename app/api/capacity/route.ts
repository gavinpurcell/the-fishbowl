import { NextRequest } from 'next/server';
import { checkRateLimit, checkSpendCap } from '@/lib/redis';

export const runtime = 'edge';

/**
 * Lightweight pre-session capacity check.
 * Returns { available: true } or { available: false, reason: 'rate_limit' | 'spend_cap' }.
 * Only enforced in hosted mode — self-hosted always returns available.
 */
export async function GET(req: NextRequest) {
  const isHosted = process.env.NEXT_PUBLIC_HOSTED_MODE === 'true';
  if (!isHosted) {
    return Response.json({ available: true });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';

  // Check spend cap first (affects everyone)
  const spend = await checkSpendCap();
  if (!spend.allowed) {
    return Response.json({
      available: false,
      reason: 'spend_cap',
    });
  }

  // Check per-IP rate limit (use a probe session ID — don't register a real one)
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  if (sessionId) {
    const rate = await checkRateLimit(ip, sessionId);
    if (!rate.allowed) {
      return Response.json({
        available: false,
        reason: 'rate_limit',
        remaining: rate.remaining,
      });
    }
  }

  return Response.json({ available: true });
}
