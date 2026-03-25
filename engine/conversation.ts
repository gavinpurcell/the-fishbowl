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

interface PrefetchedResponse {
  text: string;
  chunks: string[];
  inputTokens: number;
  outputTokens: number;
  ready: boolean;
  error?: string;
}

/** Maximum retries for transient failures */
const MAX_RETRIES = 2;

/** Base delay for exponential backoff (ms) */
const RETRY_BASE_DELAY_MS = 1500;

/** Timeout for a single LLM streaming call (ms) — 90 seconds */
const STREAM_TIMEOUT_MS = 90_000;

/** Timeout for a non-streaming generate call (ms) — 60 seconds */
const GENERATE_TIMEOUT_MS = 60_000;

/**
 * Classify an error and return a user-friendly message.
 * Returns { message, retryable } so the caller knows whether to retry.
 */
function classifyError(error: unknown): { message: string; retryable: boolean } {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();

  // Rate limit / overloaded
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) {
    return { message: 'The AI service is rate-limited. Retrying shortly...', retryable: true };
  }
  if (lower.includes('529') || lower.includes('overloaded')) {
    return { message: 'The AI service is temporarily overloaded. Retrying...', retryable: true };
  }

  // Timeout
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('aborted')) {
    return { message: 'The request timed out. The AI service may be slow right now.', retryable: true };
  }

  // Network errors
  if (lower.includes('fetch failed') || lower.includes('network') || lower.includes('econnrefused')
    || lower.includes('econnreset') || lower.includes('enotfound') || lower.includes('failed to fetch')) {
    return { message: 'Network connection error. Check your internet connection.', retryable: true };
  }

  // Server errors (500, 502, 503)
  if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('internal server error')
    || lower.includes('bad gateway') || lower.includes('service unavailable')) {
    return { message: 'The AI service encountered a temporary error. Retrying...', retryable: true };
  }

  // Auth errors — not retryable
  if (lower.includes('401') || lower.includes('403') || lower.includes('unauthorized') || lower.includes('forbidden')
    || lower.includes('invalid.*key') || lower.includes('authentication')) {
    return { message: 'API authentication failed. Please check your API key in Settings.', retryable: false };
  }

  // Invalid request — not retryable
  if (lower.includes('400') || lower.includes('invalid request') || lower.includes('bad request')) {
    return { message: 'The request was invalid. This may be a configuration issue.', retryable: false };
  }

  // Context length exceeded — not retryable
  if (lower.includes('context length') || lower.includes('too long') || lower.includes('max.*tokens')) {
    return { message: 'The conversation is too long for the model. Try wrapping up or starting a new session.', retryable: false };
  }

  // Generic fallback — retry once in case it's transient
  return { message: `An unexpected error occurred: ${raw.slice(0, 150)}`, retryable: true };
}

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create an AbortController that auto-aborts after a timeout.
 */
function createTimeoutController(timeoutMs: number): { controller: AbortController; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    controller,
    clear: () => clearTimeout(timer),
  };
}

export class ConversationOrchestrator {
  private transcript: TranscriptEntry[] = [];
  private aborted = false;
  private prefetchedInitialTakes: Map<string, PrefetchedResponse> = new Map();
  private prefetchedCrossTalk: Map<string, PrefetchedResponse> = new Map();
  private prefetchedModeration: Map<string, PrefetchedResponse> = new Map();
  private prefetching = false;
  /** Count of consecutive panelist failures — used to abort if everything is broken */
  private consecutiveFailures = 0;

  constructor(
    private panelists: Panelist[],
    private ideaText: string,
    private ideaFiles: FileContent[],
    private provider: LLMProvider,
    private callbacks: ConversationCallbacks
  ) {}

  /**
   * Start pre-fetching all initial takes in parallel.
   * Call this immediately when the session starts (before user presses space).
   */
  prefetchInitialTakes(): void {
    if (this.prefetching) return;
    this.prefetching = true;

    const ideaContext = this.buildIdeaContext();
    const prompt = `${ideaContext}\n\nReact naturally, like you just heard this pitch for the first time. What stands out? What concerns you? What excites you? Be specific and draw on your expertise. Focus on what YOUR specific expertise reveals that others might miss. Keep your response to 100-200 words. Write in plain text only. No markdown, no em-dashes, no formatting.`;

    for (const panelist of this.panelists) {
      const prefetched: PrefetchedResponse = {
        text: '',
        chunks: [],
        inputTokens: 0,
        outputTokens: 0,
        ready: false,
      };
      this.prefetchedInitialTakes.set(panelist.id, prefetched);

      const messages: Message[] = [
        { role: 'system', content: panelist.systemPrompt },
        { role: 'user', content: prompt },
      ];

      // Fire and forget — runs in background, catch to prevent unhandled rejection
      this.prefetchWithRetry(panelist, messages, prefetched).catch((err) => {
        console.error(`[prefetch] Unhandled error for panelist ${panelist.id}:`, err);
        prefetched.error = err instanceof Error ? err.message : String(err);
        prefetched.ready = true;
      });
    }
  }

  /**
   * Prefetch a single panelist's response with retry logic.
   */
  private async prefetchWithRetry(
    panelist: Panelist,
    messages: Message[],
    prefetched: PrefetchedResponse
  ): Promise<void> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (this.aborted) break;

      try {
        // Reset state for retry
        if (attempt > 0) {
          prefetched.text = '';
          prefetched.chunks = [];
          prefetched.inputTokens = 0;
          prefetched.outputTokens = 0;
          await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1));
        }

        for await (const event of this.provider.stream(messages)) {
          if (this.aborted) break;
          if (event.type === 'text') {
            prefetched.text += event.text;
            prefetched.chunks.push(event.text);
          } else if (event.type === 'usage') {
            prefetched.inputTokens = event.inputTokens;
            prefetched.outputTokens = event.outputTokens;
          }
        }

        // Success — break out of retry loop
        prefetched.ready = true;
        return;
      } catch (err) {
        const classified = classifyError(err);

        if (!classified.retryable || attempt === MAX_RETRIES) {
          prefetched.error = classified.message;
          prefetched.ready = true;
          return;
        }
        // Will retry on next iteration
      }
    }

    prefetched.ready = true;
  }

  /**
   * Pre-fetch all cross-talk responses in parallel using the current transcript
   * (which should contain all initial takes at this point). Each panelist's
   * response is generated independently so they won't reference each other's
   * cross-talk, but they'll all respond to the initial takes.
   */
  prefetchCrossTalk(): void {
    this.prefetchedCrossTalk.clear();

    const ideaContext = this.buildIdeaContext();
    const transcriptContext = this.buildTranscriptContext();
    const prompt = `${ideaContext}\n\n${transcriptContext}\n\nJump in like you would in a real meeting. Push back, challenge, or build on what was said. Reference specific panelists by name. Do NOT restate or summarize points that were already made. If you agree with something, say so in one line and move on to a NEW point. Bring something to the table that hasn't been said yet. Keep your response to 100-200 words. Write in plain text only. No markdown, no em-dashes, no formatting.`;

    for (const panelist of this.panelists) {
      const prefetched: PrefetchedResponse = {
        text: '',
        chunks: [],
        inputTokens: 0,
        outputTokens: 0,
        ready: false,
      };
      this.prefetchedCrossTalk.set(panelist.id, prefetched);

      const messages: Message[] = [
        { role: 'system', content: panelist.systemPrompt },
        { role: 'user', content: prompt },
      ];

      this.prefetchWithRetry(panelist, messages, prefetched).catch((err) => {
        console.error(`[prefetch-crosstalk] Error for ${panelist.id}:`, err);
        prefetched.error = err instanceof Error ? err.message : String(err);
        prefetched.ready = true;
      });
    }
  }

  /**
   * Pre-fetch all panelist responses to a moderation question in parallel.
   * Uses the current transcript snapshot (includes everything said so far).
   */
  prefetchModerationResponses(question: string): void {
    this.prefetchedModeration.clear();

    const ideaContext = this.buildIdeaContext();
    const transcriptContext = this.buildTranscriptContext();
    const prompt = `${ideaContext}\n\n${transcriptContext}\n\nModerator: ${question}\n\nThe moderator has stepped in with a question or directive. Respond directly to what they asked. You can reference what other panelists have said but do NOT repeat their points. If a previous panelist already answered part of the question, acknowledge it briefly and add something new. Be specific and actionable. Keep your response to 100-200 words. Write in plain text only. No markdown, no em-dashes, no formatting.`;

    for (const panelist of this.panelists) {
      const prefetched: PrefetchedResponse = {
        text: '',
        chunks: [],
        inputTokens: 0,
        outputTokens: 0,
        ready: false,
      };
      this.prefetchedModeration.set(panelist.id, prefetched);

      const messages: Message[] = [
        { role: 'system', content: panelist.systemPrompt },
        { role: 'user', content: prompt },
      ];

      this.prefetchWithRetry(panelist, messages, prefetched).catch((err) => {
        console.error(`[prefetch-moderation] Error for ${panelist.id}:`, err);
        prefetched.error = err instanceof Error ? err.message : String(err);
        prefetched.ready = true;
      });
    }
  }

  private buildIdeaContext(): string {
    let context = '';
    if (this.ideaText) {
      context += `The Idea:\n\n${this.ideaText}\n\n`;
    }
    for (const file of this.ideaFiles) {
      context += `File: ${file.name}\n\n${file.content}\n\n`;
    }
    return context;
  }

  private buildTranscriptContext(): string {
    if (this.transcript.length === 0) return '';
    let text = 'Discussion So Far:\n\n';
    for (const entry of this.transcript) {
      text += `${entry.panelistName}: ${entry.content}\n\n`;
    }
    return text;
  }

  /** Log the prompt being sent to a panelist (for debugging) */
  private logPrompt(panelist: Panelist, round: string, prompt: string): void {
    console.log(`\n========== [${round}] ${panelist.name} ==========`);
    console.log(`System: ${panelist.systemPrompt.slice(0, 100)}...`);
    console.log(`Transcript entries in context: ${this.transcript.length}`);
    this.transcript.forEach((e, i) => {
      console.log(`  [${i}] ${e.panelistName} (${e.round}): ${e.content.slice(0, 60)}...`);
    });
    console.log(`Prompt length: ${prompt.length} chars`);
    console.log('='.repeat(50));
  }

  /**
   * Stream a single panelist response with retry logic and timeout.
   * On failure after retries, records a skip message instead of aborting the session.
   */
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

    this.logPrompt(panelist, round, userPrompt);

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
    let lastError: { message: string; retryable: boolean } | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (this.aborted) break;

      try {
        // On retry, wait with exponential backoff and reset accumulated text
        if (attempt > 0) {
          const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await sleep(delay);
          fullResponse = '';
        }

        // Create a timeout race
        const { controller: timeoutCtrl, clear: clearTimeout_ } = createTimeoutController(STREAM_TIMEOUT_MS);

        try {
          const streamPromise = this.consumeStream(panelist.id, messages, timeoutCtrl.signal);
          fullResponse = await streamPromise;
          clearTimeout_();
        } catch (innerErr) {
          clearTimeout_();
          throw innerErr;
        }

        // Success
        this.consecutiveFailures = 0;
        entry.content = fullResponse;
        this.transcript.push(entry);
        this.callbacks.onPanelistDeactivated();
        return fullResponse;
      } catch (error) {
        lastError = classifyError(error);

        // Don't retry non-retryable errors
        if (!lastError.retryable) break;
      }
    }

    // All retries exhausted — graceful degradation
    const errorMsg = lastError?.message || 'Failed to generate response';
    this.consecutiveFailures++;

    // If 3+ panelists fail in a row, something systemic is wrong — abort
    if (this.consecutiveFailures >= 3) {
      this.callbacks.onError(new Error(`Multiple panelists failed in a row. ${errorMsg}`));
      fullResponse = `[Could not generate response: ${errorMsg}]`;
      entry.content = fullResponse;
      this.transcript.push(entry);
      this.callbacks.onPanelistDeactivated();
      this.aborted = true;
      return fullResponse;
    }

    // Skip this panelist but continue the session
    this.callbacks.onError(
      new Error(`${panelist.name} couldn't respond — skipping. ${errorMsg}`)
    );
    fullResponse = `[Skipped: ${errorMsg}]`;
    entry.content = fullResponse;
    this.transcript.push(entry);
    this.callbacks.onPanelistDeactivated();
    return fullResponse;
  }

  /**
   * Consume the provider stream, yielding chunks via callbacks.
   * Passes the AbortSignal to the provider so the underlying fetch is
   * cancelled when the timeout fires (or when the session is aborted).
   */
  private async consumeStream(
    panelistId: string,
    messages: Message[],
    signal: AbortSignal
  ): Promise<string> {
    let fullResponse = '';

    // Pass signal to the provider so the underlying fetch is cancelled on abort
    const streamIterator = this.provider.stream(messages, { signal });

    for await (const event of streamIterator) {
      if (this.aborted) break;
      if (signal.aborted) {
        throw new Error('Request timed out');
      }
      if (event.type === 'text') {
        fullResponse += event.text;
        this.callbacks.onStreamChunk(panelistId, event.text);
      } else if (event.type === 'usage') {
        this.callbacks.onTokenUsage(event.inputTokens, event.outputTokens);
      }
    }

    return fullResponse;
  }

  async runInitialTakes(): Promise<void> {
    this.callbacks.onRoundChange('initial-takes');
    for (const panelist of this.panelists) {
      if (this.aborted) return;

      const prefetched = this.prefetchedInitialTakes.get(panelist.id);
      if (prefetched) {
        await this.replayPrefetched(panelist, prefetched, 'initial-takes');
      } else {
        await this.runSinglePanelist(panelist, 'initial-takes');
      }
    }
  }

  /**
   * Replay a prefetched response — waits for it to finish if still generating,
   * then streams chunks with a small delay so it looks like live streaming.
   * If the prefetch failed, falls back to a live request with retry.
   */
  private async replayPrefetched(
    panelist: Panelist,
    prefetched: PrefetchedResponse,
    round: RoundType
  ): Promise<void> {
    if (this.aborted) return;

    // Wait for prefetch to finish
    while (!prefetched.ready && !this.aborted) {
      await sleep(50);
    }

    // If prefetch failed, fall back to a fresh live request with retry
    if (prefetched.error) {
      this.prefetchedInitialTakes.delete(panelist.id);
      await this._runSinglePanelist(panelist, round);
      return;
    }

    this.callbacks.onPanelistActivated(panelist.id);

    const entry: TranscriptEntry = {
      id: generateId(),
      panelistId: panelist.id,
      panelistName: panelist.name,
      content: '',
      round,
      timestamp: Date.now(),
    };
    this.callbacks.onTranscriptEntry(entry);

    // Stream chunks as they arrive (or replay if already done).
    // When replaying cached chunks, use a slower delay so the text feels
    // like it's being typed out in real time rather than dumped all at once.
    let emitted = 0;

    while (!this.aborted) {
      // Emit any new chunks
      while (emitted < prefetched.chunks.length) {
        this.callbacks.onStreamChunk(panelist.id, prefetched.chunks[emitted]);
        emitted++;
        if (prefetched.ready) {
          // Replay delay: 100ms per chunk gives a natural typing cadence
          // that feels like real-time generation even though it's pre-loaded
          await new Promise((r) => setTimeout(r, 100));
        }
      }

      if (prefetched.ready) break;
      // Still generating — wait for more data
      await new Promise((r) => setTimeout(r, 50));
    }

    entry.content = prefetched.text;
    this.consecutiveFailures = 0;

    if (prefetched.inputTokens || prefetched.outputTokens) {
      this.callbacks.onTokenUsage(prefetched.inputTokens, prefetched.outputTokens);
    }

    this.transcript.push(entry);
    this.callbacks.onPanelistDeactivated();
  }

  /**
   * Run a single panelist — uses prefetched data if available.
   */
  async runSinglePanelist(panelist: Panelist, round: RoundType): Promise<void> {
    // Use prefetched response if available
    if (round === 'initial-takes') {
      const prefetched = this.prefetchedInitialTakes.get(panelist.id);
      if (prefetched) {
        await this.replayPrefetched(panelist, prefetched, round);
        return;
      }
    }
    if (round === 'cross-talk') {
      const prefetched = this.prefetchedCrossTalk.get(panelist.id);
      if (prefetched) {
        await this.replayPrefetched(panelist, prefetched, round);
        return;
      }
    }
    await this._runSinglePanelist(panelist, round);
  }

  private async _runSinglePanelist(panelist: Panelist, round: RoundType): Promise<void> {
    if (this.aborted) return;

    const ideaContext = this.buildIdeaContext();
    const transcriptContext = this.buildTranscriptContext();

    let prompt: string;
    if (round === 'initial-takes') {
      prompt = `${ideaContext}\n\nReact naturally, like you just heard this pitch for the first time. What stands out? What concerns you? What excites you? Be specific and draw on your expertise. Focus on what YOUR specific expertise reveals that others might miss. Keep your response to 100-200 words. Write in plain text only. No markdown, no em-dashes, no formatting.`;
    } else if (round === 'cross-talk') {
      prompt = `${ideaContext}\n\n${transcriptContext}\n\nJump in like you would in a real meeting. Push back, challenge, or build on what was said. Reference specific panelists by name. Do NOT restate or summarize points that were already made. If you agree with something, say so in one line and move on to a NEW point. Bring something to the table that hasn't been said yet. Keep your response to 100-200 words. Write in plain text only. No markdown, no em-dashes, no formatting.`;
    } else if (round === 'wrap-up') {
      prompt = `${transcriptContext}\n\nThe discussion is wrapping up. Give one honest takeaway in a single sentence. Be real. No markdown, no em-dashes, just plain talk.`;
    } else {
      prompt = `${ideaContext}\n\n${transcriptContext}\n\nShare your thoughts naturally. Keep your response to 100-200 words. Write in plain text only. No markdown, no em-dashes, no formatting.`;
    }

    await this.streamPanelistResponse(panelist, prompt, round);
  }

  async runCrossTalk(): Promise<void> {
    this.callbacks.onRoundChange('cross-talk');
    const ideaContext = this.buildIdeaContext();

    for (const panelist of this.panelists) {
      if (this.aborted) return;
      const transcriptContext = this.buildTranscriptContext();
      const prompt = `${ideaContext}\n\n${transcriptContext}\n\nJump in like you would in a real meeting. Push back, challenge, or build on what was said. Reference specific panelists by name. Do NOT restate or summarize points that were already made. If you agree with something, say so in one line and move on to a NEW point. Bring something to the table that hasn't been said yet. Keep your response to 100-200 words. Write in plain text only. No markdown, no em-dashes, no formatting.`;
      await this.streamPanelistResponse(panelist, prompt, 'cross-talk');
    }
  }

  /** Record the moderator question in the transcript */
  recordModerationQuestion(question: string): void {
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
  }

  /** Run a single panelist's moderation response.
   *  Always generates live (not prefetched) using the CURRENT transcript,
   *  so each panelist sees what previous panelists said in response to
   *  the same question — creating a real back-and-forth discussion. */
  async runModerationPanelist(panelist: Panelist, question: string): Promise<void> {
    if (this.aborted) return;
    const ideaContext = this.buildIdeaContext();
    // Build transcript fresh each time — includes previous panelists' responses
    const transcriptContext = this.buildTranscriptContext();
    const prompt = `${ideaContext}\n\n${transcriptContext}\n\nModerator: ${question}\n\nThe moderator has stepped in with a question or directive. Respond directly to what they asked. You can react to what other panelists have said, but do NOT repeat their points. If someone already made the point you were going to make, acknowledge it briefly ("Like Jordan said...") and move to a NEW angle. Bring your unique expertise. Be specific and actionable. Keep your response to 100-200 words. Write in plain text only. No markdown, no em-dashes, no formatting.`;
    await this.streamPanelistResponse(panelist, prompt, 'moderation');
  }


  async runWrapUp(): Promise<void> {
    this.callbacks.onRoundChange('wrap-up');
    const transcriptContext = this.buildTranscriptContext();

    for (const panelist of this.panelists) {
      if (this.aborted) return;
      const prompt = `${transcriptContext}\n\nThe discussion is wrapping up. Give one honest takeaway in a single sentence. Be real. No markdown, no em-dashes, just plain talk.`;
      await this.streamPanelistResponse(panelist, prompt, 'wrap-up');
    }
  }

  /**
   * Generate the session summary with retry logic and timeout.
   */
  async generateSummary(): Promise<string> {
    this.callbacks.onRoundChange('summary');
    const transcriptContext = this.buildTranscriptContext();

    const prompt = `${transcriptContext}\n\nSynthesize this discussion into a structured summary using the following markdown format:\n\nUse ## headings for each section: ## Key Insights, ## Points of Agreement, ## Points of Disagreement, ## Top Recommendations.\n\nUse **bold** for panelist names when referencing who said what.\n\nUse - bullet lists for multiple points within a section.\n\nUse 1. numbered lists for the Top Recommendations (in priority order, 3 to 5 items).\n\nUse > blockquotes for one or two notable direct quotes from panelists.\n\nBe specific and reference which panelists made which points.`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1));
        }

        const result = await Promise.race([
          this.provider.generate([{ role: 'user', content: prompt }]),
          sleep(GENERATE_TIMEOUT_MS).then(() => {
            throw new Error('Summary generation timed out');
          }),
        ]);

        // result is GenerateResult since the timeout path throws
        const generateResult = result as { text: string; usage?: { inputTokens: number; outputTokens: number } };
        if (generateResult.usage) {
          this.callbacks.onTokenUsage(generateResult.usage.inputTokens, generateResult.usage.outputTokens);
        }
        return generateResult.text;
      } catch (error) {
        const classified = classifyError(error);

        if (!classified.retryable || attempt === MAX_RETRIES) {
          this.callbacks.onError(new Error(classified.message));
          return 'Unable to generate summary. You can still review the full transcript above.';
        }
        // Will retry on next iteration
      }
    }

    return 'Unable to generate summary. You can still review the full transcript above.';
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

  /** Check if a panelist's initial take has been prefetched and is ready */
  isInitialTakeReady(panelistId: string): boolean {
    const prefetched = this.prefetchedInitialTakes.get(panelistId);
    return prefetched?.ready === true && !prefetched.error;
  }

  /** Check if all cross-talk responses have finished generating */
  isAllCrossTalkReady(): boolean {
    if (this.prefetchedCrossTalk.size === 0) return false;
    for (const prefetched of this.prefetchedCrossTalk.values()) {
      if (!prefetched.ready) return false;
    }
    return true;
  }

  /** Set the current round (for UI-driven round changes) */
  setRound(round: RoundType): void {
    this.callbacks.onRoundChange(round);
  }
}
