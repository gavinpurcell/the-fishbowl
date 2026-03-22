'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFishbowlStore } from '@/lib/store';
import { FishbowlScene } from '@/scene/FishbowlScene';
import { ConversationOrchestrator } from '@/engine/conversation';
import { createProvider } from '@/providers/index';
import { VideoRecorder } from '@/scene/VideoRecorder';
import StatusBar from '@/components/scene/StatusBar';
import TransitionOverlay from '@/components/scene/TransitionOverlay';
import { getModelById } from '@/lib/models';
// Note: PixiJS scene is managed directly via ref, not via FishbowlCanvas component
import ModerationInput from '@/components/scene/ModerationInput';
import LiveTranscript from '@/components/scene/LiveTranscript';
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
  const transitionResolverRef = useRef<(() => void) | null>(null);
  const isSpeakingRef = useRef(false);
  const speakerTextRef = useRef('');
  const textUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localTranscriptRef = useRef<TranscriptEntry[]>([]);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('briefing');
  const viewModeRef = useRef<ViewMode>('briefing');
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

  // Track whether we're waiting for spacebar (ref doesn't trigger re-renders)
  const [waitingForSpace, setWaitingForSpace] = useState(false);

  // Warn before leaving mid-session (browser back, tab close, refresh)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only warn if the session is actively running
      if (storeRef.current.status === 'running') {
        e.preventDefault();
        // Modern browsers ignore custom messages but still show a prompt
        e.returnValue = 'Your focus group session is still in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Auto-dismiss error timer
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Wrapper to set error with auto-dismiss
  const showError = useCallback((msg: string | null) => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setError(msg);
    if (msg) {
      errorTimerRef.current = setTimeout(() => {
        setError(null);
        errorTimerRef.current = null;
      }, 10000);
    }
  }, []);

  // Transition overlay complete handler
  const handleTransitionComplete = useCallback(() => {
    if (transitionResolverRef.current) {
      const resolver = transitionResolverRef.current;
      transitionResolverRef.current = null;
      resolver();
    }
  }, []);

  // Keep refs in sync
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);

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
      setWaitingForSpace(true);
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
          setWaitingForSpace(false);
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
          if (scene && viewModeRef.current === 'roundtable') {
            scene.hideAllThinkingIndicators();
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
            scene.hideAllThinkingIndicators();
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
          showError(err.message);
        },
        onTokenUsage: (inputTokens: number, outputTokens: number) => {
          storeRef.current.addTokenUsage(inputTokens, outputTokens);
        },
      }
    );

    orchestratorRef.current = orchestrator;

    // Start pre-fetching all initial takes immediately (parallel, in background)
    orchestrator.prefetchInitialTakes();

    // Run the session flow
    (async () => {
      try {
        // === PHASE 1: INDIVIDUAL BRIEFINGS (uses prefetched responses) ===
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
          // Uses prefetched data — will be near-instant if already generated
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
        await new Promise<void>((r) => { transitionResolverRef.current = r; });

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
            // Show thinking indicator before speech starts
            const scene = sceneRef.current;
            if (scene) {
              scene.showThinkingIndicator(panelist.id);
              scene.setCharacterState(panelist.id, 'thinking');
            }
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
        showError(err instanceof Error ? err.message : 'An error occurred.');
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
    showError(null);

    // Show thinking indicator on first panelist while processing
    const scene = sceneRef.current;
    if (scene && storeRef.current.panelists.length > 0) {
      scene.showThinkingIndicator(storeRef.current.panelists[0].id);
    }

    try {
      await orchestrator.handleModerationQuestion(question);
      setHint('Ask another question, or press Wrap Up.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error processing question.');
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  }, [inModeration]);

  const handleWrapUp = useCallback(async () => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return;

    setInModeration(false);
    setHint('Getting final takeaways...');
    showError(null);

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
      showError(err instanceof Error ? err.message : 'Error during wrap-up.');
      setInModeration(true);
    }
  }, [router]);

  // Don't render if not running
  if (store.status !== 'running' || store.panelists.length < 3) return null;

  const currentPanelist = briefingIndex >= 0 ? store.panelists[briefingIndex] : null;

  return (
    <div className="min-h-screen">
      {/* Main session content */}
      <div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {/* Control room header strip */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(90deg, transparent, var(--border))' }} />
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#e85a4a', boxShadow: '0 0 4px rgba(232,90,74,0.5)', animation: 'statusPulse 2s ease-in-out infinite' }} />
              <h1 className="font-pixel text-sm sm:text-base title-text" style={{ letterSpacing: '0.06em' }}>THE FISHBOWL</h1>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>LIVE</span>
            </div>
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(90deg, var(--border), transparent)' }} />
          </div>

          {/* === BRIEFING VIEW === */}
          {viewMode === 'briefing' && (
            <div className="max-w-[800px] mx-auto">
              {briefingIndex < 0 ? (
                <div className="text-center py-12 sm:py-20">
                  <p className="text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>Your panel of {store.panelists.length} experts is ready.</p>
                  <div className="flex justify-center gap-3 mt-6 flex-wrap">
                    {store.panelists.map((p) => (
                      <div key={p.id} className="flex flex-col items-center gap-1">
                      <div
                        className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden"
                        style={{ border: `2px solid ${p.color}` }}
                      >
                        <img
                          src={`/sprites/portraits/char_${p.spriteIndex}_portrait.png`}
                          alt={p.name}
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{
                            imageRendering: 'pixelated',
                            objectPosition: 'center 20%',
                            transform: 'scale(1.18)',
                            transformOrigin: 'center 20%',
                          }}
                        />
                      </div>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : currentPanelist && (
                <div className="rounded-xl overflow-hidden animate-fade-in" key={currentPanelist.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                  <div className="flex flex-col sm:flex-row">
                    <div className="sm:w-64 flex-shrink-0 flex flex-col items-center justify-center py-6 sm:py-10 px-4 sm:px-6 border-b sm:border-b-0 sm:border-r"
                      style={{ background: currentPanelist.color + '12', borderColor: 'var(--border)' }}>
                      <div
                        className="relative w-16 h-16 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-3 sm:mb-4"
                        style={{ border: `3px solid ${currentPanelist.color}` }}
                      >
                        <img
                          src={`/sprites/portraits/char_${currentPanelist.spriteIndex}_portrait.png`}
                          alt={currentPanelist.name}
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{
                            imageRendering: 'pixelated',
                            objectPosition: 'center 20%',
                            transform: 'scale(1.14)',
                            transformOrigin: 'center 20%',
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <div className="text-base sm:text-lg font-700" style={{ color: 'var(--text-primary)' }}>{currentPanelist.name}</div>
                        <div className="label-mono mt-1" style={{ color: currentPanelist.color }}>{currentPanelist.role}</div>
                      </div>
                      <p className="text-xs text-center mt-2 sm:mt-3 leading-relaxed px-2 hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                        {currentPanelist.description}
                      </p>
                      <div className="mt-2 sm:mt-4 label-mono" style={{ fontSize: '9px' }}>
                        Panelist {briefingIndex + 1} of {store.panelists.length}
                      </div>
                    </div>
                    <div className="flex-1 p-4 sm:p-8">
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
            <TransitionOverlay
              panelists={store.panelists.map((p) => ({ id: p.id, name: p.name, color: p.color }))}
              onComplete={handleTransitionComplete}
            />
          )}

          {/* === ROUNDTABLE (PixiJS canvas always in DOM, hidden until needed) === */}
          <div style={{ display: viewMode === 'roundtable' ? 'block' : 'none' }}>
            {/* On small screens, show a note that the scene is best on desktop */}
            <div className="sm:hidden text-center mb-2">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Scene best viewed on a wider screen</p>
            </div>
            <div
              ref={sceneContainerRef}
              className="w-full max-w-[800px] mx-auto scene-viewport overflow-hidden"
              style={{ aspectRatio: '16/9', borderRadius: '10px 10px 0 0', borderBottom: 'none' }}
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
            <p className={`text-sm ${!isSpeaking && waitingForSpace ? 'animate-pulse' : ''}`}
              style={{ color: !isSpeaking && waitingForSpace ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
              {hint}
            </p>
            {!isSpeaking && waitingForSpace && (
              <button
                onClick={() => {
                  if (advanceResolverRef.current) {
                    const resolver = advanceResolverRef.current;
                    advanceResolverRef.current = null;
                    setWaitingForSpace(false);
                    resolver();
                  }
                }}
                className="mt-3 px-5 py-2 rounded-lg text-sm font-500 glow-gold transition-all cursor-pointer"
                style={{ background: 'var(--accent-gold)', color: 'var(--bg-deep)' }}
              >
                Continue (or press Space)
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              className="max-w-[800px] mx-auto mt-3 rounded-xl text-sm animate-fade-in"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--accent-warm)',
                overflow: 'hidden',
              }}
            >
              <div className="flex items-start gap-3 px-4 py-3">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent-warm)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 mt-0.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p style={{ color: 'var(--text-primary)' }}>
                    <strong style={{ color: 'var(--accent-warm)' }}>Something went wrong</strong>
                  </p>
                  <p className="mt-1" style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5' }}>
                    {error}
                  </p>
                </div>
                <button
                  onClick={() => showError(null)}
                  className="flex-shrink-0 p-1 rounded-md transition-colors"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  aria-label="Dismiss error"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {/* Warm accent bar at bottom */}
              <div style={{ height: '2px', background: 'linear-gradient(90deg, var(--accent-warm), var(--accent-gold), var(--accent-warm))' }} />
            </div>
          )}

          {/* Moderation Input */}
          {inModeration && (
            <div className="max-w-[800px] mx-auto mt-4">
              <ModerationInput onSubmit={handleModeration} disabled={isSpeaking} />
            </div>
          )}

          {/* Live Transcript */}
          <LiveTranscript
            entries={liveTranscript}
            panelists={store.panelists}
            activePanelistId={store.activePanelistId}
            isSpeaking={isSpeaking}
          />
        </div>
      </div>
    </div>
  );
}
