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

  const handleSceneReady = useCallback(async (scene: FishbowlScene) => {
    if (startedRef.current) return;
    startedRef.current = true;
    sceneRef.current = scene;

    // Start video recording
    const canvas = scene.getCanvas();
    if (canvas) {
      const recorder = new VideoRecorder();
      recorderRef.current = recorder;
      recorder.start(canvas);
    }

    const provider = createProvider(store.provider, store.apiKey);

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
          scene.appendToBubble(panelistId, chunk);
          store.appendToLastEntry(chunk);
          setActiveSpeakerText((prev) => prev + chunk);
          if (localTranscript.length > 0) {
            const last = localTranscript[localTranscript.length - 1];
            last.content += chunk;
            setLiveTranscript([...localTranscript]);
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
      setHint('Press SPACE to hear each panelist\'s initial take');
      setCurrentRound('initial-takes');

      for (const panelist of store.panelists) {
        await waitForAdvance();
        setHint(`${panelist.name} is sharing their initial take...`);
        // Manually run one panelist at a time
        await orchestrator.runSinglePanelist(panelist, 'initial-takes');
        setHint(`${panelist.name} finished. Press SPACE to continue.`);
      }

      // === ROUND 2: CROSS-TALK ===
      setHint('Press SPACE to start the cross-talk round');
      await waitForAdvance();
      setCurrentRound('cross-talk');
      setHint('Panelists are discussing with each other...');
      // Cross-talk runs automatically (2 rounds of back-and-forth)
      await orchestrator.runCrossTalk();

      // === ROUND 3: MODERATION ===
      setCurrentRound('moderation');
      setPhase('moderation');
      scene.moveObserverIn();
      setHint('You\'re in the fishbowl. Type a question below, or press Wrap Up.');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    }
  }, [store, waitForAdvance]);

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
    <div className="min-h-screen bg-white">
      {/* Mobile fallback */}
      <div className="md:hidden flex items-center justify-center min-h-screen p-8 text-center">
        <div>
          <h2 className="text-xl font-bold mb-2">Open on desktop for the full experience</h2>
          <p className="text-gray-500 text-sm">The Fishbowl requires a larger screen.</p>
          <button onClick={() => router.replace('/')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Go Back</button>
        </div>
      </div>

      {/* Desktop session */}
      <div className="hidden md:block">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold tracking-tight">The Fishbowl</h1>
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
          <div className="max-w-[800px] mx-auto mt-3 text-center">
            <p className={`text-sm ${phase === 'waiting-for-advance' ? 'text-blue-600 font-medium animate-pulse' : 'text-gray-500'}`}>
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
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
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
            <div className="max-w-[800px] mx-auto mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <strong>Error:</strong> {error}
              <button onClick={() => setError(null)} className="ml-2 text-red-500 underline text-xs">Dismiss</button>
            </div>
          )}

          {/* Moderation Input */}
          {phase === 'moderation' && (
            <ModerationInput onSubmit={handleModeration} disabled={phase !== 'moderation'} />
          )}

          {/* Live Transcript */}
          {liveTranscript.length > 0 && (
            <div className="max-w-[800px] mx-auto mt-6">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Transcript</h3>
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50 space-y-3">
                {liveTranscript.map((entry) => {
                  const panelist = store.panelists.find((p) => p.id === entry.panelistId);
                  const color = panelist?.color || (entry.panelistId === 'user' ? '#eea444' : '#888');
                  return (
                    <div key={entry.id} className="text-sm">
                      <span className="font-semibold" style={{ color }}>{entry.panelistName}:</span>{' '}
                      <span className="text-gray-700">{entry.content}</span>
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
