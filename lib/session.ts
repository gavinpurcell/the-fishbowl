import type { SavedSession, SessionConfig, TranscriptEntry } from '@/engine/types';

export function exportSession(
  config: SessionConfig,
  transcript: TranscriptEntry[],
  summary: string | null
): void {
  const session: SavedSession = {
    version: 1,
    config: {
      ...config,
      apiKey: '',
    },
    transcript,
    summary,
    createdAt: transcript[0]?.timestamp || Date.now(),
    updatedAt: Date.now(),
  };

  const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fishbowl-session-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importSession(file: File): Promise<SavedSession> {
  const text = await file.text();
  const session: SavedSession = JSON.parse(text);

  if (session.version !== 1) {
    throw new Error(`Unsupported session version: ${session.version}`);
  }

  return session;
}

export function exportAsMarkdown(transcript: TranscriptEntry[], summary: string | null): string {
  let md = '# The Fishbowl — Session Transcript\n\n';

  let currentRound = '';
  for (const entry of transcript) {
    if (entry.round !== currentRound) {
      currentRound = entry.round;
      const roundLabels: Record<string, string> = {
        'initial-takes': 'Round 1: Initial Takes',
        'cross-talk': 'Round 2: Cross-Talk',
        'moderation': 'Round 3: Moderation',
        'wrap-up': 'Final Takeaways',
      };
      md += `## ${roundLabels[currentRound] || currentRound}\n\n`;
    }
    md += `**${entry.panelistName}:** ${entry.content}\n\n`;
  }

  if (summary) {
    md += `---\n\n# Summary\n\n${summary}\n`;
  }

  return md;
}
