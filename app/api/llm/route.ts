import { NextRequest } from 'next/server';
import type { LLMRequestBody } from '@/providers/types';
import { checkRateLimit, checkSpendCap, recordSpend } from '@/lib/redis';
import { HOSTED_MODEL_ID, verifyHostedSessionToken } from '@/lib/hostedSession';

export const runtime = 'edge';

// Allowed Claude model IDs — reject anything else to prevent abuse
const ALLOWED_MODELS = new Set([
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-opus-4-7',
]);

// Max request body size (100KB — generous for even long transcripts)
const MAX_BODY_SIZE = 100_000;
const MAX_MESSAGES = 64;
const MAX_MESSAGE_CHARS = 20_000;
const MAX_TOTAL_MESSAGE_CHARS = 80_000;
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);

/** Strip sensitive values (API keys, tokens) from error messages before sending to client */
function sanitizeError(message: string): string {
  // Remove anything that looks like an API key
  return message.replace(/sk-ant-[a-zA-Z0-9_-]+/g, 'sk-ant-***').replace(/sk-[a-zA-Z0-9_-]{20,}/g, 'sk-***');
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

function hasTrustedOrigin(req: NextRequest, requireOrigin: boolean): boolean {
  const origin = req.headers.get('origin');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');

  if (!host) return false;
  if (!origin) return !requireOrigin;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function validateMessages(messages: unknown): messages is { role: string; content: string }[] {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return false;
  }

  let totalChars = 0;

  for (const message of messages) {
    if (!message || typeof message !== 'object') return false;
    const role = 'role' in message ? message.role : undefined;
    const content = 'content' in message ? message.content : undefined;

    if (typeof role !== 'string' || !ALLOWED_ROLES.has(role)) return false;
    if (typeof content !== 'string' || content.length === 0 || content.length > MAX_MESSAGE_CHARS) return false;

    totalChars += content.length;
    if (totalChars > MAX_TOTAL_MESSAGE_CHARS) return false;
  }

  return true;
}

export async function POST(req: NextRequest) {
  const isHostedMode = process.env.NEXT_PUBLIC_HOSTED_MODE === 'true';
  const allowServerProxy = process.env.ALLOW_SERVER_ANTHROPIC_PROXY === 'true';
  const ip = getClientIp(req);

  // Check content length before parsing
  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
    return jsonError('Request too large.', 413);
  }

  let body: LLMRequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON.', 400);
  }

  const { messages, provider, modelId, stream = true, sessionId, hostedSessionToken } = body;

  // Validate required fields
  if (!validateMessages(messages)) {
    return jsonError('Messages must be a non-empty, valid conversation payload.', 400);
  }

  if (!modelId || !ALLOWED_MODELS.has(modelId)) {
    return jsonError('Invalid or unsupported model.', 400);
  }

  const effectiveModelId = isHostedMode ? HOSTED_MODEL_ID : modelId;

  if (isHostedMode && modelId !== HOSTED_MODEL_ID) {
    return jsonError('Hosted Fishbowl sessions only support Claude Sonnet 4.6.', 400);
  }

  if (isHostedMode) {
    if (!sessionId || !hostedSessionToken) {
      return jsonError('Hosted sessions must start from the Fishbowl setup page.', 403);
    }

    const validToken = await verifyHostedSessionToken(hostedSessionToken, sessionId, ip);
    if (!validToken) {
      return jsonError('Hosted session token is invalid or expired. Restart from setup.', 403);
    }
  }

  const usingServerKey = isHostedMode || (!body.apiKey && allowServerProxy);
  if (!hasTrustedOrigin(req, usingServerKey)) {
    return jsonError('Cross-origin requests are not allowed.', 403);
  }

  // In hosted mode, always use the server key so the public site cannot act as a
  // generic proxy for arbitrary client-supplied API keys. Outside hosted mode,
  // only use the server key when explicitly opted in for trusted same-origin use.
  const apiKey = isHostedMode
    ? (process.env.ANTHROPIC_API_KEY || '')
    : (body.apiKey || (allowServerProxy ? process.env.ANTHROPIC_API_KEY || '' : ''));
  if (!apiKey) {
    return jsonError(
      isHostedMode
        ? 'No API key configured. Set ANTHROPIC_API_KEY on the server.'
        : 'No API key configured. Enter your Claude API key, use Claude Local, or opt in to ALLOW_SERVER_ANTHROPIC_PROXY.',
      400,
    );
  }

  // --- Rate limiting & spend cap (hosted mode only, requires Redis) ---
  if (isHostedMode) {
    const rateResult = await checkRateLimit(ip, sessionId!);
    if (!rateResult.allowed) {
      return jsonError(
        "You've used your free sessions for today. Come back tomorrow, or run your own instance from GitHub.",
        429,
      );
    }

    // Check daily spend cap
    const spendResult = await checkSpendCap();
    if (!spendResult.allowed) {
      return jsonError(
        'The Fishbowl is at capacity for today. Try again tomorrow, or run your own instance from GitHub.',
        503,
      );
    }
  }

  try {
    if (provider === 'claude') {
      return await handleClaude(messages, apiKey, effectiveModelId, stream);
    } else {
      return jsonError('Unknown provider.', 400);
    }
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Unknown error';
    console.error('[LLM API Route Error]', raw);
    return jsonError(sanitizeError(raw), 500);
  }
}

async function handleClaude(messages: { role: string; content: string }[], apiKey: string, modelId: string, stream?: boolean) {
  const systemMessage = messages.find((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');

  const requestBody: Record<string, unknown> = {
    model: modelId,
    max_tokens: 4096,
    messages: nonSystemMessages.map((m) => ({ role: m.role, content: m.content })),
    stream,
  };
  if (systemMessage) {
    requestBody.system = systemMessage.content;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  if (stream) {
    let inputTokens = 0;
    let outputTokens = 0;
    const encoder = new TextEncoder();

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);

        const text = new TextDecoder().decode(chunk);
        const lines = text.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === 'message_start' && parsed.message?.usage) {
              inputTokens = parsed.message.usage.input_tokens || 0;
            }
            if (parsed.type === 'message_delta' && parsed.usage) {
              outputTokens = parsed.usage.output_tokens || 0;
            }
          } catch {
            // Skip unparseable
          }
        }
      },
      flush(controller) {
        if (inputTokens > 0 || outputTokens > 0) {
          const usageEvent = `data: ${JSON.stringify({ type: 'usage', inputTokens, outputTokens })}\n\n`;
          controller.enqueue(encoder.encode(usageEvent));
          // Fire-and-forget spend tracking
          recordSpend(modelId, inputTokens, outputTokens).catch(() => {});
        }
      },
    });

    return new Response(response.body!.pipeThrough(transform), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-store',
      },
    });
  }

  // Non-streaming: read the full response and forward it
  const data = await response.json();
  if (data.usage) {
    recordSpend(modelId, data.usage.input_tokens || 0, data.usage.output_tokens || 0).catch(() => {});
  }
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
