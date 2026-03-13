export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMProvider {
  stream(messages: Message[]): AsyncIterable<string>;
  generate(messages: Message[]): Promise<string>;
}

export interface LLMRequestBody {
  messages: Message[];
  provider: 'claude' | 'openai';
  apiKey: string;
  modelId?: string;
  stream?: boolean;
}
