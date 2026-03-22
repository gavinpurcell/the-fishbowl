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
import KeyboardHelp from '@/components/scene/KeyboardHelp';
import WrapUpOverlay from '@/components/scene/WrapUpOverlay';
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
  const firstChunkReceivedRef = useRef(false);

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

  // Wrap-up overlay state
  const [showWrapOverlay, setShowWrapOverlay] = useState(false);
  const [wrapSummaryReady, setWrapSummaryReady] = useState(false);

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

  // Redirect to setup if no active session (don't redirect during wrap overlay)
  useEffect(() => {
    if (showWrapOverlay) return;
    if (store.status !== 'running' || store.panelists.length < 3) {
      router.replace('/setup');
    }
  }, [store.status, store.panelists.length, router, showWrapOverlay]);

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
          firstChunkReceivedRef.current = false;
          storeRef.current.setActivePanelist(panelistId);

          // During roundtable, show thinking state until first text chunk arrives
          const scene = sceneRef.current;
          if (scene && viewModeRef.current === 'roundtable') {
            scene.hideAllThinkingIndicators();
            scene.setCharacterState(panelistId, 'thinking');
            scene.showThinkingIndicator(panelistId);
            storeRef.current.panelists.forEach((p) => {
              if (p.id !== panelistId) {
                scene.setCharacterState(p.id, 'idle');
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
            // On first chunk: transition from thinking to talking
            if (!firstChunkReceivedRef.current) {
              firstChunkReceivedRef.current = true;
              scene.hideThinkingIndicator(_panelistId);
              scene.setCharacterState(_panelistId, 'talking');
              scene.showSpeechBubble(_panelistId);
              // Set other panelists to listening reactions
              storeRef.current.panelists.forEach((p) => {
                if (p.id !== _panelistId) {
                  scene.setCharacterState(p.id, Math.random() > 0.7 ? 'reacting' : 'thinking');
                }
              });
            }
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

      // Show the wrap-up overlay — summary generation happens inside it
      setHint('');
      setShowWrapOverlay(true);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error during wrap-up.');
      setInModeration(true);
    }
  }, []);

  // Called by WrapUpOverlay when its animation is ready for summary generation
  const handleWrapStartSummary = useCallback(async () => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return;

    try {
      const summary = await orchestrator.generateSummary();
      storeRef.current.setSummary(summary);
      storeRef.current.setTranscript(orchestrator.getTranscript());
      storeRef.current.completeSession();
      setWrapSummaryReady(true);
    } catch (err) {
      // Even on error, mark as ready so the overlay can proceed
      storeRef.current.completeSession();
      setWrapSummaryReady(true);
    }
  }, []);

  // Called by WrapUpOverlay when its animation is fully complete
  const handleWrapComplete = useCallback(() => {
    router.push('/results');
  }, [router]);

  // Don't render if not running (allow 'completed' while wrap overlay is showing)
  if ((store.status !== 'running' && !(store.status === 'completed' && showWrapOverlay)) || store.panelists.length < 3) return null;

  const currentPanelist = briefingIndex >= 0 ? store.panelists[briefingIndex] : null;

  // Compute session stats for wrap-up overlay
  const sessionDurationMs = store.sessionStartTime ? Date.now() - store.sessionStartTime : 0;
  const totalResponses = liveTranscript.filter((e) => e.panelistId !== 'user').length;

  return (
    <div className="min-h-screen">
      <KeyboardHelp />

      {/* Wrap-up overlay — broadcast sign-off */}
      {showWrapOverlay && (
        <WrapUpOverlay
          panelists={store.panelists.map((p) => ({ id: p.id, name: p.name, role: p.role, color: p.color }))}
          sessionDurationMs={sessionDurationMs}
          questionsAsked={store.moderationQuestionCount}
          totalResponses={totalResponses}
          onStartSummary={handleWrapStartSummary}
          summaryReady={wrapSummaryReady}
          onComplete={handleWrapComplete}
        />
      )}

      {/* Main session content */}
      <div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          {/* Control room header strip */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(90deg, transparent, var(--border))' }} />
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-red)', boxShadow: '0 0 4px rgba(232,90,74,0.5)', animation: 'statusPulse 2s ease-in-out infinite' }} />
              <h1 className="font-pixel text-sm sm:text-base title-text" style={{ letterSpacing: '0.06em' }}>THE FISHBOWL</h1>
              <span className="font-mono-ui" style={{ fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>LIVE</span>
            </div>
            <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(90deg, var(--border), transparent)' }} />
          </div>

          {/* === BRIEFING VIEW === */}
          {viewMode === 'briefing' && (
            <div className="max-w-[800px] mx-auto">
              {briefingIndex < 0 ? (
                <div className="text-center py-12 sm:py-20">
                  <p className="text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>Your panel of {store.panelists.length} experts is ready.</p>
                  <div className="flex justify-center gap-4 mt-6 flex-wrap">
                    {store.panelists.map((p) => (
                      <div key={p.id} className="flex flex-col items-center gap-1.5">
                        <div
                          className="relative w-10 h-10 sm:w-12 sm:h-12 overflow-hidden"
                          style={{
                            border: `2px solid ${p.color}`,
                            borderRadius: '6px',
                            background: 'var(--dark-deep)',
                          }}
                        >
                          <img
                            src={`/sprites/portraits/char_${p.spriteIndex}_portrait.png`}
                            alt={`${p.name} portrait`}
                            className="absolute inset-0 w-full h-full object-contain"
                            style={{
                              imageRendering: 'pixelated',
                            }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : currentPanelist && (
                /* Character Dossier Card — classified document / RPG briefing */
                <div
                  className="dossier-slide-in overflow-hidden"
                  key={currentPanelist.id}
                  style={{
                    background: 'var(--dark-surface)',
                    border: '1px solid var(--dark-border)',
                    borderLeft: `3px solid ${currentPanelist.color}`,
                    borderRadius: '10px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 40px rgba(196,154,42,0.04)',
                    position: 'relative',
                  }}
                >
                  {/* Top gold accent line */}
                  <div style={{ height: '1px', background: 'linear-gradient(90deg, ' + currentPanelist.color + ', transparent 80%)' }} />

                  {/* PANELIST BRIEF watermark */}
                  <div
                    className="font-pixel hidden sm:block"
                    style={{
                      position: 'absolute',
                      top: '14px',
                      right: '16px',
                      fontSize: '8px',
                      letterSpacing: '0.12em',
                      color: 'rgba(255,255,255,0.08)',
                      textTransform: 'uppercase',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                  >
                    PANELIST BRIEF
                  </div>

                  <div className="flex flex-col sm:flex-row">
                    {/* Left: Portrait + Identity */}
                    <div
                      className="sm:w-64 flex-shrink-0 flex flex-col items-center justify-center py-6 sm:py-10 px-4 sm:px-6 border-b sm:border-b-0 sm:border-r"
                      style={{ borderColor: 'var(--dark-border)' }}
                    >
                      {/* Pixel art portrait */}
                      <div
                        className="relative w-16 h-16 sm:w-24 sm:h-24 overflow-hidden mb-3 sm:mb-4"
                        style={{
                          border: `2px solid ${currentPanelist.color}`,
                          borderRadius: '8px',
                          background: 'var(--dark-deep)',
                          boxShadow: `0 0 16px ${currentPanelist.color}20`,
                        }}
                      >
                        <img
                          src={`/sprites/portraits/char_${currentPanelist.spriteIndex}_portrait.png`}
                          alt={`${currentPanelist.name} portrait`}
                          className="absolute inset-0 w-full h-full object-contain"
                          style={{
                            imageRendering: 'pixelated',
                          }}
                        />
                      </div>

                      {/* Name — Silkscreen */}
                      <div className="text-center">
                        <div
                          className="font-pixel text-sm sm:text-base"
                          style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em' }}
                        >
                          {currentPanelist.name}
                        </div>
                        {/* Role — DM Mono uppercase pill */}
                        <div
                          className="inline-block mt-2 px-2.5 py-0.5"
                          style={{
                            fontFamily: "'DM Mono', monospace",
                            fontSize: '9px',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: currentPanelist.color,
                            background: currentPanelist.color + '15',
                            border: `1px solid ${currentPanelist.color}30`,
                            borderRadius: '4px',
                          }}
                        >
                          {currentPanelist.role}
                        </div>
                      </div>

                      {/* Description */}
                      <p
                        className="text-xs text-center mt-3 leading-relaxed px-2 hidden sm:block"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      >
                        {currentPanelist.description}
                      </p>

                      {/* Panelist counter */}
                      <div
                        className="mt-3 sm:mt-4"
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: '9px',
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color: 'rgba(255,255,255,0.2)',
                        }}
                      >
                        {briefingIndex + 1} / {store.panelists.length}
                      </div>
                    </div>

                    {/* Right: Initial Take content */}
                    <div className="flex-1 p-4 sm:p-8">
                      <div
                        className="font-pixel mb-4"
                        style={{
                          fontSize: '9px',
                          letterSpacing: '0.1em',
                          color: currentPanelist.color,
                        }}
                      >
                        INITIAL TAKE
                      </div>
                      {briefingText ? (
                        <p
                          className="text-sm leading-relaxed whitespace-pre-wrap"
                          style={{ color: 'rgba(255,255,255,0.65)' }}
                        >
                          {briefingText}
                          {isSpeaking && (
                            <span
                              className="inline-block w-1 h-3.5 ml-0.5 animate-pulse"
                              style={{ background: currentPanelist.color }}
                            />
                          )}
                        </p>
                      ) : (
                        <div className="thinking-dots">
                          <span className="thinking-text">Preparing response</span>
                          <span className="dot" />
                          <span className="dot" />
                          <span className="dot" />
                        </div>
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
              panelists={store.panelists.map((p) => ({ id: p.id, name: p.name, role: p.role, color: p.color }))}
              onComplete={handleTransitionComplete}
            />
          )}

          {/* === ROUNDTABLE (PixiJS canvas always in DOM, hidden until needed) === */}
          <div style={{ display: viewMode === 'roundtable' ? 'block' : 'none' }}>
            {/* Scene + status bar pinned at top so transcript never pushes it off-screen */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
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

          {/* Error — Broadcast Technical Difficulty */}
          {error && (
            <div
              className="max-w-[800px] mx-auto mt-3 text-sm error-slide-in"
              style={{
                background: 'var(--dark-surface)',
                border: '1px solid var(--dark-border)',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 40px rgba(232,90,74,0.06)',
              }}
            >
              {/* Top accent — red/amber warning stripe */}
              <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent 5%, var(--accent-red) 30%, #d4843a 50%, var(--accent-red) 70%, transparent 95%)' }} />

              <div className="flex items-start gap-3 px-4 py-3">
                {/* Warning triangle icon */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--accent-red)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 mt-0.5"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p
                    className="font-pixel"
                    style={{
                      fontSize: '10px',
                      letterSpacing: '0.1em',
                      color: 'var(--accent-red)',
                    }}
                  >
                    TECHNICAL DIFFICULTY
                  </p>
                  <p
                    className="mt-1.5"
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: '12px',
                      lineHeight: '1.6',
                      color: 'rgba(255,255,255,0.65)',
                    }}
                  >
                    {error}
                  </p>
                </div>
                <button
                  onClick={() => showError(null)}
                  className="flex-shrink-0 p-1.5 rounded-md transition-all"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.3)',
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)';
                  }}
                  aria-label="Dismiss error"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {/* Auto-dismiss progress bar — red line that shrinks over 10s */}
              <div style={{ height: '2px', background: 'rgba(255,255,255,0.05)' }}>
                <div className="error-dismiss-bar" style={{ height: '100%', background: 'var(--accent-red)' }} />
              </div>
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
