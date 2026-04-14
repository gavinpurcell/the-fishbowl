export const HOSTED_MODEL_ID = 'claude-sonnet-4-6';

const HOSTED_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

interface HostedSessionPayload {
  sid: string;
  ip: string;
  exp: number;
}

function base64UrlEncode(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return base64UrlEncode(binary);
}

function getHostedSessionSecret(): string {
  return process.env.HOSTED_SESSION_SECRET || process.env.ANTHROPIC_API_KEY || '';
}

async function importSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createHostedSessionToken(sessionId: string, ip: string): Promise<string | null> {
  const secret = getHostedSessionSecret();
  if (!secret) return null;

  const payload: HostedSessionPayload = {
    sid: sessionId,
    ip,
    exp: Date.now() + HOSTED_SESSION_TTL_MS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const key = await importSigningKey(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(encodedPayload),
  );

  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyHostedSessionToken(
  token: string,
  sessionId: string,
  ip: string,
): Promise<boolean> {
  const secret = getHostedSessionSecret();
  if (!secret) return false;

  const [encodedPayload, encodedSignature] = token.split('.');
  if (!encodedPayload || !encodedSignature) return false;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as HostedSessionPayload;
    if (payload.sid !== sessionId) return false;
    if (payload.ip !== ip) return false;
    if (!Number.isFinite(payload.exp) || payload.exp <= Date.now()) return false;

    const key = await importSigningKey(secret);
    const signature = Uint8Array.from(base64UrlDecode(encodedSignature), (char) => char.charCodeAt(0));

    return crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      new TextEncoder().encode(encodedPayload),
    );
  } catch {
    return false;
  }
}
