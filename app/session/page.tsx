'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFishbowlStore } from '@/lib/store';
import { FishbowlScene } from '@/scene/FishbowlScene';
import { ConversationOrchestrator } from '@/engine/conversation';
import { createProvider } from '@/providers/index';
import StatusBar from '@/components/scene/StatusBar';
import IntroOverlay from '@/components/scene/IntroOverlay';
import TransitionOverlay from '@/components/scene/TransitionOverlay';
import { getModelById } from '@/lib/models';
// Note: PixiJS scene is managed directly via ref, not via FishbowlCanvas component
import ModerationInput from '@/components/scene/ModerationInput';
import KeyboardHelp from '@/components/scene/KeyboardHelp';
import WrapUpOverlay from '@/components/scene/WrapUpOverlay';
import { loadAllSprites } from '@/lib/spriteLoader';
import type { RoundType, TranscriptEntry, Panelist } from '@/engine/types';

type ViewMode = 'intro' | 'briefing' | 'transition' | 'roundtable';

export default function SessionPage() {
  const router = useRouter();
  const store = useFishbowlStore();

  // Refs for stable access across async flows
  const storeRef = useRef(store);
  storeRef.current = store;
  const sceneRef = useRef<FishbowlScene | null>(null);
  const orchestratorRef = useRef<ConversationOrchestrator | null>(null);
  const startedRef = useRef(false);
  const advanceResolverRef = useRef<(() => void) | null>(null);
  const transitionResolverRef = useRef<(() => void) | null>(null);
  const introResolverRef = useRef<(() => void) | null>(null);
  const isSpeakingRef = useRef(false);
  const speakerTextRef = useRef('');
  const textUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const localTranscriptRef = useRef<TranscriptEntry[]>([]);
  const firstChunkReceivedRef = useRef(false);
  const isMountedRef = useRef(true);
  const handleWrapUpRef = useRef<() => void>(() => {});

  // Clean up isMountedRef on unmount to prevent stale closures from calling setState
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('briefing');
  const viewModeRef = useRef<ViewMode>('briefing');
  const [currentRound, setCurrentRound] = useState<RoundType>('initial-takes');
  const [panelistsSpoken, setPanelistsSpoken] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState('Press SPACE to meet your panel');
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Briefing state
  const [briefingIndex, setBriefingIndex] = useState(-1);
  const [briefingText, setBriefingText] = useState('');
  const [prefetchReady, setPrefetchReady] = useState(false);

  // Intro readiness (first initial take ready)
  const [firstTakeReady, setFirstTakeReady] = useState(false);

  // Cross-talk readiness (for transition overlay)
  const [crossTalkReady, setCrossTalkReady] = useState(false);

  // Moderation state
  const [inModeration, setInModeration] = useState(false);
  // Moderation choice popup — "Ask a Question" / "Keep Talking" / "Wrap Up"
  const [showModerationChoice, setShowModerationChoice] = useState(false);
  const moderationChoiceRef = useRef<((choice: 'ask' | 'keep' | 'end') => void) | null>(null);

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

  // Transition overlay complete handler — guarded against unmount
  const handleIntroComplete = useCallback(() => {
    if (!isMountedRef.current) return;
    if (introResolverRef.current) {
      const resolver = introResolverRef.current;
      introResolverRef.current = null;
      resolver();
    }
  }, []);

  const handleTransitionComplete = useCallback(() => {
    if (!isMountedRef.current) return;
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

  // Type text into a speech bubble with a natural typing effect
  const typeIntoBubble = useCallback(async (panelistId: string, text: string, suffix?: string) => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.showSpeechBubble(panelistId);
    // Stream in 3-word chunks for a natural typing feel
    const words = text.split(' ');
    let displayed = '';
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, Math.min(i + 3, words.length)).join(' ');
      displayed += (i > 0 ? ' ' : '') + chunk;
      scene.setBubbleText(panelistId, displayed + (suffix || ''));
      await new Promise((r) => setTimeout(r, 60));
    }
    // Ensure final text is exact
    scene.setBubbleText(panelistId, text + (suffix || ''));
  }, []);

  // PixiJS scene container ref (always in DOM, hidden until roundtable)
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const sceneInitializedRef = useRef(false);

  // Initialize PixiJS scene once container is available
  useEffect(() => {
    if (!sceneContainerRef.current || sceneInitializedRef.current) return;
    sceneInitializedRef.current = true;

    const fishbowlScene = new FishbowlScene();

    loadAllSprites().then(() => {
      if (!sceneContainerRef.current) return;
      fishbowlScene.initWithContainer(sceneContainerRef.current, {
        panelists: store.panelists,
        onReady: () => {
          // Scene is fully initialized — bubbles, characters, tags all created
          sceneRef.current = fishbowlScene;

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

          setIsSpeaking(false);
          isSpeakingRef.current = false;
          storeRef.current.setActivePanelist(null);
          setPanelistsSpoken((prev) => prev + 1);

          const scene = sceneRef.current;
          if (scene) {
            scene.hideAllThinkingIndicators();
            // DON'T hide the speech bubble here — leave it visible so the user
            // can read the final text. It will be cleared when:
            // - The next panelist's showSpeechBubble() fires (hides all others)
            // - hideAllSpeechBubbles() is called explicitly (observer walk-in, etc.)
            storeRef.current.panelists.forEach((p) => scene.setCharacterState(p.id, 'idle'));
          }
        },
        onTranscriptEntry: (entry) => {
          storeRef.current.addTranscriptEntry(entry);
          localTranscript.push(entry);
        },
        onStreamChunk: (_panelistId: string, chunk: string) => {
          speakerTextRef.current += chunk;
          if (localTranscript.length > 0) {
            localTranscript[localTranscript.length - 1].content += chunk;
          }

          // During roundtable, just buffer — pagination handles display
          if (viewModeRef.current === 'roundtable') return;

          const isFirstChunk = !firstChunkReceivedRef.current;
          if (isFirstChunk) firstChunkReceivedRef.current = true;

          // On first chunk during briefing, immediately update text (skip throttle)
          if (isFirstChunk && viewModeRef.current === 'briefing') {
            if (textUpdateTimerRef.current) {
              clearTimeout(textUpdateTimerRef.current);
              textUpdateTimerRef.current = null;
            }
            setBriefingText(speakerTextRef.current);
            return;
          }

          // Throttle React updates (briefing)
          if (!textUpdateTimerRef.current) {
            textUpdateTimerRef.current = setTimeout(() => {
              textUpdateTimerRef.current = null;
              setBriefingText(speakerTextRef.current);
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

    // Poll for first take readiness (drives intro overlay)
    const firstTakePoll = setInterval(() => {
      if (s.panelists.length > 0 && orchestrator.isInitialTakeReady(s.panelists[0].id)) {
        setFirstTakeReady(true);
        clearInterval(firstTakePoll);
      }
    }, 200);

    // Run the session flow
    (async () => {
      try {
        // === INTRO OVERLAY — shows topic + panel while prefetch runs ===
        setViewMode('intro');
        setCurrentRound('initial-takes');
        await new Promise<void>((r) => { introResolverRef.current = r; });
        clearInterval(firstTakePoll);

        // === PHASE 1: INDIVIDUAL BRIEFINGS (uses prefetched responses) ===
        setViewMode('briefing');

        for (let i = 0; i < s.panelists.length; i++) {
          const panelist = s.panelists[i];

          if (i === 0) {
            // First take should be ready (intro waited for it)
            setBriefingIndex(0);
            setBriefingText('');
          }

          setHint(`${panelist.name} is sharing their initial take...`);
          setBriefingText('');
          speakerTextRef.current = '';
          // Uses prefetched data — will be near-instant if already generated
          await orchestrator.runSinglePanelist(panelist, 'initial-takes');

          if (i < s.panelists.length - 1) {
            // Poll until next panelist's prefetch is ready
            const nextPanelist = s.panelists[i + 1];
            setPrefetchReady(false);
            setHint(`Preparing ${nextPanelist.name}'s take...`);
            const readyPoll = setInterval(() => {
              if (orchestrator.isInitialTakeReady(nextPanelist.id)) {
                setHint(`${nextPanelist.name}'s response is ready — press SPACE`);
                setPrefetchReady(true);
                clearInterval(readyPoll);
              }
            }, 200);
            await waitForSpace();
            clearInterval(readyPoll);
            setPrefetchReady(false);
            setBriefingIndex(i + 1);
            setBriefingText('');
          } else {
            setHint('Press SPACE to start the discussion');
          }
        }

        // Start prefetching cross-talk responses now — all initial takes are
        // in the transcript, so each panelist's cross-talk will reference them.
        orchestrator.prefetchCrossTalk();

        // Poll cross-talk readiness so the transition overlay knows when to finish
        setCrossTalkReady(false);
        const crossTalkPoll = setInterval(() => {
          if (orchestrator.isAllCrossTalkReady()) {
            setCrossTalkReady(true);
            clearInterval(crossTalkPoll);
          }
        }, 200);

        // === TRANSITION ===
        await waitForSpace();
        setViewMode('transition');
        setHint('');
        // Transition overlay waits for crossTalkReady before calling onComplete
        await new Promise<void>((r) => { transitionResolverRef.current = r; });
        clearInterval(crossTalkPoll);

        // === PHASE 2: ROUNDTABLE CROSS-TALK ===
        setViewMode('roundtable');
        setCurrentRound('cross-talk');
        setPanelistsSpoken(0);

        // Clear any stale bubbles from the briefing phase
        const sceneForClear = sceneRef.current;
        if (sceneForClear) {
          sceneForClear.hideAllSpeechBubbles();
        }

        // All cross-talk responses are pre-generated — show them immediately
        // First panelist starts typing right away (no SPACE wait)
        for (let ci = 0; ci < s.panelists.length; ci++) {
          const panelist = s.panelists[ci];
          if (orchestrator.isAborted) return;

          // First panelist plays immediately, rest wait for SPACE
          if (ci > 0) {
            setHint(`Press SPACE to hear ${panelist.name}`);
            await waitForSpace();
          }

          const scene = sceneRef.current;
          if (scene) {
            scene.hideAllSpeechBubbles();
            scene.hideAllThinkingIndicators();
            // Speaker talks, others react
            scene.setCharacterState(panelist.id, 'talking');
            s.panelists.forEach((p) => {
              if (p.id !== panelist.id) {
                scene.setCharacterState(p.id, Math.random() > 0.7 ? 'reacting' : 'idle');
              }
            });
          }

          // Replay prefetched response (near-instant since already generated)
          setHint(`${panelist.name} is speaking...`);
          await orchestrator.runSinglePanelist(panelist, 'cross-talk');

          // Show response in bubble with typing effect + paragraph pagination
          const lastEntry = localTranscript[localTranscript.length - 1];
          if (lastEntry && sceneRef.current) {
            const paragraphs = lastEntry.content.split('\n\n').filter((p: string) => p.trim());
            for (let p = 0; p < paragraphs.length; p++) {
              const isLast = p === paragraphs.length - 1;
              const suffix = isLast ? '' : '\n\n▸ continue';
              await typeIntoBubble(panelist.id, paragraphs[p], suffix);
              if (!isLast) {
                setHint('Press SPACE to continue reading...');
                await waitForSpace();
              }
            }
          }

          // Return speaker to idle
          if (sceneRef.current) {
            sceneRef.current.setCharacterState(panelist.id, 'idle');
          }
          setHint(`${panelist.name} finished.`);
        }

        // === PHASE 3: MODERATION ===
        setCurrentRound('moderation');
        setHint('');

        // Show choice popup — loop so "Keep Talking" can repeat
        let enterModeration = false;
        while (!enterModeration) {
          const choice = await new Promise<'ask' | 'keep' | 'end'>((resolve) => {
            moderationChoiceRef.current = resolve;
            setShowModerationChoice(true);
          });
          setShowModerationChoice(false);

          if (choice === 'ask') {
            enterModeration = true;
            setInModeration(true);
            setHint('You\'re in the fishbowl. Ask the panel a question below.');
          } else if (choice === 'end') {
            handleWrapUpRef.current();
            return;
          } else {
            // "Keep Talking" — run another round of cross-talk
            orchestrator.prefetchCrossTalk();

            // Wait for prefetch to complete
            await new Promise<void>((resolve) => {
              const poll = setInterval(() => {
                if (orchestrator.isAllCrossTalkReady()) {
                  clearInterval(poll);
                  resolve();
                }
              }, 200);
            });

            // Play the responses
            for (let ci = 0; ci < s.panelists.length; ci++) {
              const panelist = s.panelists[ci];
              if (orchestrator.isAborted) return;

              if (ci > 0) {
                setHint(`Press SPACE to hear ${panelist.name}`);
                await waitForSpace();
              }

              const scn = sceneRef.current;
              if (scn) {
                scn.hideAllSpeechBubbles();
                scn.hideAllThinkingIndicators();
                scn.setCharacterState(panelist.id, 'talking');
                s.panelists.forEach((p) => {
                  if (p.id !== panelist.id) {
                    scn.setCharacterState(p.id, Math.random() > 0.7 ? 'reacting' : 'idle');
                  }
                });
              }

              setHint(`${panelist.name} is speaking...`);
              await orchestrator.runSinglePanelist(panelist, 'cross-talk');

              const lastEntry = localTranscript[localTranscript.length - 1];
              if (lastEntry && sceneRef.current) {
                const paragraphs = lastEntry.content.split('\n\n').filter((p: string) => p.trim());
                for (let p = 0; p < paragraphs.length; p++) {
                  const isLast = p === paragraphs.length - 1;
                  const suffix = isLast ? '' : '\n\n▸ continue';
                  await typeIntoBubble(panelist.id, paragraphs[p], suffix);
                  if (!isLast) {
                    setHint('Press SPACE to continue reading...');
                    await waitForSpace();
                  }
                }
              }

              if (sceneRef.current) sceneRef.current.setCharacterState(panelist.id, 'idle');
            }
            // Loop back to show choice popup again
          }
        }

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
    showError(null);

    orchestrator.recordModerationQuestion(question);
    // No prefetch — responses are generated sequentially so each panelist
    // can react to what previous panelists said (real discussion dynamics)
    const panelists = storeRef.current.panelists;

    try {
      for (let ci = 0; ci < panelists.length; ci++) {
        const panelist = panelists[ci];
        if (orchestrator.isAborted) break;

        const scene = sceneRef.current;

        // Show thinking state immediately — no SPACE wait before generating
        if (scene) {
          scene.hideAllSpeechBubbles();
          scene.hideAllThinkingIndicators();
          scene.setCharacterState(panelist.id, 'thinking');
          scene.showThinkingIndicator(panelist.id);
          panelists.forEach((p) => {
            if (p.id !== panelist.id) scene.setCharacterState(p.id, 'idle');
          });
        }

        setIsSpeaking(true);
        isSpeakingRef.current = true;
        setHint(`${panelist.name} is thinking...`);

        // Generate response (sequential — sees previous panelists' answers)
        await orchestrator.runModerationPanelist(panelist, question);

        // Switch from thinking to talking
        if (scene) {
          scene.hideAllThinkingIndicators();
          scene.setCharacterState(panelist.id, 'talking');
          panelists.forEach((p) => {
            if (p.id !== panelist.id) scene.setCharacterState(p.id, Math.random() > 0.7 ? 'reacting' : 'idle');
          });
        }

        // Show response in bubble with typing effect + paragraph pagination
        const localTranscript = localTranscriptRef.current;
        const lastEntry = localTranscript[localTranscript.length - 1];
        if (lastEntry && sceneRef.current) {
          const paragraphs = lastEntry.content.split('\n\n').filter((p: string) => p.trim());
          for (let p = 0; p < paragraphs.length; p++) {
            const isLast = p === paragraphs.length - 1;
            const suffix = isLast ? '' : '\n\n▸ continue';
            await typeIntoBubble(panelist.id, paragraphs[p], suffix);
            if (!isLast) {
              setHint('Press SPACE to continue reading...');
              setIsSpeaking(false);
              isSpeakingRef.current = false;
              await waitForSpace();
            }
          }
        }

        setIsSpeaking(false);
        isSpeakingRef.current = false;

        if (ci < panelists.length - 1) {
          // More panelists to go
          setHint(`Press SPACE to hear ${panelists[ci + 1].name}`);
          await waitForSpace();
        } else {
          // Last panelist — let user read before returning to input
          setHint('Press SPACE when you\'re ready to continue');
          await waitForSpace();
        }
      }

      // Show choice popup again after all panelists respond
      setHint('');
      setInModeration(false);

      let askAgain = false;
      while (!askAgain) {
        const nextChoice = await new Promise<'ask' | 'keep' | 'end'>((resolve) => {
          moderationChoiceRef.current = resolve;
          setShowModerationChoice(true);
        });
        setShowModerationChoice(false);

        if (nextChoice === 'ask') {
          askAgain = true;
          setInModeration(true);
          setHint('Ask another question below.');
        } else if (nextChoice === 'end') {
          handleWrapUpRef.current();
          return;
        } else {
          // "Keep Talking" — run another cross-talk round
          const orchestrator = orchestratorRef.current;
          if (!orchestrator) return;
          orchestrator.prefetchCrossTalk();

          await new Promise<void>((resolve) => {
            const poll = setInterval(() => {
              if (orchestrator.isAllCrossTalkReady()) {
                clearInterval(poll);
                resolve();
              }
            }, 200);
          });

          const panelists = storeRef.current.panelists;
          for (let ci = 0; ci < panelists.length; ci++) {
            const panelist = panelists[ci];
            if (orchestrator.isAborted) return;

            if (ci > 0) {
              setHint(`Press SPACE to hear ${panelist.name}`);
              await waitForSpace();
            }

            const scn = sceneRef.current;
            if (scn) {
              scn.hideAllSpeechBubbles();
              scn.hideAllThinkingIndicators();
              scn.setCharacterState(panelist.id, 'talking');
              panelists.forEach((p) => {
                if (p.id !== panelist.id) {
                  scn.setCharacterState(p.id, Math.random() > 0.7 ? 'reacting' : 'idle');
                }
              });
            }

            setHint(`${panelist.name} is speaking...`);
            await orchestrator.runSinglePanelist(panelist, 'cross-talk');

            const transcript = localTranscriptRef.current;
            const lastEntry = transcript[transcript.length - 1];
            if (lastEntry && sceneRef.current) {
              const paragraphs = lastEntry.content.split('\n\n').filter((p: string) => p.trim());
              for (let p = 0; p < paragraphs.length; p++) {
                const isLast = p === paragraphs.length - 1;
                const suffix = isLast ? '' : '\n\n▸ continue';
                await typeIntoBubble(panelist.id, paragraphs[p], suffix);
                if (!isLast) {
                  setHint('Press SPACE to continue reading...');
                  await waitForSpace();
                }
              }
            }

            if (sceneRef.current) sceneRef.current.setCharacterState(panelist.id, 'idle');
          }
          // Loop back to show choice popup again
        }
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error processing question.');
    }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  }, [inModeration, waitForSpace, typeIntoBubble]);

  const handleWrapUp = useCallback(async () => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator) return;

    setInModeration(false);
    setCurrentRound('wrap-up');
    orchestrator.setRound('wrap-up');
    showError(null);

    try {
      // Run each panelist's final thought with typing effect in bubbles
      const panelists = storeRef.current.panelists;
      for (let i = 0; i < panelists.length; i++) {
        const panelist = panelists[i];
        if (orchestrator.isAborted) break;

        const scene = sceneRef.current;
        if (scene) {
          scene.hideAllSpeechBubbles();
          scene.hideAllThinkingIndicators();
          scene.setCharacterState(panelist.id, 'talking');
          panelists.forEach((p) => {
            if (p.id !== panelist.id) scene.setCharacterState(p.id, 'idle');
          });
        }

        setHint(`${panelist.name} — final thought...`);
        await orchestrator.runSinglePanelist(panelist, 'wrap-up');

        // Show in bubble with typing effect
        const transcript = localTranscriptRef.current;
        const lastEntry = transcript[transcript.length - 1];
        if (lastEntry && sceneRef.current) {
          await typeIntoBubble(panelist.id, lastEntry.content.trim());
        }

        if (sceneRef.current) sceneRef.current.setCharacterState(panelist.id, 'idle');

        if (i < panelists.length - 1) {
          setHint(`Press SPACE to hear ${panelists[i + 1].name}'s final thought`);
          await waitForSpace();
        } else {
          // Last panelist — let user read before wrap-up overlay
          setHint('Press SPACE to wrap up the session');
          await waitForSpace();
        }
      }

      // Show the wrap-up overlay — summary generation happens inside it
      setHint('');
      setShowWrapOverlay(true);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error during wrap-up.');
      setInModeration(true);
    }
  }, [waitForSpace, typeIntoBubble]);
  handleWrapUpRef.current = handleWrapUp;

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
  const totalResponses = localTranscriptRef.current.filter((e) => e.panelistId !== 'user').length;

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

          {/* === INTRO OVERLAY === */}
          {viewMode === 'intro' && (
            <IntroOverlay
              topic={store.ideaText}
              panelists={store.panelists.map((p) => ({ id: p.id, name: p.name, role: p.role, color: p.color }))}
              onComplete={handleIntroComplete}
              ready={firstTakeReady}
            />
          )}

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
                <>
                {/* Character Dossier Card — classified document / RPG briefing */}
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
                    maxHeight: '70vh',
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

                    {/* Right: Initial Take content — scrollable so long responses don't push the page */}
                    <div className="flex-1 p-4 sm:p-8 overflow-y-auto" style={{ maxHeight: '60vh' }}>
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
                          {briefingText.replace(/\n*▸ continue\n*/g, '\n\n')}
                          {isSpeaking && (
                            <span
                              className="inline-block w-1 h-3.5 ml-0.5 animate-pulse"
                              style={{ background: currentPanelist.color }}
                            />
                          )}
                        </p>
                      ) : (
                        <div className="thinking-dots">
                          <span className="thinking-text">{prefetchReady ? 'Response ready' : 'Preparing response'}</span>
                          {!prefetchReady && (
                            <>
                              <span className="dot" />
                              <span className="dot" />
                              <span className="dot" />
                            </>
                          )}
                          {prefetchReady && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px', opacity: 0.7 }}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Advance button — below briefing card */}
                {hint && waitingForSpace && !isSpeaking && (
                  <div className="flex justify-center mt-5">
                    <button
                      onClick={() => {
                        if (advanceResolverRef.current) {
                          const resolver = advanceResolverRef.current;
                          advanceResolverRef.current = null;
                          setWaitingForSpace(false);
                          resolver();
                        }
                      }}
                      className="font-pixel cursor-pointer transition-all animate-pulse"
                      style={{
                        background: 'var(--dark-deep)',
                        color: 'var(--accent-gold)',
                        border: '2px solid var(--accent-gold)',
                        boxShadow: '4px 4px 0 rgba(0,0,0,0.5)',
                        borderRadius: '2px',
                        padding: '10px 24px',
                        fontSize: '10px',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {briefingIndex < store.panelists.length - 1
                        ? `NEXT PANELIST ▸`
                        : `START DISCUSSION ▸`}
                    </button>
                  </div>
                )}
                </>
              )}
            </div>
          )}

          {/* === TRANSITION === */}
          {viewMode === 'transition' && (
            <TransitionOverlay
              panelists={store.panelists.map((p) => ({ id: p.id, name: p.name, role: p.role, color: p.color }))}
              onComplete={handleTransitionComplete}
              ready={crossTalkReady}
            />
          )}

          {/* === ROUNDTABLE (PixiJS canvas always in DOM, hidden until needed) === */}
          <div style={{ display: viewMode === 'roundtable' ? 'block' : 'none' }}>
            {/* Scene + all overlays in one container — nothing below the fold */}
            <div className="max-w-[1000px] mx-auto" style={{ position: 'relative' }}>
              {/* Topic banner */}
              {store.ideaText && (
                <div className="topic-banner">
                  <span className="topic-banner-label">Topic</span>
                  <span className="topic-banner-text">{store.ideaText}</span>
                </div>
              )}
              {/* PixiJS canvas */}
              <div
                ref={sceneContainerRef}
                className="w-full scene-viewport overflow-hidden"
                style={{ aspectRatio: '16/9', borderRadius: store.ideaText ? '0' : '10px 10px 0 0', borderBottom: 'none' }}
              />

              {/* === OVERLAYS — all positioned inside the scene viewport === */}

              {/* Hint bar — single compact pixel-themed element */}
              {hint && viewMode === 'roundtable' && !inModeration && !showModerationChoice && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 10,
                  }}
                >
                  {!isSpeaking && waitingForSpace ? (
                    <button
                      onClick={() => {
                        if (advanceResolverRef.current) {
                          const resolver = advanceResolverRef.current;
                          advanceResolverRef.current = null;
                          setWaitingForSpace(false);
                          resolver();
                        }
                      }}
                      className="font-pixel transition-all cursor-pointer animate-pulse"
                      style={{
                        pointerEvents: 'auto',
                        background: 'var(--dark-deep)',
                        color: 'var(--accent-gold)',
                        border: '2px solid var(--accent-gold)',
                        boxShadow: '4px 4px 0 rgba(0,0,0,0.5), inset 0 0 12px rgba(196,154,42,0.06)',
                        borderRadius: '2px',
                        padding: '8px 20px',
                        fontSize: '10px',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {hint.replace('Press SPACE to ', '').replace('press SPACE', '').replace(' — ', ' ').toUpperCase().replace(/^TO /, '')} ▸
                    </button>
                  ) : (
                    <div
                      className="font-pixel"
                      style={{
                        background: 'rgba(0,0,0,0.75)',
                        color: 'rgba(255,255,255,0.6)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                        padding: '6px 16px',
                        fontSize: '9px',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {hint.toUpperCase()}
                    </div>
                  )}
                </div>
              )}

              {/* Moderation input — floating at bottom of scene, hidden while panelists respond */}
              {inModeration && !isSpeaking && !waitingForSpace && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.8) 20%)',
                    padding: '16px 12px 6px',
                    borderRadius: '0 0 10px 10px',
                  }}
                >
                  <ModerationInput onSubmit={handleModeration} disabled={isSpeaking} onWrapUp={handleWrapUp} />
                </div>
              )}

              {/* Moderation choice — compact bottom bar, same spot as the input */}
              {showModerationChoice && viewMode === 'roundtable' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 15,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.85) 30%)',
                    padding: '24px 12px 8px',
                    borderRadius: '0 0 10px 10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'rgba(26, 23, 20, 0.9)',
                      border: '1px solid rgba(196,154,42,0.25)',
                      borderRadius: '8px',
                      padding: '8px 10px',
                    }}
                  >
                    {/* YOUR TURN label */}
                    <span
                      className="font-pixel flex-shrink-0"
                      style={{
                        fontSize: '8px',
                        letterSpacing: '0.1em',
                        color: 'var(--accent-gold)',
                        opacity: 0.7,
                      }}
                    >
                      YOUR TURN
                    </span>

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Three inline buttons */}
                    <button
                      onClick={() => {
                        if (moderationChoiceRef.current) {
                          moderationChoiceRef.current('ask');
                          moderationChoiceRef.current = null;
                        }
                      }}
                      className="font-pixel cursor-pointer transition-all flex-shrink-0"
                      style={{
                        background: 'var(--accent-gold)',
                        color: 'var(--dark-deep)',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '7px 14px',
                        fontSize: '8px',
                        letterSpacing: '0.06em',
                      }}
                    >
                      ASK A QUESTION
                    </button>
                    <button
                      onClick={() => {
                        if (moderationChoiceRef.current) {
                          moderationChoiceRef.current('keep');
                          moderationChoiceRef.current = null;
                        }
                      }}
                      className="font-pixel cursor-pointer transition-all flex-shrink-0"
                      style={{
                        background: 'transparent',
                        color: 'var(--accent-gold)',
                        border: '1px solid rgba(196,154,42,0.35)',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        fontSize: '8px',
                        letterSpacing: '0.06em',
                      }}
                    >
                      KEEP TALKING
                    </button>
                    <button
                      onClick={() => {
                        if (moderationChoiceRef.current) {
                          moderationChoiceRef.current('end');
                          moderationChoiceRef.current = null;
                        }
                      }}
                      className="font-pixel cursor-pointer transition-all flex-shrink-0"
                      style={{
                        background: 'none',
                        color: 'rgba(255,255,255,0.35)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        fontSize: '8px',
                        letterSpacing: '0.06em',
                      }}
                    >
                      END
                    </button>
                  </div>
                </div>
              )}

              {/* Error overlay — floating in scene */}
              {error && (
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    right: '8px',
                    zIndex: 20,
                    background: 'rgba(26, 23, 20, 0.95)',
                    border: '1px solid var(--dark-border)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  }}
                >
                  <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent 5%, var(--accent-red) 30%, #d4843a 50%, var(--accent-red) 70%, transparent 95%)' }} />
                  <div className="flex items-center gap-3 px-3 py-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.65)', flex: 1 }}>{error}</p>
                    <button onClick={() => showError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '4px' }} aria-label="Dismiss error">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Status bar — below canvas */}
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
                    isOllama={store.provider === 'claude-code'}
                  />
                );
              })()}
            </div>
          </div>

          {/* Transcript is shown on the results page after the session */}
        </div>
      </div>
    </div>
  );
}
