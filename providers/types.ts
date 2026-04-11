export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number };

export interface GenerateResult {
  text: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface LLMProvider {
  stream(messages: Message[], options?: { signal?: AbortSignal }): AsyncIterable<StreamEvent>;
  generate(messages: Message[]): Promise<GenerateResult>;
}

export interface LLMRequestBody {
  messages: Message[];
  provider: 'claude';
  apiKey: string;
  modelId?: string;
  stream?: boolean;
  sessionId?: string;
}
