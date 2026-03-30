'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { FishbowlScene } from '@/scene/FishbowlScene';
import { loadAllSprites } from '@/lib/spriteLoader';
import type { Panelist, RoundType, TranscriptEntry } from '@/engine/types';
import StatusBar from '@/components/scene/StatusBar';
import TransitionOverlay from '@/components/scene/TransitionOverlay';
import KeyboardHelp from '@/components/scene/KeyboardHelp';
import Link from 'next/link';

// === THE PANEL: Four experts discuss The Fishbowl itself ===
const DEMO_PANELISTS: Panelist[] = [
  {
    id: 'd1',
    name: 'Gavin',
    role: 'The Guy Who Built This',
    description: 'Made an AI focus group simulator instead of doing literally anything else with his weekend. Has opinions about pixel art that no one asked for.',
    systemPrompt: '',
    color: '#c49a2a',
    spriteIndex: 0,
  },
  {
    id: 'd2',
    name: 'Claire',
    role: 'AI Skeptic',
    description: 'Former product manager who has seen enough AI demos to fill a landfill. Thinks most of them are solutions looking for problems. Will say "but why?" until you cry.',
    systemPrompt: '',
    color: '#e74c4c',
    spriteIndex: 5,
  },
  {
    id: 'd3',
    name: 'Deepak',
    role: 'Venture Capitalist',
    description: 'Sees TAM in everything. Already calculating how to turn a free demo into a Series A pitch deck. Keeps asking about moats.',
    systemPrompt: '',
    color: '#4477ee',
    spriteIndex: 4,
  },
  {
    id: 'd4',
    name: 'Mia',
    role: 'UX Researcher',
    description: 'Has run actual focus groups and is mildly offended by this one. Will compare everything to a Zoom call with six people talking over each other.',
    systemPrompt: '',
    color: '#e44a9a',
    spriteIndex: 7,
  },
];

const DEMO_IDEA = 'Should I keep working on The Fishbowl, or is this whole thing a terrible idea?';

const INITIAL_TAKES = [
  "OK so full disclosure, I made this thing. The idea was pretty simple: I wanted to watch AI characters argue about ideas instead of just reading a wall of text from Claude. Is it practical? Debatable. Is it fun to watch four pixel people roast your startup idea? Absolutely. I spent way too long getting the speech bubbles to work in PixiJS and I regret nothing. The real question is whether anyone besides me finds this entertaining.",
  "I'll be honest, my first reaction was 'oh great, another AI wrapper.' But then I actually used it and something weird happened. I cared what the fake people thought. Like, I know Jordan isn't real, but when he said my product timeline was unrealistic, I felt personally attacked. There's something about the visual format that makes the feedback land differently than a text response. I hate that it works.",
  "Let me put on my investor hat for a second. The core insight here is that AI conversations are invisible, and making them visible is a product. The focus group format is clever because it gives each AI response a character, a personality, a face. That's a distribution advantage. People share screenshots of funny AI responses all the time. Now imagine those responses are coming from a tiny pixel person named Carl who is professionally skeptical of everything.",
  "As someone who has actually moderated real focus groups, this is both ridiculous and weirdly accurate. Real focus groups have one person who dominates, one who agrees with everyone, one who goes off topic, and one who says the thing everyone was thinking but wouldn't say. Gavin basically recreated that dynamic with prompt engineering. The pixel art is cute but the real magic is in the system prompts. Each panelist actually feels different.",
];

const CROSSTALK = [
  "Mia's right that the system prompts are doing the heavy lifting, and honestly that's the part I'm most proud of. Each character has like 200 words of personality baked in. Carl literally has 'gets under your skin' in his description. The pixel art gets people in the door but the writing keeps them watching. Also I want to push back on Claire calling this 'another AI wrapper' because I am emotionally fragile and that hurt.",
  "OK fine, I'll give Gavin credit. It's not just a wrapper. The sequential conversation engine where each panelist actually reads what the others said before responding, that creates real discussion dynamics you don't get from parallel API calls. But I still think the biggest risk is that people try it once, think 'that was neat,' and never come back. What's the retention hook?",
  "Claire just identified the exact problem and the exact opportunity. The retention hook IS the content. Every session produces a unique, shareable conversation. Gavin, you need to think of each Fishbowl session as a piece of content, not a tool interaction. Add one-click sharing of the summary. Add embeddable session replays. The product is a content machine disguised as a focus group.",
  "I want to address something nobody's said yet. The funniest part of this whole thing is that right now, four AI characters are having a meta-conversation about the tool they're inside of. If that's not the perfect demo, I don't know what is. This is literally The Fishbowl reviewing The Fishbowl. Gavin, did you plan this or did you just need content for the demo page?",
];

const WRAPUP = [
  "Honestly I just needed content for the demo page. But Mia's right, the meta thing kind of works. Keep building, stop overthinking, and for the love of god fix the mobile layout.",
  "It works better than it should. I'm annoyed about that. Ship it.",
  "This is a content machine. The tool is interesting, but the real product is the conversations it generates. Think distribution first.",
  "The fact that I just sat through a full demo of AI characters discussing themselves and found it genuinely entertaining tells you everything you need to know. It works.",
];

let demoIdCounter = 0;
function demoId(): string {
  return `demo-${++demoIdCounter}`;
}

type ViewMode = 'briefing' | 'transition' | 'roundtable';

function DemoPageContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<FishbowlScene | null>(null);
  const [scene, setScene] = useState<FishbowlScene | null>(null);
  const sceneStateRef = useRef<FishbowlScene | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('briefing');
  const [currentRound, setCurrentRound] = useState<RoundType>('initial-takes');
  const [briefingIndex, setBriefingIndex] = useState(-1);
  const [briefingText, setBriefingText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [panelistsSpoken, setPanelistsSpoken] = useState(0);
  const [hint, setHint] = useState('Press SPACE to watch the demo');

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [demoComplete, setDemoComplete] = useState(false);

  const advanceResolverRef = useRef<(() => void) | null>(null);
  const transitionResolverRef = useRef<(() => void) | null>(null);
  const [waitingForAdvance, setWaitingForAdvance] = useState(false);
  const streamAbortRef = useRef(false);
  const startedRef = useRef(false);

  // Init PixiJS scene
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;
    const s = new FishbowlScene();
    sceneRef.current = s;
    loadAllSprites().then(() => {
      if (!containerRef.current) return;
      s.initWithContainer(containerRef.current, {
        panelists: DEMO_PANELISTS,
        onReady: () => { setScene(s); sceneStateRef.current = s; },
      });
    });
    return () => { s.destroy(); sceneRef.current = null; };
  }, []);

  const waitForSpace = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      advanceResolverRef.current = resolve;
      setWaitingForAdvance(true);
    });
  }, []);

  const handleTransitionComplete = useCallback(() => {
    if (transitionResolverRef.current) {
      const resolver = transitionResolverRef.current;
      transitionResolverRef.current = null;
      resolver();
    }
  }, []);

  const streamBriefingText = useCallback(async (text: string): Promise<void> => {
    setBriefingText('');
    setIsSpeaking(true);
    streamAbortRef.current = false;

    const words = text.split(' ');
    let accumulated = '';
    for (const word of words) {
      if (streamAbortRef.current) break;
      await new Promise((r) => setTimeout(r, 35));
      accumulated += word + ' ';
      setBriefingText(accumulated);
    }
    setIsSpeaking(false);
  }, []);

  const streamRoundtableText = useCallback(async (scene: FishbowlScene, panelist: Panelist, text: string) => {
    streamAbortRef.current = false;
    setIsSpeaking(true);

    scene.setCharacterState(panelist.id, 'talking');
    scene.showSpeechBubble(panelist.id);
    DEMO_PANELISTS.forEach((p) => {
      if (p.id !== panelist.id) {
        scene.setCharacterState(p.id, Math.random() > 0.7 ? 'reacting' : 'thinking');
      }
    });

    const words = text.split(' ');
    for (const word of words) {
      if (streamAbortRef.current) break;
      await new Promise((r) => setTimeout(r, 40));
      scene.appendToBubble(panelist.id, word + ' ');
    }

    scene.setCharacterState(panelist.id, 'idle');
    DEMO_PANELISTS.forEach((p) => scene.setCharacterState(p.id, 'idle'));
    setIsSpeaking(false);
  }, []);

  const addTranscriptEntry = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => [...prev, entry]);
  }, []);

  const isSpeakingRef = useRef(false);
  isSpeakingRef.current = isSpeaking;

  const runDemo = useCallback(async () => {
    // === PHASE 1: BRIEFINGS ===
    setViewMode('briefing');
    setCurrentRound('initial-takes');

    for (let i = 0; i < DEMO_PANELISTS.length; i++) {
      if (i === 0) {
        setBriefingIndex(i);
        setBriefingText('');
      }

      setHint(`${DEMO_PANELISTS[i].name} is sharing their take...`);
      await streamBriefingText(INITIAL_TAKES[i]);
      setPanelistsSpoken(i + 1);

      addTranscriptEntry({
        id: demoId(),
        panelistId: DEMO_PANELISTS[i].id,
        panelistName: DEMO_PANELISTS[i].name,
        content: INITIAL_TAKES[i],
        round: 'initial-takes',
        timestamp: Date.now(),
      });

      if (i < DEMO_PANELISTS.length - 1) {
        setHint(`Press SPACE for ${DEMO_PANELISTS[i + 1].name}'s take`);
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

    // === PHASE 2: CROSS-TALK ===
    setViewMode('roundtable');
    setCurrentRound('cross-talk');
    setPanelistsSpoken(0);

    const s = sceneStateRef.current;
    if (!s) return;

    for (let i = 0; i < CROSSTALK.length; i++) {
      setHint(`Press SPACE to hear ${DEMO_PANELISTS[i].name}'s response`);
      await waitForSpace();

      setHint(`${DEMO_PANELISTS[i].name} is responding...`);
      await streamRoundtableText(s, DEMO_PANELISTS[i], CROSSTALK[i]);
      setPanelistsSpoken(i + 1);

      addTranscriptEntry({
        id: demoId(),
        panelistId: DEMO_PANELISTS[i].id,
        panelistName: DEMO_PANELISTS[i].name,
        content: CROSSTALK[i],
        round: 'cross-talk',
        timestamp: Date.now(),
      });
    }

    // === PHASE 3: WRAP-UP ===
    setCurrentRound('wrap-up');
    setPanelistsSpoken(0);

    for (let i = 0; i < DEMO_PANELISTS.length; i++) {
      setHint(`Press SPACE for ${DEMO_PANELISTS[i].name}'s final takeaway`);
      await waitForSpace();

      setHint(`${DEMO_PANELISTS[i].name} is wrapping up...`);
      await streamRoundtableText(s, DEMO_PANELISTS[i], WRAPUP[i]);
      setPanelistsSpoken(i + 1);

      addTranscriptEntry({
        id: demoId(),
        panelistId: DEMO_PANELISTS[i].id,
        panelistName: DEMO_PANELISTS[i].name,
        content: WRAPUP[i],
        round: 'wrap-up',
        timestamp: Date.now(),
      });
    }

    setHint('');
    setDemoComplete(true);
  }, [waitForSpace, streamBriefingText, streamRoundtableText, addTranscriptEntry]);

  const runDemoRef = useRef(runDemo);
  runDemoRef.current = runDemo;

  // Spacebar handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isSpeakingRef.current) return;

        if (advanceResolverRef.current) {
          const resolver = advanceResolverRef.current;
          advanceResolverRef.current = null;
          setWaitingForAdvance(false);
          resolver();
        } else if (!startedRef.current) {
          startedRef.current = true;
          runDemoRef.current();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const currentPanelist = briefingIndex >= 0 ? DEMO_PANELISTS[briefingIndex] : null;

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-deep)' }}>
      <KeyboardHelp />

      {/* Demo banner */}
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(196, 154, 42, 0.12) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(196, 154, 42, 0.15)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="font-pixel"
              style={{
                fontSize: '9px',
                letterSpacing: '0.1em',
                color: 'var(--accent-gold)',
                background: 'rgba(196, 154, 42, 0.12)',
                border: '1px solid rgba(196, 154, 42, 0.25)',
                borderRadius: '4px',
                padding: '3px 8px',
              }}
            >
              DEMO
            </span>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '11px',
                color: 'var(--text-secondary)',
              }}
            >
              This is a pre-recorded session. No API calls, just vibes.
            </span>
          </div>
          <Link
            href="/setup"
            className="font-pixel"
            style={{
              fontSize: '9px',
              letterSpacing: '0.08em',
              color: 'var(--accent-gold)',
              textDecoration: 'none',
            }}
          >
            RUN YOUR OWN SESSION &rarr;
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(90deg, transparent, var(--border))' }} />
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: 'var(--accent-gold)',
                boxShadow: '0 0 4px rgba(196,154,42,0.5)',
                animation: 'statusPulse 2s ease-in-out infinite',
              }}
            />
            <h1 className="font-pixel text-sm sm:text-base title-text" style={{ letterSpacing: '0.06em' }}>
              THE FISHBOWL
            </h1>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '9px',
                color: 'var(--accent-gold)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                opacity: 0.7,
              }}
            >
              DEMO
            </span>
          </div>
          <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(90deg, var(--border), transparent)' }} />
        </div>

        {/* === BRIEFING VIEW === */}
        {viewMode === 'briefing' && (
          <div className="max-w-[800px] mx-auto">
            {briefingIndex < 0 ? (
              <div className="text-center py-12 sm:py-20">
                {/* Topic */}
                <div
                  className="font-pixel mb-6"
                  style={{
                    fontSize: '9px',
                    letterSpacing: '0.12em',
                    color: 'var(--accent-gold)',
                    opacity: 0.7,
                  }}
                >
                  TOPIC
                </div>
                <p
                  className="text-base sm:text-lg mb-8"
                  style={{ color: 'var(--text-primary)', fontFamily: "'Outfit', sans-serif" }}
                >
                  &ldquo;{DEMO_IDEA}&rdquo;
                </p>

                <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Your panel of {DEMO_PANELISTS.length} experts is ready.
                </p>
                <div className="flex justify-center gap-4 mt-6 flex-wrap">
                  {DEMO_PANELISTS.map((p) => (
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
                          style={{ imageRendering: 'pixelated' }}
                        />
                      </div>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : currentPanelist && (
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
                <div style={{ height: '1px', background: 'linear-gradient(90deg, ' + currentPanelist.color + ', transparent 80%)' }} />
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
                  <div
                    className="sm:w-64 flex-shrink-0 flex flex-col items-center justify-center py-6 sm:py-10 px-4 sm:px-6 border-b sm:border-b-0 sm:border-r"
                    style={{ borderColor: 'var(--dark-border)' }}
                  >
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
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div className="text-center">
                      <div
                        className="font-pixel text-sm sm:text-base"
                        style={{ color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em' }}
                      >
                        {currentPanelist.name}
                      </div>
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
                    <p
                      className="text-xs text-center mt-3 leading-relaxed px-2 hidden sm:block"
                      style={{ color: 'rgba(255,255,255,0.6)' }}
                    >
                      {currentPanelist.description}
                    </p>
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
                      {briefingIndex + 1} / {DEMO_PANELISTS.length}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 p-4 sm:p-8">
                    <div
                      className="font-pixel mb-4"
                      style={{
                        fontSize: '12px',
                        letterSpacing: '0.1em',
                        color: currentPanelist.color,
                      }}
                    >
                      INITIAL TAKE
                    </div>
                    {briefingText ? (
                      <p
                        className="text-xl sm:text-sm leading-relaxed whitespace-pre-wrap"
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
            panelists={DEMO_PANELISTS.map((p) => ({ id: p.id, name: p.name, role: p.role, color: p.color }))}
            onComplete={handleTransitionComplete}
          />
        )}

        {/* === ROUNDTABLE VIEW === */}
        <div style={{ display: viewMode === 'roundtable' ? 'block' : 'none' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            {/* Topic banner */}
            <div className="max-w-[800px] mx-auto topic-banner">
              <span className="topic-banner-label">Topic</span>
              <span className="topic-banner-text">{DEMO_IDEA}</span>
            </div>
            <div className="sm:hidden text-center mb-2">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Scene best viewed on a wider screen</p>
            </div>
            <div
              ref={containerRef}
              className="w-full max-w-[800px] mx-auto scene-viewport overflow-hidden"
              style={{ aspectRatio: '16/9', borderRadius: '10px 10px 0 0', borderBottom: 'none' }}
            />
            <div className="max-w-[800px] mx-auto">
            <StatusBar
              round={currentRound}
              panelistsSpoken={panelistsSpoken}
              totalPanelists={DEMO_PANELISTS.length}
              onWrapUp={() => {}}
              canWrapUp={false}
              centerContent={!isSpeaking && waitingForAdvance ? (
                <button
                  onClick={() => {
                    if (advanceResolverRef.current) {
                      const resolver = advanceResolverRef.current;
                      advanceResolverRef.current = null;
                      setWaitingForAdvance(false);
                      resolver();
                    }
                  }}
                  className="font-pixel transition-all cursor-pointer animate-pulse"
                  style={{
                    background: 'var(--dark-deep)',
                    color: 'var(--accent-gold)',
                    border: '2px solid var(--accent-gold)',
                    boxShadow: '4px 4px 0 rgba(0,0,0,0.45), inset 0 0 12px rgba(196,154,42,0.06)',
                    borderRadius: '2px',
                    padding: '8px 22px',
                    fontSize: '10px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {hint.replace('Press SPACE to ', '').replace('press SPACE', '').replace(' — ', ' ').replace(/^to /i, '')} &#9658;
                </button>
              ) : null}
            />
            </div>
          </div>
        </div>

        {/* Hint bar (briefing + transition phases) */}
        {viewMode !== 'roundtable' && hint && (
          <div className="text-center mt-6">
            <button
              onClick={() => {
                if (isSpeakingRef.current) return;
                if (advanceResolverRef.current) {
                  const resolver = advanceResolverRef.current;
                  advanceResolverRef.current = null;
                  setWaitingForAdvance(false);
                  resolver();
                } else if (!startedRef.current) {
                  startedRef.current = true;
                  runDemoRef.current();
                }
              }}
              className="font-pixel transition-all cursor-pointer"
              style={{
                background: 'var(--dark-deep)',
                color: 'var(--accent-gold)',
                border: '2px solid var(--accent-gold)',
                boxShadow: '4px 4px 0 rgba(0,0,0,0.45), inset 0 0 12px rgba(196,154,42,0.06)',
                borderRadius: '2px',
                padding: '10px 28px',
                fontSize: '10px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                animation: waitingForAdvance ? 'ctaGlow 3s ease-in-out infinite' : 'none',
              }}
            >
              {hint} &#9658;
            </button>
          </div>
        )}

        {/* Demo complete state */}
        {demoComplete && (
          <div className="max-w-[600px] mx-auto text-center py-6 sm:py-10">
            {/* Gold accent line */}
            <div
              className="mx-auto mb-5"
              style={{
                width: '60px',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)',
              }}
            />

            <h2
              className="font-pixel text-lg sm:text-xl mb-4"
              style={{
                background: 'linear-gradient(180deg, #e8c44a 0%, #c49a2a 40%, #a07818 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 4px rgba(164, 120, 24, 0.3))',
                letterSpacing: '0.04em',
              }}
            >
              THAT&apos;S THE FISHBOWL
            </h2>

            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-4">
              <Link
                href="/setup"
                className="cta-game-button font-pixel"
                style={{
                  display: 'inline-block',
                  fontSize: '12px',
                  letterSpacing: '0.08em',
                  padding: '14px 32px',
                  textDecoration: 'none',
                }}
              >
                TRY IT FOR REAL
              </Link>

              <a
                href="https://github.com/gavinpurcell/the-fishbowl"
                target="_blank"
                rel="noopener noreferrer"
                className="font-pixel"
                style={{
                  fontSize: '10px',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                  padding: '10px 20px',
                  border: '1px solid var(--border)',
                  borderRadius: '2px',
                }}
              >
                VIEW SOURCE ON GITHUB
              </a>
            </div>

            {/* Footer */}
            <div className="mt-12" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
              <span style={{ fontFamily: "'DM Mono', monospace" }}>
                Built by{' '}
                <a
                  href="https://gavinpurcell.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}
                >
                  Gavin Purcell
                </a>
                , a human &mdash; and{' '}
                <a
                  href="https://claude.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}
                >
                  Claude
                </a>
                , an AI
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-deep)' }}>
          <div className="text-center">
            <div className="thinking-dots mb-4">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
            <p className="font-pixel text-xs" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
              LOADING DEMO...
            </p>
          </div>
        </div>
      }
    >
      <DemoPageContent />
    </Suspense>
  );
}
