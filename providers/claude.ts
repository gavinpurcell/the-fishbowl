import type { LLMProvider, Message, StreamEvent, GenerateResult } from './types';

export class ClaudeProvider implements LLMProvider {
  constructor(private apiKey: string, private modelId?: string) {}

  async *stream(messages: Message[], options?: { signal?: AbortSignal }): AsyncIterable<StreamEvent> {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 90_000);
    // Combine caller signal with timeout signal
    const signal = options?.signal
      ? AbortSignal.any([options.signal, timeoutController.signal])
      : timeoutController.signal;

    let response: Response;
    try {
      response = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          provider: 'claude',
          apiKey: this.apiKey,
          modelId: this.modelId,
          stream: true,
        }),
        signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'LLM request failed');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              yield { type: 'text', text: parsed.delta.text };
            } else if (parsed.type === 'usage') {
              yield { type: 'usage', inputTokens: parsed.inputTokens, outputTokens: parsed.outputTokens };
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
      reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }

  async generate(messages: Message[]): Promise<GenerateResult> {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 60_000);

    let response: Response;
    try {
      response = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          provider: 'claude',
          apiKey: this.apiKey,
          modelId: this.modelId,
          stream: false,
        }),
        signal: timeoutController.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'LLM request failed');
    }

    const data = await response.json();
    return {
      text: data.content?.[0]?.text || '',
      usage: data.usage ? {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      } : undefined,
    };
  }
}
