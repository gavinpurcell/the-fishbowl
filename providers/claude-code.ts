import type { LLMProvider, Message, StreamEvent, GenerateResult } from './types';

/**
 * Delay between simulated streaming chunks (ms).
 * Tuned to feel natural — fast enough to not feel sluggish,
 * slow enough to create a visible typing effect.
 */
const SIMULATED_CHUNK_DELAY_MS = 25;

/** Number of words per simulated chunk */
const WORDS_PER_CHUNK = 3;

/** Maximum total time for simulated streaming reveal (ms) */
const MAX_REVEAL_TIME_MS = 4000;

/**
 * Threshold: text chunks larger than this many characters are considered
 * "bulk" deliveries and will be broken up for simulated streaming.
 * Small chunks (typical of real streaming) pass through as-is.
 */
const BULK_CHUNK_THRESHOLD = 40;

/**
 * Split text into word-sized chunks for simulated streaming.
 * Preserves whitespace by attaching it to the preceding word.
 */
function splitIntoWordChunks(text: string, wordsPerChunk: number): string[] {
  // Split on word boundaries, keeping whitespace attached
  const words = text.match(/\S+\s*/g) || [text];
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(''));
  }

  return chunks;
}

/**
 * Calculate delay per chunk so total reveal time is proportional
 * to text length but capped at MAX_REVEAL_TIME_MS.
 */
function calculateChunkDelay(totalChunks: number): number {
  if (totalChunks <= 1) return 0;
  const idealTotal = totalChunks * SIMULATED_CHUNK_DELAY_MS;
  if (idealTotal <= MAX_REVEAL_TIME_MS) return SIMULATED_CHUNK_DELAY_MS;
  return Math.floor(MAX_REVEAL_TIME_MS / totalChunks);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Claude Local provider — uses the `claude` CLI with a Pro/Max subscription.
 * No API key needed; authenticates via Claude Code's OAuth login.
 * Calls a local API route that shells out to `claude -p`.
 *
 * Includes simulated streaming: when text arrives in large chunks (common
 * with the Claude CLI), it breaks them into word-sized pieces and emits
 * them with small delays to create a natural typing effect.
 */
export class ClaudeCodeProvider implements LLMProvider {
  constructor(private modelId?: string) {}

  async *stream(messages: Message[]): AsyncIterable<StreamEvent> {
    const response = await fetch('/api/claude-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        modelId: this.modelId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Claude Code request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    // Collect all events first, then simulate streaming for text
    const collectedEvents: StreamEvent[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'text') {
            collectedEvents.push({ type: 'text', text: parsed.text });
          } else if (parsed.type === 'usage') {
            collectedEvents.push({ type: 'usage', inputTokens: parsed.inputTokens, outputTokens: parsed.outputTokens });
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }

    // Determine if the response came as a bulk delivery.
    // If we got a small number of large text chunks, simulate streaming.
    // If we got many small chunks (real streaming worked), pass through as-is.
    const textEvents = collectedEvents.filter((e): e is StreamEvent & { type: 'text'; text: string } => e.type === 'text');
    const nonTextEvents = collectedEvents.filter((e) => e.type !== 'text');

    const totalTextLength = textEvents.reduce((sum, e) => sum + e.text.length, 0);
    const avgChunkSize = textEvents.length > 0 ? totalTextLength / textEvents.length : 0;
    const isBulkDelivery = textEvents.length <= 3 || avgChunkSize > BULK_CHUNK_THRESHOLD;

    if (isBulkDelivery && totalTextLength > 0) {
      // Combine all text and re-emit as small word-sized chunks with delays
      const fullText = textEvents.map((e) => e.text).join('');
      const wordChunks = splitIntoWordChunks(fullText, WORDS_PER_CHUNK);
      const chunkDelay = calculateChunkDelay(wordChunks.length);

      for (let i = 0; i < wordChunks.length; i++) {
        if (i > 0 && chunkDelay > 0) {
          await delay(chunkDelay);
        }
        yield { type: 'text', text: wordChunks[i] };
      }
    } else {
      // Real streaming worked — pass through text events as-is
      for (const event of textEvents) {
        yield event;
      }
    }

    // Emit non-text events (usage) at the end
    for (const event of nonTextEvents) {
      yield event;
    }
  }

  async generate(messages: Message[]): Promise<GenerateResult> {
    const response = await fetch('/api/claude-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        modelId: this.modelId,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Claude Code request failed');
    }

    const data = await response.json();
    return {
      text: data.text || '',
      usage: data.usage,
    };
  }
}
