import type { LLMProvider, Message, StreamEvent, GenerateResult } from './types';

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;

  constructor(private modelId?: string, baseUrl?: string) {
    this.baseUrl = baseUrl || 'http://localhost:11434';
  }

  async *stream(messages: Message[], options?: { signal?: AbortSignal }): AsyncIterable<StreamEvent> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelId || 'llama3',
        messages,
        stream: true,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama error (${response.status}): ${await response.text()}`);
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
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              yield { type: 'text', text: parsed.message.content };
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    } finally {
      reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }

  async generate(messages: Message[]): Promise<GenerateResult> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelId || 'llama3',
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error (${response.status}): ${await response.text()}`);
    }

    const data = await response.json();
    return { text: data.message?.content || '' };
  }
}
