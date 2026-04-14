import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getDefaultModel } from '@/lib/models';
import type {
  Panelist,
  TranscriptEntry,
  RoundType,
  SessionStatus,
  SessionConfig,
  FileContent,
  ProviderType,
} from '@/engine/types';

interface FishbowlState {
  panelists: Panelist[];
  ideaText: string;
  ideaFiles: FileContent[];
  provider: ProviderType;
  apiKey: string;
  modelId: string;
  sessionId: string | null;
  hostedSessionToken: string | null;
  sessionCost: { inputTokens: number; outputTokens: number };
  status: SessionStatus;
  currentRound: RoundType;
  transcript: TranscriptEntry[];
  activePanelistId: string | null;
  summary: string | null;
  sessionStartTime: number | null;
  sessionEndTime: number | null;
  moderationQuestionCount: number;

  setPanelists: (panelists: Panelist[]) => void;
  addPanelist: (panelist: Panelist) => void;
  removePanelist: (id: string) => void;
  updatePanelist: (id: string, updates: Partial<Panelist>) => void;
  setIdeaText: (text: string) => void;
  setIdeaFiles: (files: FileContent[]) => void;
  setProvider: (provider: ProviderType) => void;
  setApiKey: (key: string) => void;
  setModelId: (id: string) => void;
  addTokenUsage: (input: number, output: number) => void;
  incrementModerationCount: () => void;

  startSession: (sessionId?: string, hostedSessionToken?: string | null) => void;
  setCurrentRound: (round: RoundType) => void;
  setActivePanelist: (id: string | null) => void;
  addTranscriptEntry: (entry: TranscriptEntry) => void;
  appendToLastEntry: (text: string) => void;
  setSummary: (summary: string) => void;
  setTranscript: (transcript: TranscriptEntry[]) => void;
  completeSession: () => void;
  continueSession: () => void;
  resetSession: () => void;

  getSessionConfig: () => SessionConfig;
}

export const useFishbowlStore = create<FishbowlState>()(
  persist(
    (set, get) => ({
  panelists: [],
  ideaText: '',
  ideaFiles: [],
  provider: 'claude',
  apiKey: '',
  modelId: getDefaultModel('claude').id,
  sessionId: null,
  hostedSessionToken: null,
  sessionCost: { inputTokens: 0, outputTokens: 0 },
  status: 'setup',
  currentRound: 'initial-takes',
  transcript: [],
  activePanelistId: null,
  summary: null,
  sessionStartTime: null,
  sessionEndTime: null,
  moderationQuestionCount: 0,

  setPanelists: (panelists) => set({ panelists }),
  addPanelist: (panelist) => set((s) => {
    if (s.panelists.length >= 4) return s; // Max 4 panelists (matches seat layout)
    return { panelists: [...s.panelists, panelist] };
  }),
  removePanelist: (id) => set((s) => ({ panelists: s.panelists.filter((p) => p.id !== id) })),
  updatePanelist: (id, updates) =>
    set((s) => ({
      panelists: s.panelists.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  setIdeaText: (ideaText) => set({ ideaText }),
  setIdeaFiles: (ideaFiles) => set({ ideaFiles }),
  setProvider: (provider) => set({ provider, modelId: getDefaultModel(provider).id }),
  setApiKey: (apiKey) => set({ apiKey }),
  setModelId: (modelId) => set({ modelId }),
  addTokenUsage: (input, output) => set((s) => ({
    sessionCost: {
      inputTokens: s.sessionCost.inputTokens + input,
      outputTokens: s.sessionCost.outputTokens + output,
    },
  })),
  incrementModerationCount: () => set((s) => ({ moderationQuestionCount: s.moderationQuestionCount + 1 })),

  startSession: (sessionId, hostedSessionToken) => set({
    status: 'running',
    currentRound: 'initial-takes',
    transcript: [],
    summary: null,
    sessionId: sessionId || crypto.randomUUID(),
    hostedSessionToken: hostedSessionToken || null,
    sessionCost: { inputTokens: 0, outputTokens: 0 },
    sessionStartTime: Date.now(),
    sessionEndTime: null,
    moderationQuestionCount: 0,
  }),
  setCurrentRound: (currentRound) => set({ currentRound }),
  setActivePanelist: (activePanelistId) => set({ activePanelistId }),
  addTranscriptEntry: (entry) => set((s) => ({ transcript: [...s.transcript, entry] })),
  appendToLastEntry: (text) =>
    set((s) => {
      const transcript = [...s.transcript];
      const last = transcript[transcript.length - 1];
      if (last) {
        transcript[transcript.length - 1] = { ...last, content: last.content + text };
      }
      return { transcript };
    }),
  setSummary: (summary) => set({ summary }),
  setTranscript: (transcript) => set({ transcript }),
  completeSession: () => set({ status: 'completed', activePanelistId: null, sessionEndTime: Date.now() }),
  continueSession: () =>
    set({
      status: 'setup',
      currentRound: 'initial-takes',
      activePanelistId: null,
      summary: null,
      sessionId: null,
      hostedSessionToken: null,
    }),
  resetSession: () =>
    set({
      status: 'setup',
      currentRound: 'initial-takes',
      transcript: [],
      activePanelistId: null,
      summary: null,
      panelists: [],
      ideaText: '',
      ideaFiles: [],
      provider: 'claude',
      modelId: getDefaultModel('claude').id,
      sessionId: null,
      hostedSessionToken: null,
      sessionCost: { inputTokens: 0, outputTokens: 0 },
      sessionStartTime: null,
      sessionEndTime: null,
      moderationQuestionCount: 0,
    }),

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
  }),
    {
      name: 'fishbowl-session',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        panelists: state.panelists,
        ideaText: state.ideaText,
        ideaFiles: state.ideaFiles,
        provider: state.provider,
        apiKey: state.apiKey,
        modelId: state.modelId,
        sessionId: state.sessionId,
        hostedSessionToken: state.hostedSessionToken,
        sessionCost: state.sessionCost,
        status: state.status,
        transcript: state.transcript,
        summary: state.summary,
        currentRound: state.currentRound,
        sessionStartTime: state.sessionStartTime,
        sessionEndTime: state.sessionEndTime,
        moderationQuestionCount: state.moderationQuestionCount,
      }),
    },
  ),
);
