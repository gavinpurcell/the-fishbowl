'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFishbowlStore } from '@/lib/store';
import { FishbowlScene } from '@/scene/FishbowlScene';
import { ConversationOrchestrator } from '@/engine/conversation';
import { createProvider } from '@/providers/index';
import { VideoRecorder } from '@/scene/VideoRecorder';
import StatusBar from '@/components/scene/StatusBar';
import { getModelById } from '@/lib/models';
// Note: PixiJS scene is managed directly via ref, not via FishbowlCanvas component
import ModerationInput from '@/components/scene/ModerationInput';
import { loadAllSprites } from '@/lib/spriteLoader';
import type { RoundType, TranscriptEntry, Panelist } from '@/engine/types';

type ViewMode = 'briefing' | 'transition' | 'roundtable';

export default function SessionPage() {
  const router = useRouter();
  const store = useFishbowlStore();

  // Refs for stable access across async flows
  const storeRef = useRef(store);
  storeRef.current = store;
  const sceneRef = useRef<FishbowlScene | null>(null);
  const orchestratorRef = useRef<ConversationOrchestrator | null>(null);
  const recorderRef = useRef<VideoRecorder | null>(null);
  const startedRef = useRef(false);
  const advanceResolverRef = useRef<(() => void) | null>(null);
  const isSpeakingRef = useRef(false);
  const speakerTextRef = useRef('');
  const textUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localTranscriptRef = useRef<TranscriptEntry[]>([]);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('briefing');
  const [currentRound, setCurrentRound] = useState<RoundType>('initial-takes');
  const [panelistsSpoken, setPanelistsSpoken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState('Press SPACE to meet your panel');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<TranscriptEntry[]>([]);

  // Briefing state
  const [briefingIndex, setBriefingIndex] = useState(-1);
  const [briefingText, setBriefingText] = useState('');

  // Moderation state
  const [inModeration, setInModeration] = useState(false);

  // Keep isSpeaking ref in sync
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  // Redirect to setup if no active session
  useEffect(() => {
    if (store.status !== 'running' || store.panelists.length < 3) {
      router.replace('/setup');
    }
  }, [store.status, store.panelists.length, router]);

  // Wait for spacebar — returns promise that resolves on press
  const waitForSpace = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      advanceResolverRef.current = resolve;
    });
  }, []);

  // Spacebar handler — blocks during speaking, ignores when typing in input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't capture space when user is typing in an input or textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isSpeakingRef.current) return; // Block during speech
        if (advanceResolverRef.current) {
          const resolver = advanceResolverRef.current;
          advanceResolverRef.current = null;
          resolver();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // PixiJS scene container ref (always in DOM, hidden until roundtable)
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const sceneInitializedRef = useRef(false);

  // Initialize PixiJS scene once container is available
  useEffect(() => {
    if (!sceneContainerRef.current || sceneInitializedRef.current) return;
    sceneInitializedRef.current = true;

    const fishbowlScene = new FishbowlScene();
    sceneRef.current = fishbowlScene;

    loadAllSprites().then(() => {
      if (!sceneContainerRef.current) return;
      fishbowlScene.initWithContainer(sceneContainerRef.current, {
        panelists: store.panelists,
        onReady: () => {
          // Start video recording
          const canvas = fishbowlScene.getCanvas();
          if (canvas) {
            const recorder = new VideoRecorder();
            recorderRef.current = recorder;
            recorder.start(canvas);
          }
        },
      });
    });

    return () => {
      fishbowlScene.destroy();
      sceneRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main session flow — runs once on mount
  useEffect(() => {
    if (startedRef.current) return;
    if (store.status !== 'running' || store.panelists.length < 3) return;
    startedRef.current = true;

    const s = storeRef.current;
    const provider = createProvider(s.provider, s.apiKey, s.modelId);
    const localTranscript: TranscriptEntry[] = [];
    localTranscriptRef.current = localTranscript;

    const orchestrator = new ConversationOrchestrator(
      s.panelists,
      s.ideaText,
      s.ideaFiles,
      provider,
      {
        onRoundChange: (round: RoundType) => {
          setCurrentRound(round);
          storeRef.current.setCurrentRound(round);
          setPanelistsSpoken(0);
        },
        onPanelistActivated: (panelistId: string) => {
          setIsSpeaking(true);
          isSpeakingRef.current = true;
          speakerTextRef.current = '';
          storeRef.current.setActivePanelist(panelistId);

          // During roundtable, drive the scene
          const scene = sceneRef.current;
          if (scene && viewMode === 'roundtable') {
            scene.setCharacterState(panelistId, 'talking');
            scene.showSpeechBubble(panelistId);
            storeRef.current.panelists.forEach((p) => {
              if (p.id !== panelistId) {
                scene.setCharacterState(p.id, Math.random() > 0.7 ? 'reacting' : 'thinking');
              }
            });
          }
        },
        onPanelistDeactivated: () => {
          // Flush pending text updates
          if (textUpdateTimerRef.current) {
            clearTimeout(textUpdateTimerRef.current);
            textUpdateTimerRef.current = null;
          }
          setBriefingText(speakerTextRef.current);
          setLiveTranscript([...localTranscript]);

          setIsSpeaking(false);
          isSpeakingRef.current = false;
          storeRef.current.setActivePanelist(null);
          setPanelistsSpoken((prev) => prev + 1);

          const scene = sceneRef.current;
          if (scene) {
            storeRef.current.panelists.forEach((p) => scene.setCharacterState(p.id, 'idle'));
          }
        },
        onTranscriptEntry: (entry) => {
          storeRef.current.addTranscriptEntry(entry);
          localTranscript.push(entry);
          setLiveTranscript([...localTranscript]);
        },
        onStreamChunk: (_panelistId: string, chunk: string) => {
          speakerTextRef.current += chunk;
          if (localTranscript.length > 0) {
            localTranscript[localTranscript.length - 1].content += chunk;
          }

          // Drive scene bubbles during roundtable
          const scene = sceneRef.current;
          if (scene) {
            scene.appendToBubble(_panelistId, chunk);
          }

          // Throttle React updates
          if (!textUpdateTimerRef.current) {
            textUpdateTimerRef.current = setTimeout(() => {
              textUpdateTimerRef.current = null;
              setBriefingText(speakerTextRef.current);
              setLiveTranscript([...localTranscript]);
            }, 150);
          }
        },
        onError: (err: Error) => {
          setError(err.message);
        },
        onTokenUsage: (inputTokens: number, outputTokens: number) => {
          storeRef.current.addTokenUsage(inputTokens, outputTokens);
        },
      }
    );

    orchestratorRef.current = orchestrator;

    // Run the session flow
    (async () => {
      try {
        // === PHASE 1: INDIVIDUAL BRIEFINGS ===
        setViewMode('briefing');
        setCurrentRound('initial-takes');

        for (let i = 0; i < s.panelists.length; i++) {
          const panelist = s.panelists[i];

          if (i === 0) {
            setBriefingIndex(0);
            setBriefingText('');
            setHint(`Press SPACE to hear ${panelist.name}'s take`);
            await waitForSpace();
          }

          setHint(`${panelist.name} is sharing their initial take...`);
          setBriefingText('');
          speakerTextRef.current = '';
          await orchestrator.runSinglePanelist(panelist, 'initial-takes');

          if (i < s.panelists.length - 1) {
            setHint(`Press SPACE for ${s.panelists[i + 1].name}'s take`);
            await waitForSpace();
            setBriefingIndex(i + 1);
            setBriefingText('');
          } else {
            setHint('Press SPACE to start the discussion');
          }
        }

        // === TRANSITION ===
        await waitForSpace();
        setViewMode('transition');
        setHint('');
        await new Promise((r) => setTimeout(r, 2500));

        // === PHASE 2: ROUNDTABLE CROSS-TALK ===
        setViewMode('roundtable');
        setCurrentRound('cross-talk');
        setPanelistsSpoken(0);

        // Cross-talk with spacebar pacing between each speaker
        for (let round = 0; round < 2; round++) {
          for (const panelist of s.panelists) {
            if (orchestrator.isAborted) return;
            setHint(`Press SPACE to hear ${panelist.name}`);
            await waitForSpace();
            setHint(`${panelist.name} is responding...`);
            await orchestrator.runSinglePanelist(panelist, 'cross-talk');
            setHint(`${panelist.name} finished.`);
          }
        }

        // === PHASE 3: MODERATION ===
        setCurrentRound('moderation');
        setInModeration(true);
        const scene = sceneRef.current;
        if (scene) await scene.addObserver();
        setHint('You\'re in the fishbowl. Type a question below, or press Wrap Up.');

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred.');
      }
    })();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleModeration = useCallback(async (question: string) => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator || !inModeration) return;

    storeRef.current.incrementModerationCount();
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    setHint('Panelists are responding...');
    setError(null);
    try {
      await orchestrator.handleModerationQuestion(question);
      setHint('Ask another question, or press Wrap Up.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing question.');
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  }, [inModeration]);

  const handleWrapUp = useCallback(async () => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return;

    setInModeration(false);
    setHint('Getting final takeaways...');
    setError(null);

    try {
      await orchestrator.runWrapUp();

      if (recorderRef.current?.isRecording) {
        const blob = await recorderRef.current.stop();
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          sessionStorage.setItem('fishbowl-video-url', url);
        }
      }

      setHint('Generating summary...');
      const summary = await orchestrator.generateSummary();
      storeRef.current.setSummary(summary);
      storeRef.current.setTranscript(orchestrator.getTranscript());
      storeRef.current.completeSession();
      router.push('/results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error during wrap-up.');
      setInModeration(true);
    }
  }, [router]);

  // Don't render if not running
  if (store.status !== 'running' || store.panelists.length < 3) return null;

  const currentPanelist = briefingIndex >= 0 ? store.panelists[briefingIndex] : null;

  return (
    <div className="min-h-screen">
      {/* Mobile fallback */}
      <div className="md:hidden flex items-center justify-center min-h-screen p-8 text-center">
        <div>
          <h2 className="text-xl font-700 mb-2" style={{ color: 'var(--text-primary)' }}>Open on desktop</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>The Fishbowl requires a larger screen.</p>
          <button onClick={() => router.replace('/setup')} className="mt-4 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--accent-gold)', color: 'var(--bg-deep)' }}>Go Back</button>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="text-center mb-4">
            <div className="label-mono mb-1">Live Session</div>
            <h1 className="text-2xl font-700 tracking-tight" style={{ color: 'var(--text-primary)' }}>The Fishbowl</h1>
          </div>

          {/* === BRIEFING VIEW === */}
          {viewMode === 'briefing' && (
            <div className="max-w-[800px] mx-auto">
              {briefingIndex < 0 ? (
                <div className="text-center py-20">
                  <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>Your panel of {store.panelists.length} experts is ready.</p>
                  <div className="flex justify-center gap-3 mt-6">
                    {store.panelists.map((p) => (
                      <div key={p.id} className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-700"
                          style={{ backgroundColor: p.color + '20', color: p.color, border: `2px solid ${p.color}` }}>
                          {p.name.charAt(0)}
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : currentPanelist && (
                <div className="rounded-xl overflow-hidden animate-fade-in" key={currentPanelist.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div className="flex">
                    <div className="w-64 flex-shrink-0 flex flex-col items-center justify-center py-10 px-6"
                      style={{ background: currentPanelist.color + '12', borderRight: '1px solid var(--border)' }}>
                      <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-800 mb-4"
                        style={{ backgroundColor: currentPanelist.color + '25', color: currentPanelist.color, border: `3px solid ${currentPanelist.color}` }}>
                        {currentPanelist.name.charAt(0)}
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-700" style={{ color: 'var(--text-primary)' }}>{currentPanelist.name}</div>
                        <div className="label-mono mt-1" style={{ color: currentPanelist.color }}>{currentPanelist.role}</div>
                      </div>
                      <p className="text-xs text-center mt-3 leading-relaxed px-2" style={{ color: 'var(--text-muted)' }}>
                        {currentPanelist.description}
                      </p>
                      <div className="mt-4 label-mono" style={{ fontSize: '9px' }}>
                        Panelist {briefingIndex + 1} of {store.panelists.length}
                      </div>
                    </div>
                    <div className="flex-1 p-8">
                      <div className="label-mono mb-3" style={{ color: currentPanelist.color }}>Initial Take</div>
                      {briefingText ? (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                          {briefingText}
                          {isSpeaking && <span className="inline-block w-1 h-3.5 ml-0.5 animate-pulse" style={{ background: currentPanelist.color }} />}
                        </p>
                      ) : (
                        <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>Preparing response...</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === TRANSITION === */}
          {viewMode === 'transition' && (
            <div className="max-w-[800px] mx-auto text-center py-24 animate-fade-in">
              <div className="label-mono mb-4" style={{ color: 'var(--accent-gold)' }}>All panelists briefed</div>
              <h2 className="text-4xl font-800 tracking-tight" style={{ color: 'var(--text-primary)' }}>Start the Discussion</h2>
              <p className="mt-3 text-lg" style={{ color: 'var(--text-secondary)' }}>The panel will now debate with each other.</p>
              <div className="flex justify-center gap-2 mt-8">
                {store.panelists.map((p) => (
                  <div key={p.id} className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                ))}
              </div>
            </div>
          )}

          {/* === ROUNDTABLE (PixiJS canvas always in DOM, hidden until needed) === */}
          <div style={{ display: viewMode === 'roundtable' ? 'block' : 'none' }}>
            <div
              ref={sceneContainerRef}
              className="w-full max-w-[800px] mx-auto rounded-t-xl overflow-hidden shadow-lg"
              style={{ aspectRatio: '4/3' }}
            />
            {(() => {
              const model = getModelById(store.modelId);
              const cost = model
                ? (store.sessionCost.inputTokens / 1_000_000) * model.inputPer1M +
                  (store.sessionCost.outputTokens / 1_000_000) * model.outputPer1M
                : 0;
              const totalTokens = store.sessionCost.inputTokens + store.sessionCost.outputTokens;
              return (
                <StatusBar
                  round={currentRound}
                  panelistsSpoken={panelistsSpoken}
                  totalPanelists={store.panelists.length}
                  onWrapUp={handleWrapUp}
                  canWrapUp={inModeration && !isSpeaking}
                  modelLabel={model?.label}
                  costDollars={cost}
                  totalTokens={totalTokens}
                  isOllama={store.provider === 'ollama'}
                />
              );
            })()}
          </div>

          {/* Hint bar */}
          <div className="max-w-[800px] mx-auto mt-4 text-center">
            <p className={`text-sm ${!isSpeaking ? 'animate-pulse' : ''}`}
              style={{ color: !isSpeaking ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
              {hint}
            </p>
            {!isSpeaking && advanceResolverRef.current && (
              <button
                onClick={() => {
                  if (advanceResolverRef.current) {
                    const resolver = advanceResolverRef.current;
                    advanceResolverRef.current = null;
                    resolver();
                  }
                }}
                className="mt-3 px-5 py-2 rounded-lg text-sm font-500 glow-gold transition-all"
                style={{ background: 'var(--accent-gold)', color: 'var(--bg-deep)' }}
              >
                Continue (or press Space)
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="max-w-[800px] mx-auto mt-3 p-3 rounded-xl text-sm" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' }}>
              <strong>Error:</strong> {error}
              <button onClick={() => setError(null)} className="ml-2 underline text-xs" style={{ color: '#dc2626' }}>Dismiss</button>
            </div>
          )}

          {/* Moderation Input */}
          {inModeration && (
            <div className="max-w-[800px] mx-auto mt-4">
              <ModerationInput onSubmit={handleModeration} disabled={isSpeaking} />
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
