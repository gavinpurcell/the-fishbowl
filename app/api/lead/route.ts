import { NextRequest } from 'next/server';
import { saveLead } from '@/lib/redis';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  let body: { email?: string; ideaText?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email || !email.includes('@')) {
    return Response.json({ error: 'Valid email required.' }, { status: 400 });
  }

  const saved = await saveLead(email, body.ideaText);

  if (!saved) {
    // Redis not configured — still accept it gracefully
    return Response.json({ ok: true, stored: false });
  }

  return Response.json({ ok: true, stored: true });
}
