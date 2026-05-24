import { NextRequest } from 'next/server';
import { spawn } from 'child_process';

// Must use Node.js runtime — edge doesn't support child_process
export const runtime = 'nodejs';

interface ClaudeCodeRequest {
  messages: { role: string; content: string }[];
  modelId?: string;
  stream?: boolean;
}

const MAX_BODY_SIZE = 100_000;
const MAX_MESSAGES = 64;
const MAX_MESSAGE_CHARS = 20_000;
const MAX_TOTAL_MESSAGE_CHARS = 80_000;
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);
const ALLOWED_MODELS = new Set(['haiku', 'sonnet', 'opus']);

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function sanitizeError(message: string): string {
  return message
    .replace(/sk-ant-[a-zA-Z0-9_-]+/g, 'sk-ant-***')
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, 'sk-***')
    .replace(/\/Users\/[^/\s]+/g, '/Users/***');
}

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

function getHostname(req: NextRequest): string | null {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!host) return null;

  try {
    return new URL(`http://${host}`).hostname;
  } catch {
    return null;
  }
}

function isLocalOrPrivateHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === 'localhost' || normalized === '::1' || normalized.endsWith('.local')) {
    return true;
  }

  if (/^127(?:\.\d{1,3}){3}$/.test(normalized)) {
    return true;
  }

  if (/^10(?:\.\d{1,3}){3}$/.test(normalized)) {
    return true;
  }

  if (/^192\.168(?:\.\d{1,3}){2}$/.test(normalized)) {
    return true;
  }

  const match = normalized.match(/^172\.(\d{1,3})(?:\.\d{1,3}){2}$/);
  if (match) {
    const secondOctet = parseInt(match[1], 10);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
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

/**
 * API route that shells out to `claude -p` (Claude Code CLI).
 * Uses the locally logged-in Pro/Max subscription — no API key needed.
 */
export async function POST(req: NextRequest) {
  if ((process.env.NEXT_PUBLIC_HOSTED_MODE === 'true') || process.env.VERCEL === '1') {
    return jsonError('Claude Local is disabled in hosted deployments.', 403);
  }

  const hostname = getHostname(req);
  const allowRemoteClaudeCode = process.env.ALLOW_REMOTE_CLAUDE_CODE === 'true';
  if (!hostname || (!isLocalOrPrivateHostname(hostname) && !allowRemoteClaudeCode)) {
    return jsonError(
      'Claude Local is only available on localhost or a private network. Set ALLOW_REMOTE_CLAUDE_CODE=true to override this intentionally.',
      403,
    );
  }

  if (!hasTrustedOrigin(req)) {
    return jsonError('Cross-origin requests are not allowed.', 403);
  }

  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
    return jsonError('Request too large.', 413);
  }

  let body: ClaudeCodeRequest;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON.', 400);
  }

  const { messages, modelId, stream = true } = body;

  if (!validateMessages(messages)) {
    return jsonError('Messages must be a non-empty, valid conversation payload.', 400);
  }

  // Build the prompt from the messages array
  const prompt = buildPrompt(messages);

  // Map short model names for claude CLI
  const modelFlag = mapModel(modelId);

  try {
    if (stream) {
      return streamResponse(prompt, modelFlag);
    } else {
      return await generateResponse(prompt, modelFlag);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Claude Code API Error]', message);
    return jsonError(sanitizeError(message), 500);
  }
}

function buildPrompt(messages: { role: string; content: string }[]): string {
  const parts: string[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      parts.push(`<system>\n${msg.content}\n</system>\n`);
    } else if (msg.role === 'user') {
      parts.push(`User: ${msg.content}\n`);
    } else if (msg.role === 'assistant') {
      parts.push(`Assistant: ${msg.content}\n`);
    }
  }

  return parts.join('\n');
}

function mapModel(modelId?: string): string {
  if (!modelId) return 'sonnet';

  // Map full model IDs to claude CLI short names
  if (modelId.includes('haiku')) return 'haiku';
  if (modelId.includes('opus')) return 'opus';
  if (modelId.includes('sonnet')) return 'sonnet';

  if (ALLOWED_MODELS.has(modelId)) {
    return modelId;
  }

  return 'sonnet';
}

function streamResponse(prompt: string, model: string): Response {
  const encoder = new TextEncoder();
  let wordCount = 0;

  const readableStream = new ReadableStream({
    start(controller) {
      const args = [
        '-p', prompt,
        '--model', model,
        '--output-format', 'stream-json',
        '--verbose',
        '--include-partial-messages',
        '--no-chrome',
      ];

      const proc = spawn('claude', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let stderrOutput = '';
      let lastEmittedText = '';
      let jsonBuffer = '';

      proc.stdout.on('data', (data: Buffer) => {
        jsonBuffer += data.toString();
        const lines = jsonBuffer.split('\n');
        // Keep incomplete last line in buffer
        jsonBuffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line);

            // With --include-partial-messages, we get incremental assistant events.
            // Each one has the FULL text so far — we emit only the NEW part.
            if (parsed.type === 'assistant' && parsed.message?.content) {
              for (const block of parsed.message.content) {
                if (block.type === 'text' && block.text) {
                  const fullText = block.text;
                  if (fullText.length > lastEmittedText.length) {
                    const newText = fullText.slice(lastEmittedText.length);
                    const event = `data: ${JSON.stringify({ type: 'text', text: newText })}\n\n`;
                    controller.enqueue(encoder.encode(event));
                    wordCount += newText.split(/\s+/).filter(Boolean).length;
                    lastEmittedText = fullText;
                  }
                }
              }
            }

            // Result event — emit any remaining text not yet sent
            if (parsed.type === 'result' && parsed.result && typeof parsed.result === 'string') {
              if (parsed.result.length > lastEmittedText.length) {
                const newText = parsed.result.slice(lastEmittedText.length);
                const event = `data: ${JSON.stringify({ type: 'text', text: newText })}\n\n`;
                controller.enqueue(encoder.encode(event));
                wordCount += newText.split(/\s+/).filter(Boolean).length;
              } else if (wordCount === 0) {
                const event = `data: ${JSON.stringify({ type: 'text', text: parsed.result })}\n\n`;
                controller.enqueue(encoder.encode(event));
                wordCount += parsed.result.split(/\s+/).filter(Boolean).length;
              }
            }
          } catch {
            // Skip non-JSON lines (system noise)
          }
        }
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderrOutput += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0 && wordCount === 0) {
          const safeError = sanitizeError(stderrOutput || `exit code ${code}`);
          const errorEvent = `data: ${JSON.stringify({ type: 'text', text: `[Claude Code error: ${safeError}]` })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
        }

        // Emit estimated usage (Claude Code doesn't report exact tokens)
        const estimatedOutput = Math.round(wordCount * 1.3);
        const usageEvent = `data: ${JSON.stringify({ type: 'usage', inputTokens: 0, outputTokens: estimatedOutput })}\n\n`;
        controller.enqueue(encoder.encode(usageEvent));

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      });

      proc.on('error', () => {
        const errorEvent = `data: ${JSON.stringify({
          type: 'text',
          text: `[Claude Code not found. Make sure \`claude\` CLI is installed and you're logged in with your Pro/Max subscription.]`,
        })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      });
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    },
  });
}

async function generateResponse(prompt: string, model: string): Promise<Response> {
  return new Promise((resolve) => {
    const args = ['-p', prompt, '--model', model, '--output-format', 'json', '--verbose'];
    const proc = spawn('claude', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        resolve(jsonError(sanitizeError(stderr || `claude exited with code ${code}`), 500));
        return;
      }

      // claude --output-format json emits multiple JSON lines (system init,
      // assistant messages, result). Find the result event for the final text.
      let text = '';
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          // The result event has the final response text
          if (parsed.type === 'result' && parsed.result) {
            text = parsed.result;
          }
          // Fallback: assistant message with text content
          if (!text && parsed.type === 'assistant' && parsed.message?.content) {
            for (const block of parsed.message.content) {
              if (block.type === 'text' && block.text) {
                text = block.text;
              }
            }
          }
        } catch {
          // Skip non-JSON lines
        }
      }

      // Last resort: if no structured data found, use raw output
      if (!text) text = stdout.trim();

      resolve(new Response(
        JSON.stringify({ text, usage: { inputTokens: 0, outputTokens: Math.round(text.split(/\s+/).length * 1.3) } }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        },
      ));
    });

    proc.on('error', () => {
      resolve(jsonError('Claude Code CLI not found. Install it and log in with your Pro/Max subscription.', 500));
    });
  });
}
