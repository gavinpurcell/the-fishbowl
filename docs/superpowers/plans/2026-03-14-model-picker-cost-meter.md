# Model Picker & Live Cost Meter — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a model picker dropdown to the setup page and a live cost meter (real token counts from API responses) to the session StatusBar, so users know exactly what they're paying for.

**Architecture:** Static model registry provides pricing data. API proxy wraps upstream streams in a TransformStream to extract token usage and emit a unified `usage` SSE event. Providers yield typed `StreamEvent` objects. Session accumulates totals, StatusBar displays running cost. Test page simulates the same UX with fake token counts.

**Tech Stack:** Next.js 16, TypeScript, Zustand, edge runtime (API route)

**Spec:** `docs/superpowers/specs/2026-03-14-model-picker-cost-meter-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `lib/models.ts` | **New** — Model registry: model definitions, pricing, helper functions |
| `providers/types.ts` | StreamEvent union type, GenerateResult type, updated LLMProvider interface |
| `lib/store.ts` | Add modelId + sessionCost state, setters, reset logic |
| `components/setup/ApiKeyConfig.tsx` | Model dropdown, Ollama text input |
| `app/page.tsx` | Cost estimate display below ApiKeyConfig |
| `app/api/llm/route.ts` | TransformStream wrappers for Claude + OpenAI usage extraction |
| `providers/claude.ts` | Yield StreamEvent from stream(), return GenerateResult from generate() |
| `providers/openai.ts` | Yield StreamEvent from stream(), return GenerateResult from generate() |
| `providers/ollama.ts` | Yield StreamEvent (text only, no usage), return GenerateResult |
| `engine/conversation.ts` | Handle StreamEvent in loop, add onTokenUsage callback |
| `app/session/page.tsx` | Wire modelId, onTokenUsage, pass cost to StatusBar |
| `components/scene/StatusBar.tsx` | Cost display: dollar amount + token count |
| `app/test/page.tsx` | Simulated cost meter with fake token counts |
| `app/results/page.tsx` | Show total session cost |

---

## Task 1: Model Registry

**Files:**
- Create: `lib/models.ts`

- [ ] **Step 1: Create model registry with pricing data**

```typescript
// lib/models.ts
import type { ProviderType } from '@/engine/types';

export interface ModelOption {
  id: string;
  label: string;
  provider: ProviderType;
  tier: 'fast' | 'balanced' | 'smartest';
  inputPer1M: number;
  outputPer1M: number;
}

const MODELS: ModelOption[] = [
  // Claude
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', provider: 'claude', tier: 'fast', inputPer1M: 1.00, outputPer1M: 5.00 },
  { id: 'claude-sonnet-4-6-20250514', label: 'Sonnet 4.6', provider: 'claude', tier: 'balanced', inputPer1M: 3.00, outputPer1M: 15.00 },
  { id: 'claude-opus-4-6-20250514', label: 'Opus 4.6', provider: 'claude', tier: 'smartest', inputPer1M: 15.00, outputPer1M: 75.00 },
  // OpenAI
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', tier: 'fast', inputPer1M: 0.15, outputPer1M: 0.60 },
  { id: 'gpt-5', label: 'GPT-5', provider: 'openai', tier: 'balanced', inputPer1M: 1.25, outputPer1M: 10.00 },
  { id: 'gpt-5.2', label: 'GPT-5.2', provider: 'openai', tier: 'smartest', inputPer1M: 1.75, outputPer1M: 14.00 },
];

export function getModelsForProvider(provider: ProviderType): ModelOption[] {
  return MODELS.filter((m) => m.provider === provider);
}

export function getDefaultModel(provider: ProviderType): ModelOption {
  return MODELS.find((m) => m.provider === provider && m.tier === 'balanced')
    || MODELS.find((m) => m.provider === provider)!;
}

export function getModelById(id: string): ModelOption | undefined {
  return MODELS.find((m) => m.id === id);
}

export function estimateSessionCost(
  modelId: string,
  panelistCount: number
): { low: number; high: number } {
  const model = getModelById(modelId);
  if (!model) return { low: 0, high: 0 };

  const avgInputTokens = 500;
  const avgOutputTokens = 267;

  // Responses per session: briefing (N) + cross-talk (2*N) + moderation (low: N, high: 3*N) + wrap-up (N)
  const lowResponses = panelistCount * 4 + panelistCount;      // 5N (1 mod question)
  const highResponses = panelistCount * 4 + panelistCount * 3;  // 7N (3 mod questions)

  const costPerResponse =
    (avgInputTokens / 1_000_000) * model.inputPer1M +
    (avgOutputTokens / 1_000_000) * model.outputPer1M;

  return {
    low: Math.round(lowResponses * costPerResponse * 100) / 100,
    high: Math.round(highResponses * costPerResponse * 100) / 100,
  };
}

export function formatCost(dollars: number): string {
  if (dollars < 0.01) return '$0.00';
  return `$${dollars.toFixed(2)}`;
}

export function formatTokens(count: number): string {
  if (count < 1000) return `${count}`;
  return `${(count / 1000).toFixed(1)}K`;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd ~/the-fishbowl && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to `lib/models.ts`

- [ ] **Step 3: Commit**

```bash
cd ~/the-fishbowl && git add lib/models.ts && git commit -m "feat: add model registry with pricing data"
```

---

## Task 2: Provider Types — StreamEvent + GenerateResult

**Files:**
- Modify: `providers/types.ts`

- [ ] **Step 1: Update types**

Replace the entire file contents with:

```typescript
// providers/types.ts
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
  stream(messages: Message[]): AsyncIterable<StreamEvent>;
  generate(messages: Message[]): Promise<GenerateResult>;
}

export interface LLMRequestBody {
  messages: Message[];
  provider: 'claude' | 'openai';
  apiKey: string;
  modelId?: string;
  stream?: boolean;
}
```

- [ ] **Step 2: Expect compile errors**

Run: `cd ~/the-fishbowl && npx tsc --noEmit 2>&1 | head -30`
Expected: Errors in `claude.ts`, `openai.ts`, `ollama.ts`, `conversation.ts` — they still yield `string` and return `string`. This is expected; we fix them in Tasks 3-5.

- [ ] **Step 3: Commit**

```bash
cd ~/the-fishbowl && git add providers/types.ts && git commit -m "feat: add StreamEvent and GenerateResult types to provider interface"
```

---

## Task 3: Update Claude Provider

**Files:**
- Modify: `providers/claude.ts`

- [ ] **Step 1: Update stream() to yield StreamEvent and generate() to return GenerateResult**

Replace the entire file with:

```typescript
// providers/claude.ts
import type { LLMProvider, Message, StreamEvent, GenerateResult } from './types';

export class ClaudeProvider implements LLMProvider {
  constructor(private apiKey: string, private modelId?: string) {}

  async *stream(messages: Message[]): AsyncIterable<StreamEvent> {
    const response = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        provider: 'claude',
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
  }

  async generate(messages: Message[]): Promise<GenerateResult> {
    const response = await fetch('/api/llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        provider: 'claude',
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
      text: data.content?.[0]?.text || '',
      usage: data.usage ? {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      } : undefined,
    };
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/the-fishbowl && git add providers/claude.ts && git commit -m "feat: update Claude provider to yield StreamEvent and return GenerateResult"
```

---

## Task 4: Update OpenAI Provider

**Files:**
- Modify: `providers/openai.ts`

- [ ] **Step 1: Update stream() and generate()**

Replace the entire file with:

```typescript
// providers/openai.ts
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
          // Our synthetic usage event from the API proxy
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
```

- [ ] **Step 2: Commit**

```bash
cd ~/the-fishbowl && git add providers/openai.ts && git commit -m "feat: update OpenAI provider to yield StreamEvent and return GenerateResult"
```

---

## Task 5: Update Ollama Provider

**Files:**
- Modify: `providers/ollama.ts`

- [ ] **Step 1: Update stream() and generate() to match new interface**

Ollama doesn't reliably report usage, so stream() yields text-only events and generate() returns no usage.

Replace the entire file with:

```typescript
// providers/ollama.ts
import type { LLMProvider, Message, StreamEvent, GenerateResult } from './types';

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;

  constructor(private modelId?: string, baseUrl?: string) {
    this.baseUrl = baseUrl || 'http://localhost:11434';
  }

  async *stream(messages: Message[]): AsyncIterable<StreamEvent> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.modelId || 'llama3',
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error (${response.status}): ${await response.text()}`);
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
```

- [ ] **Step 2: Commit**

```bash
cd ~/the-fishbowl && git add providers/ollama.ts && git commit -m "feat: update Ollama provider to yield StreamEvent and return GenerateResult"
```

---

## Task 6: Update Conversation Engine

**Files:**
- Modify: `engine/conversation.ts`

- [ ] **Step 1: Add onTokenUsage callback, handle StreamEvent in stream loop, extract usage from generate**

Replace the entire file with:

```typescript
// engine/conversation.ts
import type { Panelist, TranscriptEntry, RoundType, FileContent } from './types';
import type { LLMProvider, Message } from '@/providers/types';
import { generateId } from './panelist';

export interface ConversationCallbacks {
  onRoundChange: (round: RoundType) => void;
  onPanelistActivated: (panelistId: string) => void;
  onPanelistDeactivated: () => void;
  onTranscriptEntry: (entry: TranscriptEntry) => void;
  onStreamChunk: (panelistId: string, chunk: string) => void;
  onTokenUsage: (inputTokens: number, outputTokens: number) => void;
  onError: (error: Error) => void;
}

export class ConversationOrchestrator {
  private transcript: TranscriptEntry[] = [];
  private aborted = false;

  constructor(
    private panelists: Panelist[],
    private ideaText: string,
    private ideaFiles: FileContent[],
    private provider: LLMProvider,
    private callbacks: ConversationCallbacks
  ) {}

  private buildIdeaContext(): string {
    let context = '';
    if (this.ideaText) {
      context += `## The Idea\n\n${this.ideaText}\n\n`;
    }
    for (const file of this.ideaFiles) {
      context += `## File: ${file.name}\n\n${file.content}\n\n`;
    }
    return context;
  }

  private buildTranscriptContext(): string {
    if (this.transcript.length === 0) return '';
    let text = '## Discussion So Far\n\n';
    for (const entry of this.transcript) {
      text += `**${entry.panelistName}:** ${entry.content}\n\n`;
    }
    return text;
  }

  private async streamPanelistResponse(
    panelist: Panelist,
    userPrompt: string,
    round: RoundType
  ): Promise<string> {
    if (this.aborted) return '';

    this.callbacks.onPanelistActivated(panelist.id);

    const messages: Message[] = [
      { role: 'system', content: panelist.systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const entry: TranscriptEntry = {
      id: generateId(),
      panelistId: panelist.id,
      panelistName: panelist.name,
      content: '',
      round,
      timestamp: Date.now(),
    };

    this.callbacks.onTranscriptEntry(entry);

    let fullResponse = '';
    try {
      for await (const event of this.provider.stream(messages)) {
        if (this.aborted) break;
        if (event.type === 'text') {
          fullResponse += event.text;
          this.callbacks.onStreamChunk(panelist.id, event.text);
        } else if (event.type === 'usage') {
          this.callbacks.onTokenUsage(event.inputTokens, event.outputTokens);
        }
      }
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      fullResponse = '[Error generating response]';
      this.aborted = true;
    }

    entry.content = fullResponse;
    this.transcript.push(entry);
    this.callbacks.onPanelistDeactivated();

    return fullResponse;
  }

  async runInitialTakes(): Promise<void> {
    this.callbacks.onRoundChange('initial-takes');
    for (const panelist of this.panelists) {
      if (this.aborted) return;
      await this.runSinglePanelist(panelist, 'initial-takes');
    }
  }

  async runSinglePanelist(panelist: Panelist, round: RoundType): Promise<void> {
    if (this.aborted) return;

    const ideaContext = this.buildIdeaContext();
    const transcriptContext = this.buildTranscriptContext();

    let prompt: string;
    if (round === 'initial-takes') {
      prompt = `${ideaContext}\n\nGive your initial reaction to this idea. What stands out? What concerns you? What excites you? Be specific and draw on your expertise. Keep your response to 100-200 words.`;
    } else if (round === 'cross-talk') {
      prompt = `${ideaContext}\n\n${transcriptContext}\n\nRespond to what the other panelists have said. You can agree, disagree, build on their points, or challenge their assumptions. Reference specific panelists by name. Be direct and specific. Keep your response to 100-200 words.`;
    } else {
      prompt = `${ideaContext}\n\n${transcriptContext}\n\nShare your thoughts. Keep your response to 100-200 words.`;
    }

    await this.streamPanelistResponse(panelist, prompt, round);
  }

  async runCrossTalk(): Promise<void> {
    this.callbacks.onRoundChange('cross-talk');
    const ideaContext = this.buildIdeaContext();

    for (let round = 0; round < 2; round++) {
      for (const panelist of this.panelists) {
        if (this.aborted) return;
        const transcriptContext = this.buildTranscriptContext();
        const prompt = `${ideaContext}\n\n${transcriptContext}\n\nRespond to what the other panelists have said. You can agree, disagree, build on their points, or challenge their assumptions. Reference specific panelists by name. Be direct and specific. Keep your response to 100-200 words.`;
        await this.streamPanelistResponse(panelist, prompt, 'cross-talk');
      }
    }
  }

  async handleModerationQuestion(question: string): Promise<void> {
    const ideaContext = this.buildIdeaContext();
    const transcriptContext = this.buildTranscriptContext();

    const userEntry: TranscriptEntry = {
      id: generateId(),
      panelistId: 'user',
      panelistName: 'Moderator',
      content: question,
      round: 'moderation',
      timestamp: Date.now(),
    };
    this.transcript.push(userEntry);
    this.callbacks.onTranscriptEntry(userEntry);

    for (const panelist of this.panelists) {
      if (this.aborted) return;
      const prompt = `${ideaContext}\n\n${transcriptContext}\n\n**Moderator:** ${question}\n\nThe moderator has stepped in with a question or directive. Respond directly to what they asked. You can also reference what other panelists have said. Be specific and actionable. Keep your response to 100-200 words.`;
      await this.streamPanelistResponse(panelist, prompt, 'moderation');
    }
  }

  async runWrapUp(): Promise<void> {
    this.callbacks.onRoundChange('wrap-up');
    const transcriptContext = this.buildTranscriptContext();

    for (const panelist of this.panelists) {
      if (this.aborted) return;
      const prompt = `${transcriptContext}\n\nThe discussion is wrapping up. Give your single most important takeaway — the one thing this person absolutely must hear. One sentence, specific and actionable.`;
      await this.streamPanelistResponse(panelist, prompt, 'wrap-up');
    }
  }

  async generateSummary(): Promise<string> {
    this.callbacks.onRoundChange('summary');
    const transcriptContext = this.buildTranscriptContext();

    const prompt = `${transcriptContext}\n\nSynthesize this discussion into a structured summary with these sections:\n\n## Key Insights\nBulleted list of the most important points raised.\n\n## Points of Agreement\nWhere the panelists aligned.\n\n## Points of Disagreement\nWhere they diverged and why.\n\n## Top Recommendations\nThe 3-5 most actionable next steps, in priority order.\n\nBe specific and reference which panelists made which points.`;

    try {
      const result = await this.provider.generate([
        { role: 'user', content: prompt },
      ]);
      if (result.usage) {
        this.callbacks.onTokenUsage(result.usage.inputTokens, result.usage.outputTokens);
      }
      return result.text;
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      return 'Error generating summary.';
    }
  }

  async runAutoRounds(): Promise<void> {
    await this.runInitialTakes();
    if (!this.aborted) {
      await this.runCrossTalk();
    }
  }

  abort(): void {
    this.aborted = true;
  }

  get isAborted(): boolean {
    return this.aborted;
  }

  getTranscript(): TranscriptEntry[] {
    return [...this.transcript];
  }

  loadTranscript(transcript: TranscriptEntry[]): void {
    this.transcript = [...transcript];
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd ~/the-fishbowl && npx tsc --noEmit 2>&1 | head -20`
Expected: Errors only in `session/page.tsx` (it doesn't pass `onTokenUsage` yet). Providers and engine should be clean.

- [ ] **Step 3: Commit**

```bash
cd ~/the-fishbowl && git add engine/conversation.ts && git commit -m "feat: add onTokenUsage callback and handle StreamEvent in conversation engine"
```

---

## Task 7: Store — Add modelId + sessionCost

**Files:**
- Modify: `lib/store.ts`

- [ ] **Step 1: Add modelId, sessionCost, and their setters to the store**

In `lib/store.ts`, make these changes:

Add import at top:
```typescript
import { getDefaultModel } from '@/lib/models';
```

Add to `FishbowlState` interface (after `apiKey: string;`):
```typescript
  modelId: string;
  sessionCost: { inputTokens: number; outputTokens: number };
```

Add to interface actions (after `setApiKey`):
```typescript
  setModelId: (id: string) => void;
  addTokenUsage: (input: number, output: number) => void;
```

Add initial values (after `apiKey: ''`):
```typescript
  modelId: getDefaultModel('claude').id,
  sessionCost: { inputTokens: 0, outputTokens: 0 },
```

Add setters (after `setApiKey`):
```typescript
  setModelId: (modelId) => set({ modelId }),
  addTokenUsage: (input, output) => set((s) => ({
    sessionCost: {
      inputTokens: s.sessionCost.inputTokens + input,
      outputTokens: s.sessionCost.outputTokens + output,
    },
  })),
```

Update `setProvider` to reset modelId:
```typescript
  setProvider: (provider) => set({ provider, modelId: getDefaultModel(provider).id }),
```

Update `startSession` to reset sessionCost:
```typescript
  startSession: () => set({ status: 'running', currentRound: 'initial-takes', transcript: [], summary: null, sessionCost: { inputTokens: 0, outputTokens: 0 } }),
```

Update `getSessionConfig` to include modelId:
```typescript
  getSessionConfig: () => {
    const s = get();
    return {
      panelists: s.panelists,
      ideaText: s.ideaText,
      ideaFiles: s.ideaFiles,
      provider: s.provider,
      apiKey: s.apiKey,
      modelId: s.modelId,
    };
  },
```

Update `partialize` to include new fields:
```typescript
  partialize: (state) => ({
    panelists: state.panelists,
    ideaText: state.ideaText,
    ideaFiles: state.ideaFiles,
    provider: state.provider,
    apiKey: state.apiKey,
    modelId: state.modelId,
    status: state.status,
    transcript: state.transcript,
    summary: state.summary,
    currentRound: state.currentRound,
    sessionCost: state.sessionCost,
  }),
```

- [ ] **Step 2: Verify it compiles**

Run: `cd ~/the-fishbowl && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
cd ~/the-fishbowl && git add lib/store.ts && git commit -m "feat: add modelId and sessionCost to store with auto-reset logic"
```

---

## Task 8: API Proxy — TransformStream for Usage Extraction

**Files:**
- Modify: `app/api/llm/route.ts`

- [ ] **Step 1: Replace the route with TransformStream wrappers**

Replace the entire file with:

```typescript
// app/api/llm/route.ts
import { NextRequest } from 'next/server';
import type { LLMRequestBody } from '@/providers/types';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  const body: LLMRequestBody = await req.json();
  const { messages, provider, apiKey, modelId, stream = true } = body;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key is required' }), { status: 400 });
  }

  if (!modelId) {
    return new Response(JSON.stringify({ error: 'Model ID is required' }), { status: 400 });
  }

  try {
    if (provider === 'claude') {
      return await handleClaude(messages, apiKey, modelId, stream);
    } else if (provider === 'openai') {
      return await handleOpenAI(messages, apiKey, modelId, stream);
    } else {
      return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[LLM API Route Error]', message);
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

async function handleClaude(messages: { role: string; content: string }[], apiKey: string, modelId: string, stream?: boolean) {
  const systemMessage = messages.find((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');

  const requestBody: Record<string, unknown> = {
    model: modelId,
    max_tokens: 1024,
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
    // Wrap the upstream stream to extract usage and emit synthetic usage event
    let inputTokens = 0;
    let outputTokens = 0;
    const encoder = new TextEncoder();

    const transform = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        // Pass chunk through unchanged
        controller.enqueue(chunk);

        // Parse the chunk to extract usage data
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
        // Emit synthetic usage event before closing
        if (inputTokens > 0 || outputTokens > 0) {
          const usageEvent = `data: ${JSON.stringify({ type: 'usage', inputTokens, outputTokens })}\n\n`;
          controller.enqueue(encoder.encode(usageEvent));
        }
      },
    });

    return new Response(response.body!.pipeThrough(transform), {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }

  return new Response(response.body, {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleOpenAI(messages: { role: string; content: string }[], apiKey: string, modelId: string, stream?: boolean) {
  const requestBody: Record<string, unknown> = {
    model: modelId,
    messages,
    stream,
  };

  if (stream) {
    requestBody.stream_options = { include_usage: true };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  if (stream) {
    // Wrap the upstream stream to extract usage and emit synthetic usage event
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
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.usage) {
              inputTokens = parsed.usage.prompt_tokens || 0;
              outputTokens = parsed.usage.completion_tokens || 0;
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
        }
      },
    });

    return new Response(response.body!.pipeThrough(transform), {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }

  return new Response(response.body, {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd ~/the-fishbowl && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 3: Commit**

```bash
cd ~/the-fishbowl && git add app/api/llm/route.ts && git commit -m "feat: add TransformStream wrappers to extract and emit token usage from API streams"
```

---

## Task 9: Model Picker UI + Cost Estimate

**Files:**
- Modify: `components/setup/ApiKeyConfig.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Add model dropdown to ApiKeyConfig**

Replace the entire `ApiKeyConfig.tsx` with:

```typescript
// components/setup/ApiKeyConfig.tsx
'use client';

import { useEffect } from 'react';
import type { ProviderType } from '@/engine/types';
import { getModelsForProvider } from '@/lib/models';

interface Props {
  provider: ProviderType;
  apiKey: string;
  modelId: string;
  onProviderChange: (provider: ProviderType) => void;
  onApiKeyChange: (key: string) => void;
  onModelChange: (modelId: string) => void;
}

export default function ApiKeyConfig({ provider, apiKey, modelId, onProviderChange, onApiKeyChange, onModelChange }: Props) {
  useEffect(() => {
    const savedKey = localStorage.getItem(`fishbowl-apikey-${provider}`);
    if (savedKey && !apiKey) onApiKeyChange(savedKey);
  }, [provider]);

  useEffect(() => {
    if (apiKey) localStorage.setItem(`fishbowl-apikey-${provider}`, apiKey);
  }, [apiKey, provider]);

  const models = getModelsForProvider(provider);

  return (
    <div>
      <div className="label-mono mb-4">API Key</div>

      <div className="flex gap-2 mb-3">
        {(['claude', 'openai', 'ollama'] as ProviderType[]).map((p) => (
          <button
            key={p}
            onClick={() => onProviderChange(p)}
            className="px-4 py-2 rounded-lg text-xs font-500 transition-all"
            style={{
              background: provider === p ? 'var(--accent-gold)' : 'var(--bg-surface)',
              color: provider === p ? 'var(--bg-deep)' : 'var(--text-secondary)',
              border: `1px solid ${provider === p ? 'var(--accent-gold)' : 'var(--border)'}`,
            }}
          >
            {p === 'claude' ? 'Claude' : p === 'openai' ? 'OpenAI' : 'Ollama'}
          </button>
        ))}
      </div>

      {provider !== 'ollama' ? (
        <>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={provider === 'claude' ? 'sk-ant-...' : 'sk-...'}
            className="w-full rounded-lg text-sm font-mono p-3"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Stored in your browser only. Goes directly to {provider === 'claude' ? 'Anthropic' : 'OpenAI'}.
          </p>

          {/* Model picker */}
          <div className="mt-4">
            <div className="label-mono mb-2">Model</div>
            <select
              value={modelId}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full rounded-lg text-sm p-3"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — ${m.inputPer1M}/{m.outputPer1M} per 1M tokens
                </option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Make sure Ollama is running on port 11434. No key needed.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire modelId in setup page and add cost estimate**

In `app/page.tsx`, add the import at top:
```typescript
import { estimateSessionCost, formatCost } from '@/lib/models';
```

Update the `ApiKeyConfig` usage to pass model props:
```tsx
<ApiKeyConfig
  provider={store.provider}
  apiKey={store.apiKey}
  modelId={store.modelId}
  onProviderChange={store.setProvider}
  onApiKeyChange={store.setApiKey}
  onModelChange={store.setModelId}
/>
```

Add cost estimate below ApiKeyConfig (before the start button div):
```tsx
{store.provider !== 'ollama' && store.panelists.length >= 3 && (
  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
    {(() => {
      const est = estimateSessionCost(store.modelId, store.panelists.length);
      return `Estimated session cost: ~${formatCost(est.low)} – ${formatCost(est.high)}`;
    })()}
  </div>
)}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd ~/the-fishbowl && npx tsc --noEmit 2>&1 | head -20`

- [ ] **Step 4: Commit**

```bash
cd ~/the-fishbowl && git add components/setup/ApiKeyConfig.tsx app/page.tsx && git commit -m "feat: add model picker dropdown and pre-session cost estimate"
```

---

## Task 10: StatusBar Cost Display

**Files:**
- Modify: `components/scene/StatusBar.tsx`

- [ ] **Step 1: Add cost props and display**

Replace the entire file with:

```typescript
// components/scene/StatusBar.tsx
'use client';

import type { RoundType } from '@/engine/types';
import { formatCost, formatTokens } from '@/lib/models';

interface Props {
  round: RoundType;
  panelistsSpoken: number;
  totalPanelists: number;
  onWrapUp: () => void;
  canWrapUp: boolean;
  costDollars?: number;
  totalTokens?: number;
  isOllama?: boolean;
}

const ROUND_LABELS: Record<RoundType, string> = {
  'initial-takes': 'Round 1 — Initial Takes',
  'cross-talk': 'Round 2 — Cross-Talk',
  'moderation': 'Round 3 — Moderation',
  'wrap-up': 'Final Takeaways',
  'summary': 'Generating Summary...',
};

export default function StatusBar({ round, panelistsSpoken, totalPanelists, onWrapUp, canWrapUp, costDollars, totalTokens, isOllama }: Props) {
  return (
    <div
      className="flex items-center justify-between px-5 py-2.5 max-w-[800px] mx-auto rounded-b-xl"
      style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-gold)' }} />
        <span className="label-mono" style={{ fontSize: '10px', color: 'var(--accent-gold)' }}>
          {ROUND_LABELS[round]}
        </span>
      </div>
      <div className="flex items-center gap-4">
        {totalTokens != null && totalTokens > 0 && (
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {isOllama ? 'Free (local)' : `${formatCost(costDollars || 0)} · ${formatTokens(totalTokens)} tokens`}
          </span>
        )}
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {panelistsSpoken}/{totalPanelists} spoke
        </span>
        {canWrapUp && (
          <button
            onClick={onWrapUp}
            className="px-3 py-1 rounded-lg text-xs font-500 transition-all"
            style={{ background: 'var(--accent-warm)', color: 'var(--bg-deep)' }}
          >
            Wrap Up
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/the-fishbowl && git add components/scene/StatusBar.tsx && git commit -m "feat: add cost display to StatusBar"
```

---

## Task 11: Wire Session Page

**Files:**
- Modify: `app/session/page.tsx`

- [ ] **Step 1: Pass modelId to createProvider, add onTokenUsage, compute cost for StatusBar**

In `app/session/page.tsx`, make these changes:

Add import:
```typescript
import { getModelById, formatCost, formatTokens } from '@/lib/models';
```

In the `useEffect` that creates the provider (around line 122-123), change:
```typescript
const provider = createProvider(s.provider, s.apiKey);
```
to:
```typescript
const provider = createProvider(s.provider, s.apiKey, s.modelId);
```

In the orchestrator callbacks object (around line 132-204), add `onTokenUsage` after `onError`:
```typescript
onTokenUsage: (inputTokens: number, outputTokens: number) => {
  storeRef.current.addTokenUsage(inputTokens, outputTokens);
},
```

Update the StatusBar in the JSX to pass cost props. Compute cost from store:
```tsx
{(() => {
  const model = getModelById(store.modelId);
  const cost = model
    ? (store.sessionCost.inputTokens / 1_000_000) * model.inputPer1M +
      (store.sessionCost.outputTokens / 1_000_000) * model.outputPer1M
    : 0;
  const totalTokens = store.sessionCost.inputTokens + store.sessionCost.outputTokens;
  return (
    <StatusBar
      round={currentRound}
      panelistsSpoken={panelistsSpoken}
      totalPanelists={store.panelists.length}
      onWrapUp={handleWrapUp}
      canWrapUp={inModeration && !isSpeaking}
      costDollars={cost}
      totalTokens={totalTokens}
      isOllama={store.provider === 'ollama'}
    />
  );
})()}
```

- [ ] **Step 2: Verify full build**

Run: `cd ~/the-fishbowl && npx next build 2>&1 | tail -20`
Expected: Clean build, all pages compile.

- [ ] **Step 3: Commit**

```bash
cd ~/the-fishbowl && git add app/session/page.tsx && git commit -m "feat: wire modelId and live cost tracking into session page"
```

---

## Task 12: Test Page — Simulated Cost Meter

**Files:**
- Modify: `app/test/page.tsx`

- [ ] **Step 1: Add fake token accumulation and pass cost to StatusBar**

At the top of the file, add import:
```typescript
import { formatCost, formatTokens } from '@/lib/models';
```

Add state inside the component (near the other state declarations):
```typescript
const [fakeTokens, setFakeTokens] = useState({ input: 0, output: 0 });
```

Add a helper to compute fake tokens from text length:
```typescript
const addFakeTokens = useCallback((text: string) => {
  const outputTokens = Math.round(text.split(' ').length * 1.3);
  const inputTokens = 500; // approximate fixed input per turn
  setFakeTokens((prev) => ({
    input: prev.input + inputTokens,
    output: prev.output + outputTokens,
  }));
}, []);
```

Call `addFakeTokens` after each `streamRoundtableText` and `streamBriefingText` call in `runDemo`, `handleModeration`, and `handleWrapUp`. Add it after each streaming call, e.g.:
```typescript
await streamBriefingText(INITIAL_TAKES[i]);
addFakeTokens(INITIAL_TAKES[i]);
```

Update both StatusBar usages (there are two — roundtable view and the one in test) to pass cost:
```tsx
{(() => {
  // Sonnet 4.6 pricing for simulation
  const cost = (fakeTokens.input / 1_000_000) * 3.00 + (fakeTokens.output / 1_000_000) * 15.00;
  const total = fakeTokens.input + fakeTokens.output;
  return (
    <StatusBar
      round={currentRound}
      panelistsSpoken={panelistsSpoken}
      totalPanelists={FAKE_PANELISTS.length}
      onWrapUp={handleWrapUp}
      canWrapUp={inModeration && !isSpeaking}
      costDollars={cost}
      totalTokens={total}
    />
  );
})()}
```

- [ ] **Step 2: Verify build**

Run: `cd ~/the-fishbowl && npx next build 2>&1 | tail -20`

- [ ] **Step 3: Commit**

```bash
cd ~/the-fishbowl && git add app/test/page.tsx && git commit -m "feat: add simulated cost meter to test page"
```

---

## Task 13: Results Page — Show Total Cost

**Files:**
- Modify: `app/results/page.tsx`

- [ ] **Step 1: Add cost display to results page**

Add import at top:
```typescript
import { getModelById, formatCost, formatTokens } from '@/lib/models';
```

In the JSX, update the subtitle line (around line 57-58) to include cost:
```tsx
<p className="text-gray-500 mt-2">
  {store.panelists.length} panelists &middot; {store.transcript.length} messages
  {(() => {
    const model = getModelById(store.modelId);
    const tokens = store.sessionCost.inputTokens + store.sessionCost.outputTokens;
    if (!model || tokens === 0) return null;
    const cost = (store.sessionCost.inputTokens / 1_000_000) * model.inputPer1M +
      (store.sessionCost.outputTokens / 1_000_000) * model.outputPer1M;
    return <> &middot; {formatCost(cost)} ({formatTokens(tokens)} tokens)</>;
  })()}
</p>
```

- [ ] **Step 2: Verify build**

Run: `cd ~/the-fishbowl && npx next build 2>&1 | tail -20`
Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
cd ~/the-fishbowl && git add app/results/page.tsx && git commit -m "feat: show total session cost on results page"
```

---

## Task 14: Final Verification

- [ ] **Step 1: Full build**

Run: `cd ~/the-fishbowl && npx next build 2>&1 | tail -20`
Expected: All pages compile, no TypeScript errors.

- [ ] **Step 2: Test the test page**

Run: `cd ~/the-fishbowl && npm run dev`

Open `http://localhost:3000/test`. Verify:
- Cost meter appears in StatusBar after first speaker
- Running tally increases after each panelist speaks
- Shows dollar amount and token count (e.g., `$0.01 · 2.3K tokens`)
- Moderation questions and wrap-up also increment the counter

- [ ] **Step 3: Test the setup page**

Open `http://localhost:3000`. Verify:
- Model dropdown appears below API key input
- Options change when switching providers (Claude vs OpenAI)
- No dropdown for Ollama
- Cost estimate appears below ApiKeyConfig when 3+ panelists are configured
- Estimate changes when switching models

- [ ] **Step 4: Commit any fixes**

If anything needed fixing, commit the fixes.
