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

  const roundLabels: Record<string, string> = {
    'initial-takes': 'Initial Takes',
    'cross-talk': 'Cross-Talk',
    'moderation': 'Q&A',
    'wrap-up': 'Wrap-Up',
  };

  let currentRound = '';
  for (const entry of transcript) {
    if (entry.round !== currentRound) {
      currentRound = entry.round;
      md += `## ${roundLabels[currentRound] || currentRound}\n\n`;
    }

    // Distinguish moderator questions from panelist responses
    if (entry.panelistId === 'user') {
      md += `> **${entry.panelistName}:** ${entry.content}\n\n`;
    } else {
      md += `**${entry.panelistName}:** ${entry.content}\n\n`;
    }
  }

  if (summary) {
    md += `---\n\n# Summary\n\n${summary}\n`;
  }

  return md;
}
