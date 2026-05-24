import { NextRequest } from 'next/server';
import { checkRateLimit, checkSpendCap } from '@/lib/redis';
import { createHostedSessionToken } from '@/lib/hostedSession';

export const runtime = 'edge';

function hasTrustedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');

  if (!origin || !host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Lightweight pre-session capacity check.
 * Returns { available: true } or { available: false, reason: 'rate_limit' | 'spend_cap' }.
 * Only enforced in hosted mode — self-hosted always returns available.
 */
export async function POST(req: NextRequest) {
  const isHosted = process.env.NEXT_PUBLIC_HOSTED_MODE === 'true';
  if (!isHosted) {
    return Response.json({ available: true });
  }

  if (!hasTrustedOrigin(req)) {
    return Response.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });
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

  let body: { sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) {
    return Response.json({ error: 'sessionId is required.' }, { status: 400 });
  }

  // Reserve the session slot here so hosted sessions must begin through setup.
  const rate = await checkRateLimit(ip, sessionId);
  if (!rate.allowed) {
    return Response.json({
      available: false,
      reason: 'rate_limit',
      remaining: rate.remaining,
    });
  }

  const sessionToken = await createHostedSessionToken(sessionId, ip);
  if (!sessionToken) {
    return Response.json({ error: 'Hosted session signing is not configured.' }, { status: 500 });
  }

  return Response.json({ available: true, sessionToken });
}
