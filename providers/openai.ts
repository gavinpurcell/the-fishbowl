import type { LLMProvider, Message, StreamEvent, GenerateResult } from './types';

export class OpenAIProvider implements LLMProvider {
  constructor(private apiKey: string, private modelId?: string) {}

  async *stream(messages: Message[]): AsyncIterable<StreamEvent> {
    const response = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        provider: 'openai',
        apiKey: this.apiKey,
        modelId: this.modelId,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'LLM request failed');
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
          if (parsed.type === 'usage') {
            yield { type: 'usage', inputTokens: parsed.inputTokens, outputTokens: parsed.outputTokens };
          } else {
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) yield { type: 'text', text: content };
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }
  }

  async generate(messages: Message[]): Promise<GenerateResult> {
    const response = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        provider: 'openai',
        apiKey: this.apiKey,
        modelId: this.modelId,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'LLM request failed');
    }

    const data = await response.json();
    return {
      text: data.choices?.[0]?.message?.content || '',
      usage: data.usage ? {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      } : undefined,
    };
  }
}
