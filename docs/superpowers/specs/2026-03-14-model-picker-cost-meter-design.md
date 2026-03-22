# Model Picker & Live Cost Meter — Design Spec

## Problem

The Fishbowl is a BYOK tool where users pay directly for API usage, but they have zero visibility into what a session costs. There's no model selector (defaults are hardcoded), no cost information on the setup page, and no tracking during sessions. Users can't make informed decisions about which model to use or when to stop asking questions.

## Solution

Two features:
1. **Model picker** — dropdown on the setup page, auto-populated per provider, with pricing info
2. **Live cost meter** — real token counts from API responses, displayed as a running dollar amount in the StatusBar during sessions, with a pre-session estimate on the setup page

## Design

### 1. Model Registry (`lib/models.ts`)

A static registry of supported models with pricing metadata. Single source of truth for model IDs, display names, and per-token costs. Pricing current as of March 2026.

```typescript
interface ModelOption {
  id: string;           // API model ID (e.g., "claude-sonnet-4-6-20250514")
  label: string;        // Display name (e.g., "Sonnet 4.6")
  tier: string;         // "fast" | "balanced" | "smartest"
  inputPer1M: number;   // Cost per 1M input tokens in USD
  outputPer1M: number;  // Cost per 1M output tokens in USD
}
```

**Claude models:**

| Label | Model ID | Tier | Input $/M | Output $/M |
|-------|----------|------|-----------|------------|
| Haiku 4.5 | claude-haiku-4-5-20251001 | fast | $1.00 | $5.00 |
| Sonnet 4.6 | claude-sonnet-4-6-20250514 | balanced | $3.00 | $15.00 |
| Opus 4.6 | claude-opus-4-6-20250514 | smartest | $15.00 | $75.00 |

**OpenAI models:**

| Label | Model ID | Tier | Input $/M | Output $/M |
|-------|----------|------|-----------|------------|
| GPT-4o Mini | gpt-4o-mini | fast | $0.15 | $0.60 |
| GPT-5 | gpt-5 | balanced | $1.25 | $10.00 |
| GPT-5.2 | gpt-5.2 | smartest | $1.75 | $14.00 |

**Ollama:** No picker needed — free, local. User can optionally type a model name. No cost tracking.

**Defaults:** Middle tier (balanced) per provider — Sonnet 4.6 for Claude, GPT-5 for OpenAI.

Helper functions:
- `getModelsForProvider(provider: ProviderType): ModelOption[]`
- `getDefaultModel(provider: ProviderType): ModelOption`
- `getModelById(id: string): ModelOption | undefined`
- `estimateSessionCost(modelId: string, panelistCount: number): { low: number, high: number }` — rough pre-session estimate based on expected token usage per round

### 2. Store Changes (`lib/store.ts`)

Add `modelId: string` and `sessionCost` to the Zustand store, persisted in sessionStorage.

New fields:
- `modelId: string` — selected model ID
- `sessionCost: { inputTokens: number, outputTokens: number }` — accumulated token usage

New actions:
- `setModelId(id: string)` — set selected model
- `addTokenUsage(input: number, output: number)` — accumulate token counts from API responses

Behavior:
- When provider changes, `modelId` auto-resets to that provider's default.
- `startSession()` resets `sessionCost` to `{ inputTokens: 0, outputTokens: 0 }`.
- `sessionCost` is included in persisted state (so the results page can display total cost).

### 3. Model Picker UI (`components/setup/ApiKeyConfig.tsx`)

Add a `<select>` dropdown below the API key input. It renders the models for the currently selected provider.

Each option shows: `{label} — ${inputPer1M}/${outputPer1M} per 1M tokens`

Example for Claude:
```
Haiku 4.5 — $1/$5 per 1M tokens
Sonnet 4.6 — $3/$15 per 1M tokens      ← selected by default
Opus 4.6 — $15/$75 per 1M tokens
```

For Ollama: show a text input for model name instead of a dropdown (default: "llama3").

### 4. Pre-Session Cost Estimate (setup page — `app/page.tsx`)

Display the cost estimate in the parent setup page (not inside ApiKeyConfig), since it needs both `modelId` and `panelistCount` which are managed at the page level. Show a small line below the ApiKeyConfig section:

> Estimated session cost: ~$0.08 – $0.25

Calculation based on:
- Model's per-token pricing (from registry)
- Number of panelists (from store)
- Expected rounds: briefing (1 response per panelist) + cross-talk (2 rounds × N panelists) + ~2 moderation questions + wrap-up
- Assume ~200 words output per response (~267 tokens) and ~500 tokens input per prompt (system prompt + context)
- Shows a range (low = minimal moderation, high = heavy moderation)

For Ollama, show "Free (local)" instead of a dollar amount.

This is an estimate only — the live meter during the session shows actuals.

### 5. API Proxy Token Reporting (`app/api/llm/route.ts`)

The current route streams the upstream response body as a direct passthrough. To inject usage data, wrap the upstream `ReadableStream` in a `TransformStream` that:

1. Passes all upstream chunks through to the client unchanged
2. Intercepts provider-native usage events from the stream
3. Before closing, emits a final synthetic SSE event with unified format:
   ```
   data: {"type":"usage","inputTokens":523,"outputTokens":267}
   ```

**Claude handler:** The Anthropic streaming API sends events as SSE. The `message_start` event contains `usage.input_tokens` and the final `message_delta` event contains `usage.output_tokens`. The TransformStream watches for these events as they pass through, extracts the token counts, and appends the synthetic `usage` event before the stream closes.

**OpenAI handler:** Add `stream_options: { include_usage: true }` to the API request body. The final chunk includes `usage.prompt_tokens` and `usage.completion_tokens`. The TransformStream extracts these and appends the synthetic `usage` event.

Both handlers emit the same `{"type":"usage",...}` format so client-side parsing is provider-agnostic.

Also: remove the hardcoded model fallbacks (`|| 'claude-sonnet-4-20250514'` and `|| 'gpt-4o'`) from the route. The client will always send `modelId` after this change.

### 6. Provider Client-Side Stream Events (`providers/claude.ts`, `providers/openai.ts`)

Change the `stream()` return type from `AsyncIterable<string>` to `AsyncIterable<StreamEvent>`:

```typescript
type StreamEvent =
  | { type: 'text'; text: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number };
```

Both providers parse the SSE stream and yield `{ type: 'text', text }` for content chunks and `{ type: 'usage', inputTokens, outputTokens }` for the final usage event.

Update the `LLMProvider` interface:
```typescript
interface LLMProvider {
  stream(messages: Message[]): AsyncIterable<StreamEvent>;
  generate(messages: Message[]): Promise<GenerateResult>;
}
```

The `generate()` method also returns usage. Both Claude and OpenAI non-streaming responses include usage in the JSON body. Change return type:
```typescript
interface GenerateResult {
  text: string;
  usage?: { inputTokens: number; outputTokens: number };
}
```

This matters because `generate()` is used for summary generation, which can be expensive.

### 7. Conversation Engine Token Accumulation (`engine/conversation.ts`)

Add a new callback to `ConversationCallbacks`:
```typescript
onTokenUsage: (inputTokens: number, outputTokens: number) => void;
```

Update `streamPanelistResponse()` to handle the typed stream events:
- `{ type: 'text' }` → existing behavior (stream chunk to UI)
- `{ type: 'usage' }` → call `this.callbacks.onTokenUsage()`

Update `generateSummary()` to extract usage from the `GenerateResult` and call `onTokenUsage`.

### 8. Session Page Wiring (`app/session/page.tsx`)

- Pass `store.modelId` to `createProvider()`
- Add `onTokenUsage` callback that calls `store.addTokenUsage()`
- Compute running cost: `(inputTokens / 1_000_000) * model.inputPer1M + (outputTokens / 1_000_000) * model.outputPer1M`
- Pass cost props to StatusBar

### 9. StatusBar Cost Display (`components/scene/StatusBar.tsx`)

Add a cost display to the right side of the StatusBar:

```
[Round label]  [X/N spoke]                    [$0.04 · 1.2K tokens]  [Wrap Up]
```

New props: `costDollars?: number`, `totalTokens?: number`

Formatting:
- Dollars: `$0.00` at session start (hidden until first response completes), then `$0.XX` for cents, `$X.XX` for dollars
- Tokens: raw number below 1K (e.g., `847`), then `1.2K`, `15.4K`, etc.
- For Ollama sessions: show "Free (local)" instead of dollar amount

### 10. Test Page (`app/test/page.tsx`)

Add a simulated cost meter to the test page:
- Derive fake token counts from actual word counts of canned responses (words × 1.3 for output tokens, ~500 fixed for input tokens per turn)
- Accumulate a running tally in local state
- Pass cost/token props to StatusBar using the same component
- Use Sonnet 4.6 pricing for the simulation so the numbers feel realistic

### 11. Ollama Handling

- No model dropdown — text input for model name (default "llama3")
- Cost meter shows "Free (local)" instead of dollar amounts
- No token tracking (Ollama doesn't reliably report usage in streaming mode)

### 12. Results Page (`app/results/page.tsx`)

Show total session cost on the results page:
- Read `sessionCost` from the store
- Display as "Session cost: $X.XX (N tokens)" near the summary
- Include in the markdown export

## Files Changed

| File | Change |
|------|--------|
| `lib/models.ts` | **New** — model registry with pricing |
| `lib/store.ts` | Add `modelId`, `sessionCost`, setters, reset in `startSession()` |
| `app/page.tsx` | Add cost estimate display below ApiKeyConfig |
| `components/setup/ApiKeyConfig.tsx` | Add model dropdown, pass modelId up |
| `app/api/llm/route.ts` | TransformStream wrapper for usage events, remove hardcoded model defaults |
| `providers/types.ts` | `StreamEvent` type, update `LLMProvider` interface, `GenerateResult` type |
| `providers/claude.ts` | Yield `StreamEvent` from stream, return `GenerateResult` from generate |
| `providers/openai.ts` | Yield `StreamEvent` from stream, return `GenerateResult` from generate |
| `engine/types.ts` | No changes needed (SessionConfig already has `modelId?`) |
| `engine/conversation.ts` | Add `onTokenUsage` callback, handle `StreamEvent`, extract usage from generate |
| `app/session/page.tsx` | Pass modelId, wire onTokenUsage, compute cost, pass to StatusBar |
| `components/scene/StatusBar.tsx` | Add cost display with new props |
| `app/test/page.tsx` | Simulated cost meter with word-count-derived fake token counts |
| `app/results/page.tsx` | Show total session cost |

## Out of Scope

- Exact token counting for Ollama (unreliable in streaming mode)
- Caching discounts or batch pricing
- Budget limits / spending caps (future feature)
- Token-level cost breakdown in transcript entries (keep it simple — just a running total)
- Ollama local model discovery via `/api/tags` (future enhancement)
