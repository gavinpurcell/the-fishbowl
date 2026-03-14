'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFishbowlStore } from '@/lib/store';
import { FishbowlScene } from '@/scene/FishbowlScene';
import { ConversationOrchestrator } from '@/engine/conversation';
import { createProvider } from '@/providers/index';
import { VideoRecorder } from '@/scene/VideoRecorder';
import FishbowlCanvas from '@/components/scene/FishbowlCanvas';
import StatusBar from '@/components/scene/StatusBar';
import ModerationInput from '@/components/scene/ModerationInput';
import type { RoundType, TranscriptEntry, Panelist } from '@/engine/types';
import SpeakerCard from '@/components/scene/SpeakerCard';

type SessionPhase =
  | 'initializing'
  | 'waiting-for-advance'   // waiting for spacebar to trigger next speaker
  | 'speaking'              // a panelist is currently speaking
  | 'moderation'            // user is asking questions
  | 'wrapping-up'
  | 'done';

export default function SessionPage() {
  const router = useRouter();
  const store = useFishbowlStore();

  const sceneRef = useRef<FishbowlScene | null>(null);
  const orchestratorRef = useRef<ConversationOrchestrator | null>(null);
  const recorderRef = useRef<VideoRecorder | null>(null);
  const startedRef = useRef(false);
  const advanceResolverRef = useRef<(() => void) | null>(null);

  const [phase, setPhase] = useState<SessionPhase>('initializing');
  const [currentRound, setCurrentRound] = useState<RoundType>('initial-takes');
  const [panelistsSpoken, setPanelistsSpoken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [liveTranscript, setLiveTranscript] = useState<TranscriptEntry[]>([]);
  const [hint, setHint] = useState('Setting up the fishbowl...');
  const [activeSpeaker, setActiveSpeaker] = useState<Panelist | null>(null);
  const [activeSpeakerText, setActiveSpeakerText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speakerTextRef = useRef('');
  const textUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect to setup if no active session
  useEffect(() => {
    if (store.status !== 'running' || store.panelists.length < 3) {
      router.replace('/');
    }
  }, [store.status, store.panelists.length, router]);

  // Wait for user to press space (returns a promise that resolves on keypress)
  const waitForAdvance = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      advanceResolverRef.current = resolve;
      setPhase('waiting-for-advance');
    });
  }, []);

  // Spacebar handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && advanceResolverRef.current) {
        e.preventDefault();
        const resolver = advanceResolverRef.current;
        advanceResolverRef.current = null;
        resolver();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Capture store values in refs so handleSceneReady doesn't depend on store
  const storeRef = useRef(store);
  storeRef.current = store;

  const handleSceneReady = useCallback(async (scene: FishbowlScene) => {
    if (startedRef.current) return;
    startedRef.current = true;
    sceneRef.current = scene;

    const s = storeRef.current;

    // Start video recording
    const canvas = scene.getCanvas();
    if (canvas) {
      const recorder = new VideoRecorder();
      recorderRef.current = recorder;
      recorder.start(canvas);
    }

    const provider = createProvider(s.provider, s.apiKey);

    // Collect transcript entries locally (not just in store)
    const localTranscript: TranscriptEntry[] = [];

    const orchestrator = new ConversationOrchestrator(
      store.panelists,
      store.ideaText,
      store.ideaFiles,
      provider,
      {
        onRoundChange: (round: RoundType) => {
          setCurrentRound(round);
          store.setCurrentRound(round);
          setPanelistsSpoken(0);
        },
        onPanelistActivated: (panelistId: string) => {
          setPhase('speaking');
          store.setActivePanelist(panelistId);
          const speaker = store.panelists.find((p) => p.id === panelistId) || null;
          setActiveSpeaker(speaker);
          setActiveSpeakerText('');
          speakerTextRef.current = '';
          setIsSpeaking(true);
          scene.setCharacterState(panelistId, 'talking');
          scene.showSpeechBubble(panelistId);
          store.panelists.forEach((p) => {
            if (p.id !== panelistId) {
              scene.setCharacterState(p.id, Math.random() > 0.7 ? 'reacting' : 'thinking');
            }
          });
        },
        onPanelistDeactivated: () => {
          // Flush any pending text update
          if (textUpdateTimerRef.current) {
            clearTimeout(textUpdateTimerRef.current);
            textUpdateTimerRef.current = null;
          }
          setActiveSpeakerText(speakerTextRef.current);
          setLiveTranscript([...localTranscript]);

          store.setActivePanelist(null);
          setIsSpeaking(false);
          setPanelistsSpoken((prev) => prev + 1);
          store.panelists.forEach((p) => {
            scene.setCharacterState(p.id, 'idle');
          });
        },
        onTranscriptEntry: (entry) => {
          store.addTranscriptEntry(entry);
          localTranscript.push(entry);
          setLiveTranscript([...localTranscript]);
        },
        onStreamChunk: (panelistId: string, chunk: string) => {
          // Update PixiJS scene immediately
          scene.appendToBubble(panelistId, chunk);

          // Accumulate in ref (no re-render per chunk)
          speakerTextRef.current += chunk;
          if (localTranscript.length > 0) {
            localTranscript[localTranscript.length - 1].content += chunk;
          }

          // Throttle React state updates to every 150ms
          if (!textUpdateTimerRef.current) {
            textUpdateTimerRef.current = setTimeout(() => {
              textUpdateTimerRef.current = null;
              setActiveSpeakerText(speakerTextRef.current);
              setLiveTranscript([...localTranscript]);
            }, 150);
          }
        },
        onError: (err: Error) => {
          setError(err.message);
        },
      }
    );

    orchestratorRef.current = orchestrator;

    try {
      // === ROUND 1: INITIAL TAKES ===
      console.log('[Session] Starting Round 1: Initial Takes');
      setHint('Press SPACE to hear each panelist\'s initial take');
      setCurrentRound('initial-takes');

      for (const panelist of store.panelists) {
        console.log('[Session] Waiting for advance before', panelist.name);
        await waitForAdvance();
        console.log('[Session] Advance received, running', panelist.name);
        setHint(`${panelist.name} is sharing their initial take...`);
        await orchestrator.runSinglePanelist(panelist, 'initial-takes');
        console.log('[Session]', panelist.name, 'finished');
        setHint(`${panelist.name} finished. Press SPACE to continue.`);
      }

      // === ROUND 2: CROSS-TALK ===
      console.log('[Session] Starting Round 2: Cross-Talk');
      setHint('Press SPACE to start the cross-talk round');
      await waitForAdvance();
      setCurrentRound('cross-talk');
      setHint('Panelists are discussing with each other...');
      await orchestrator.runCrossTalk();

      // === ROUND 3: MODERATION ===
      setCurrentRound('moderation');
      setPhase('moderation');
      scene.moveObserverIn();
      setHint('You\'re in the fishbowl. Type a question below, or press Wrap Up.');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitForAdvance]);

  const handleModeration = useCallback(async (question: string) => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator || phase !== 'moderation') return;

    setPhase('speaking');
    setHint('Panelists are responding...');
    setError(null);
    try {
      await orchestrator.handleModerationQuestion(question);
      setPhase('moderation');
      setHint('Ask another question, or press Wrap Up.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing question.');
      setPhase('moderation');
    }
  }, [phase]);

  const handleWrapUp = useCallback(async () => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return;

    setPhase('wrapping-up');
    setHint('Getting final takeaways...');
    setError(null);

    try {
      await orchestrator.runWrapUp();

      // Stop video
      if (recorderRef.current?.isRecording) {
        const blob = await recorderRef.current.stop();
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          sessionStorage.setItem('fishbowl-video-url', url);
        }
      }

      setHint('Generating summary...');
      const summary = await orchestrator.generateSummary();
      store.setSummary(summary);
      store.setTranscript(orchestrator.getTranscript());
      store.completeSession();
      router.push('/results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error during wrap-up.');
      setPhase('moderation');
    }
  }, [store, router]);

  if (store.status !== 'running' || store.panelists.length < 3) {
    return null;
  }

  const canWrapUp = phase === 'moderation';
  const totalPanelists = store.panelists.length;

  return (
    <div className="min-h-screen">
      {/* Mobile fallback */}
      <div className="md:hidden flex items-center justify-center min-h-screen p-8 text-center">
        <div>
          <h2 className="text-xl font-700 mb-2" style={{ color: 'var(--text-primary)' }}>Open on desktop</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>The Fishbowl requires a larger screen.</p>
          <button onClick={() => router.replace('/')} className="mt-4 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--accent-gold)', color: 'var(--bg-deep)' }}>Go Back</button>
        </div>
      </div>

      {/* Desktop session */}
      <div className="hidden md:block">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="text-center mb-4">
            <div className="label-mono mb-1">Live Session</div>
            <h1 className="text-2xl font-700 tracking-tight" style={{ color: 'var(--text-primary)' }}>The Fishbowl</h1>
          </div>

          {/* PixiJS Scene */}
          <FishbowlCanvas panelists={store.panelists} onSceneReady={handleSceneReady} />

          {/* Status Bar */}
          <StatusBar
            round={currentRound}
            panelistsSpoken={panelistsSpoken}
            totalPanelists={totalPanelists}
            onWrapUp={handleWrapUp}
            canWrapUp={canWrapUp}
          />

          {/* Hint / instruction bar */}
          <div className="max-w-[800px] mx-auto mt-4 text-center">
            <p className={`text-sm ${phase === 'waiting-for-advance' ? 'animate-pulse' : ''}`}
              style={{ color: phase === 'waiting-for-advance' ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
              {hint}
            </p>
            {phase === 'waiting-for-advance' && (
              <button
                onClick={() => {
                  if (advanceResolverRef.current) {
                    const resolver = advanceResolverRef.current;
                    advanceResolverRef.current = null;
                    resolver();
                  }
                }}
                className="mt-3 px-5 py-2 rounded-lg text-sm font-500 transition-all glow-gold"
                style={{ background: 'var(--accent-gold)', color: 'var(--bg-deep)' }}
              >
                Continue (or press Space)
              </button>
            )}
          </div>

          {/* Speaker Card */}
          <SpeakerCard
            panelist={activeSpeaker}
            text={activeSpeakerText}
            isStreaming={isSpeaking}
          />

          {/* Error */}
          {error && (
            <div className="max-w-[800px] mx-auto mt-3 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
              <strong>Error:</strong> {error}
              <button onClick={() => setError(null)} className="ml-2 underline text-xs" style={{ color: '#dc2626' }}>Dismiss</button>
            </div>
          )}

          {/* Moderation Input */}
          {phase === 'moderation' && (
            <div className="max-w-[800px] mx-auto mt-4">
              <ModerationInput onSubmit={handleModeration} disabled={phase !== 'moderation'} />
            </div>
          )}

          {/* Live Transcript */}
          {liveTranscript.length > 0 && (
            <div className="max-w-[800px] mx-auto mt-6">
              <div className="label-mono mb-2">Transcript</div>
              <div className="rounded-xl p-4 max-h-64 overflow-y-auto space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                {liveTranscript.map((entry) => {
                  const panelist = store.panelists.find((p) => p.id === entry.panelistId);
                  const color = panelist?.color || (entry.panelistId === 'user' ? '#eea444' : 'var(--text-muted)');
                  return (
                    <div key={entry.id} className="text-sm">
                      <span className="font-600" style={{ color }}>{entry.panelistName}:</span>{' '}
                      <span style={{ color: 'var(--text-secondary)' }}>{entry.content}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
