import type { LLMProvider, Message, StreamEvent, GenerateResult } from './types';

/**
 * Claude Code provider — uses the `claude` CLI with a Max subscription.
 * No API key needed; authenticates via Claude Code's OAuth login.
 * Calls a local API route that shells out to `claude -p`.
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
          if (parsed.type === 'text') {
            yield { type: 'text', text: parsed.text };
          } else if (parsed.type === 'usage') {
            yield { type: 'usage', inputTokens: parsed.inputTokens, outputTokens: parsed.outputTokens };
          }
        } catch {
          // Skip unparseable lines
        }
      }
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
