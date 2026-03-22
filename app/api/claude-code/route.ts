import { NextRequest } from 'next/server';
import { spawn } from 'child_process';

// Must use Node.js runtime — edge doesn't support child_process
export const runtime = 'nodejs';

interface ClaudeCodeRequest {
  messages: { role: string; content: string }[];
  modelId?: string;
  stream?: boolean;
}

/**
 * API route that shells out to `claude -p` (Claude Code CLI).
 * Uses the locally logged-in Max subscription — no API key needed.
 */
export async function POST(req: NextRequest) {
  const body: ClaudeCodeRequest = await req.json();
  const { messages, modelId, stream = true } = body;

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
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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

  // If it's already a short name, use as-is
  return modelId;
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
          const errorEvent = `data: ${JSON.stringify({ type: 'text', text: `[Claude Code error: ${stderrOutput || `exit code ${code}`}]` })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
        }

        // Emit estimated usage (Claude Code doesn't report exact tokens)
        const estimatedOutput = Math.round(wordCount * 1.3);
        const usageEvent = `data: ${JSON.stringify({ type: 'usage', inputTokens: 0, outputTokens: estimatedOutput })}\n\n`;
        controller.enqueue(encoder.encode(usageEvent));

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      });

      proc.on('error', (err) => {
        const errorEvent = `data: ${JSON.stringify({
          type: 'text',
          text: `[Claude Code not found. Make sure \`claude\` CLI is installed and you're logged in with your Max subscription.]`,
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
      'Cache-Control': 'no-cache',
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
        resolve(new Response(
          JSON.stringify({ error: stderr || `claude exited with code ${code}` }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        ));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        const text = parsed.result || parsed.message?.content?.[0]?.text || stdout;
        resolve(new Response(
          JSON.stringify({ text, usage: { inputTokens: 0, outputTokens: Math.round(text.split(/\s+/).length * 1.3) } }),
          { headers: { 'Content-Type': 'application/json' } },
        ));
      } catch {
        // Raw text output
        resolve(new Response(
          JSON.stringify({ text: stdout.trim(), usage: { inputTokens: 0, outputTokens: Math.round(stdout.split(/\s+/).length * 1.3) } }),
          { headers: { 'Content-Type': 'application/json' } },
        ));
      }
    });

    proc.on('error', () => {
      resolve(new Response(
        JSON.stringify({ error: 'Claude Code CLI not found. Install it and log in with your Max subscription.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      ));
    });
  });
}
