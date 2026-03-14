import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
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
  status: SessionStatus;
  currentRound: RoundType;
  transcript: TranscriptEntry[];
  activePanelistId: string | null;
  summary: string | null;

  setPanelists: (panelists: Panelist[]) => void;
  addPanelist: (panelist: Panelist) => void;
  removePanelist: (id: string) => void;
  updatePanelist: (id: string, updates: Partial<Panelist>) => void;
  setIdeaText: (text: string) => void;
  setIdeaFiles: (files: FileContent[]) => void;
  setProvider: (provider: ProviderType) => void;
  setApiKey: (key: string) => void;

  startSession: () => void;
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
  status: 'setup',
  currentRound: 'initial-takes',
  transcript: [],
  activePanelistId: null,
  summary: null,

  setPanelists: (panelists) => set({ panelists }),
  addPanelist: (panelist) => set((s) => ({ panelists: [...s.panelists, panelist] })),
  removePanelist: (id) => set((s) => ({ panelists: s.panelists.filter((p) => p.id !== id) })),
  updatePanelist: (id, updates) =>
    set((s) => ({
      panelists: s.panelists.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  setIdeaText: (ideaText) => set({ ideaText }),
  setIdeaFiles: (ideaFiles) => set({ ideaFiles }),
  setProvider: (provider) => set({ provider }),
  setApiKey: (apiKey) => set({ apiKey }),

  startSession: () => set({ status: 'running', currentRound: 'initial-takes', transcript: [], summary: null }),
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
  completeSession: () => set({ status: 'completed', activePanelistId: null }),
  continueSession: () =>
    set({
      status: 'setup',
      currentRound: 'initial-takes',
      activePanelistId: null,
      summary: null,
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
    }),

  getSessionConfig: () => {
    const s = get();
    return {
      panelists: s.panelists,
      ideaText: s.ideaText,
      ideaFiles: s.ideaFiles,
      provider: s.provider,
      apiKey: s.apiKey,
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
        status: state.status,
        transcript: state.transcript,
        summary: state.summary,
        currentRound: state.currentRound,
      }),
    },
  ),
);
