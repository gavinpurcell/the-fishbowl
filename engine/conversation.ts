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

export class ConversationOrchestrator {
  private transcript: TranscriptEntry[] = [];
  private aborted = false;
  private prefetchedInitialTakes: Map<string, PrefetchedResponse> = new Map();
  private prefetching = false;

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
    const prompt = `${ideaContext}\n\nGive your initial reaction to this idea. What stands out? What concerns you? What excites you? Be specific and draw on your expertise. Keep your response to 100-200 words.`;

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

      // Fire and forget — runs in background
      (async () => {
        try {
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
        } catch (err) {
          prefetched.error = err instanceof Error ? err.message : String(err);
        }
        prefetched.ready = true;
      })();
    }
  }

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
   */
  private async replayPrefetched(
    panelist: Panelist,
    prefetched: PrefetchedResponse,
    round: RoundType
  ): Promise<void> {
    if (this.aborted) return;

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

    // Stream chunks as they arrive (or replay if already done)
    let emitted = 0;

    while (!this.aborted) {
      // Emit any new chunks
      while (emitted < prefetched.chunks.length) {
        this.callbacks.onStreamChunk(panelist.id, prefetched.chunks[emitted]);
        emitted++;
        // Small delay for visual streaming effect when replaying cached chunks
        if (prefetched.ready) {
          await new Promise((r) => setTimeout(r, 15));
        }
      }

      if (prefetched.ready) break;
      // Still generating — wait for more data
      await new Promise((r) => setTimeout(r, 50));
    }

    if (prefetched.error) {
      this.callbacks.onError(new Error(prefetched.error));
      entry.content = '[Error generating response]';
    } else {
      entry.content = prefetched.text;
    }

    if (prefetched.inputTokens || prefetched.outputTokens) {
      this.callbacks.onTokenUsage(prefetched.inputTokens, prefetched.outputTokens);
    }

    this.transcript.push(entry);
    this.callbacks.onPanelistDeactivated();
  }

  /**
   * Run a single panelist — uses prefetched data for initial-takes if available.
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
    await this._runSinglePanelist(panelist, round);
  }

  private async _runSinglePanelist(panelist: Panelist, round: RoundType): Promise<void> {
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
