/** A panelist in the fishbowl discussion */
export interface Panelist {
  id: string;
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
  color: string;
  spriteIndex: number;
}

/** A single message in the transcript */
export interface TranscriptEntry {
  id: string;
  panelistId: string;
  panelistName: string;
  content: string;
  round: RoundType;
  timestamp: number;
}

/** The phases of a fishbowl session */
export type RoundType = 'initial-takes' | 'cross-talk' | 'moderation' | 'wrap-up' | 'summary';

/** Current state of the session */
export type SessionStatus = 'setup' | 'running' | 'paused' | 'completed';

/** Configuration for a session before it starts */
export interface SessionConfig {
  panelists: Panelist[];
  ideaText: string;
  ideaFiles: FileContent[];
  provider: ProviderType;
  apiKey: string;
  modelId?: string;
}

/** Parsed file content */
export interface FileContent {
  name: string;
  content: string;
}

/** Supported LLM providers */
export type ProviderType = 'claude' | 'claude-code';

/** A pre-built panel template */
export interface PanelTemplate {
  id: string;
  name: string;
  description: string;
  panelists: Omit<Panelist, 'id' | 'systemPrompt' | 'spriteIndex'>[];
}

/** A saved session (for JSON export/import) */
export interface SavedSession {
  version: 1;
  config: SessionConfig;
  transcript: TranscriptEntry[];
  summary: string | null;
  createdAt: number;
  updatedAt: number;
}
