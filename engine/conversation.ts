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
