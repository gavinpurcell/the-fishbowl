'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { FishbowlScene, type LayoutEditorSnapshot } from '@/scene/FishbowlScene';
import { loadAllSprites } from '@/lib/spriteLoader';
import type { Panelist, RoundType, TranscriptEntry } from '@/engine/types';
import StatusBar from '@/components/scene/StatusBar';
import TransitionOverlay from '@/components/scene/TransitionOverlay';
import ModerationInput from '@/components/scene/ModerationInput';
import LiveTranscript from '@/components/scene/LiveTranscript';

const FAKE_PANELISTS: Panelist[] = [
  { id: 'p1', name: 'Mei', role: 'UX Designer', description: 'Ten years of product design at startups and FAANG. Thinks user-first and will challenge any feature that adds complexity without clear user value.', systemPrompt: '', color: '#4a9a7a', spriteIndex: 0 },
  { id: 'p2', name: 'Jordan', role: 'Senior Engineer', description: 'Full-stack engineer who ships products used by millions. Evaluates technical feasibility and architecture trade-offs.', systemPrompt: '', color: '#e74c4c', spriteIndex: 1 },
  { id: 'p3', name: 'Alex', role: 'End User', description: 'Non-technical user who just wants things to work. Will tell you if the product makes sense in plain language.', systemPrompt: '', color: '#4477ee', spriteIndex: 2 },
  { id: 'p4', name: 'Taylor', role: 'Product Manager', description: 'Has shipped 20+ features across B2B and B2C. Thinks about prioritization, scope, and building the right thing.', systemPrompt: '', color: '#e44a9a', spriteIndex: 3 },
];

const INITIAL_TAKES = [
  "The visual approach is genuinely novel — watching pixel-art characters debate your ideas is more engaging than reading a ChatGPT wall of text. But I'm concerned about the information density. Speech bubbles in a tiny isometric scene can only show maybe 20 words at a time. The real value is in the transcript and summary below, which means the visual scene is more of a vibe than a functional UI element. That's OK if you lean into it — make the scene ambient and put the readable content front and center.",
  "From a technical standpoint, PixiJS 8 for this use case is solid but slightly overkill. You could achieve 90% of the visual effect with CSS animations and SVG. That said, canvas gives you video export for free via MediaRecorder, which is a killer feature for shareability. The BYOK architecture is clean — edge function proxy avoids CORS, Zustand keeps state simple. Main concern: streaming chunk handlers can cause render thrashing. Throttle your React state updates.",
  "I tried to imagine using this as someone who doesn't know what an API key is, and honestly I'd bounce at the setup screen. 'Paste your Claude API key' is a non-starter for normies. For this to reach a broad audience, you'd need either a hosted version with built-in credits, or a much friendlier onboarding. The actual fishbowl experience though? Really cool. Watching characters argue about my idea feels way more approachable than getting a single AI response.",
  "The product instinct here is right — there's a real gap between enterprise synthetic research at fifty thousand dollars plus and free text-only tools. But I'd push back on the scope. You've got setup, scene rendering, conversation engine, streaming, video export, session save and load, and moderation all in the MVP. That's a lot. If I were prioritizing, I'd cut video export and session persistence from version one, nail the core loop, and add features once the core is solid.",
];

const CROSSTALK = [
  "Jordan makes a fair point about CSS vs Canvas, but the canvas approach is justified specifically because video export is the growth hack. Screenshots and recordings of pixel characters debating are inherently shareable — that's not a nice-to-have, that's your distribution strategy. I'd actually prioritize making the scene MORE visually interesting.",
  "I hear Alex on the API key friction, but this is explicitly an open-source BYOK tool — the target user for version one is developers and AI-curious power users, not complete beginners. A hosted version is a different product. Agree with Taylor on scope though — session save and load is premature.",
  "I want to push back on Taylor's suggestion to cut video export. Mei's right that the visual is the distribution — if I can't record and share a clip of these characters roasting my startup idea, what's the point? The whole appeal is the spectacle. Keep video, cut session persistence.",
  "OK, I'm hearing consensus: keep video export, cut session save and load from version one, and accept that API key setup is fine for the initial audience. But my core point stands — the magic moment is watching the discussion. Don't let debugging the scene engine eat all the time that should go into prompt quality and conversation flow.",
];

// Fake moderation responses — each set is used for successive questions
const MODERATION_RESPONSES = [
  [
    "Great question. From a UX perspective, the biggest risk is cognitive overload during the moderation phase itself. You're asking users to watch an animated scene, read streaming speech bubbles, track a live transcript, AND formulate questions — that's four competing attention streams. I'd suggest auto-pausing the scene when the input is focused, and making the transcript the primary reading surface during moderation. The scene becomes a visual anchor, not the information source.",
    "Technically, the moderation flow is straightforward — you're just appending a user message to the conversation context and running another round of inference. The tricky part is managing state transitions cleanly. Right now the spacebar handler, the input form, and the wrap-up button can all fire events simultaneously. You need a clear state machine: either the user is typing, a panelist is speaking, or the session is idle. No overlapping states.",
    "Honestly, the moderation part is where this gets really fun for me as a user. The first two phases — briefing and cross-talk — I'm just watching. But now I get to participate. The key thing is making it feel like a real conversation, not a form submission. Show my question in the scene somehow — maybe the observer character gets a speech bubble too? That would make it feel like I'm actually in the fishbowl.",
    "The moderation round is where product-market fit lives or dies. If users ask a question and get four generic responses, they'll feel like they're just prompting ChatGPT with extra steps. The responses need to feel like a continuation of the debate — panelists should reference each other's earlier points, disagree with each other, and build on the conversation that already happened. That's the whole point of a roundtable versus four separate chats.",
  ],
  [
    "I'd push for progressive disclosure here. Show the most opinionated or contrarian response first, and let the user expand to see the rest. In a real focus group, you don't hear from everyone on every question — you hear from whoever has the strongest reaction. We could rank responses by how much they diverge from the group consensus and surface the outlier first.",
    "One thing that would make this way more useful: let users tag or star specific responses during moderation. When you're running a real focus group, you're constantly noting the moments that matter. A simple bookmark or highlight on any transcript entry would make the results page dramatically more valuable. It's a small feature with outsized impact on the 'jobs to be done' for this tool.",
    "I keep coming back to the feeling of participation. Right now when I ask a question and four experts answer me thoughtfully — even fake experts — there's something satisfying about it. It's like having a personal advisory board. For regular people who don't have access to panels of experts, this is genuinely powerful. Don't underestimate the emotional value of feeling heard by smart people.",
    "Follow-up questions are where the real insights come from. The first question gets surface-level takes. The second question, informed by those takes, digs deeper. I'd bet the average high-value session has three to five moderation questions. So the experience needs to encourage that — maybe show a subtle prompt like 'dig deeper' or 'ask a follow-up' after each round of responses, rather than defaulting to 'wrap up' right away.",
  ],
];

const WRAPUP_RESPONSES = [
  "Ship the visual scene as your differentiator, but put the transcript front and center during moderation — that's where users actually extract value.",
  "Lock down the state machine before adding features. A clean pause-speak-idle cycle prevents every future bug in this UI.",
  "Make me feel like I'm in the room. If you nail the participation feeling during moderation, people will share this tool with everyone they know.",
  "Optimize for three-question sessions. Design the moderation UX to encourage follow-up questions, not to rush toward wrap-up.",
];

let fakeIdCounter = 0;
function fakeId(): string {
  return `fake-${++fakeIdCounter}`;
}

type ViewMode = 'briefing' | 'transition' | 'roundtable';

function TestPageContent() {
  const searchParams = useSearchParams();
  const editorMode = searchParams.get('editor') === '1';
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<FishbowlScene | null>(null);
  const [scene, setScene] = useState<FishbowlScene | null>(null);
  const sceneStateRef = useRef<FishbowlScene | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('briefing');
  const [currentRound, setCurrentRound] = useState<RoundType>('initial-takes');
  const [briefingIndex, setBriefingIndex] = useState(-1); // -1 = not started
  const [briefingText, setBriefingText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activePanelistId, setActivePanelistId] = useState<string | null>(null);
  const [panelistsSpoken, setPanelistsSpoken] = useState(0);
  const [hint, setHint] = useState('Press SPACE to meet your panel');

  // Moderation state
  const [showRoundtableChoice, setShowRoundtableChoice] = useState(false);
  const [inModeration, setInModeration] = useState(false);
  const [moderationQuestionCount, setModerationQuestionCount] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [fakeTokens, setFakeTokens] = useState({ input: 0, output: 0 });
  const [testExportMode, setTestExportMode] = useState<'summary' | 'transcript'>('transcript');
  const [layoutSnapshot, setLayoutSnapshot] = useState<LayoutEditorSnapshot | null>(null);
  const forceSceneVisible = searchParams.get('scene') === '1' || editorMode;

  const advanceResolverRef = useRef<(() => void) | null>(null);
  const transitionResolverRef = useRef<(() => void) | null>(null);
  const [waitingForAdvance, setWaitingForAdvance] = useState(false);
  const streamAbortRef = useRef(false);
  const startedRef = useRef(false);

  // Init PixiJS scene (hidden during briefing, shown during roundtable)
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;
    const s = new FishbowlScene();
    sceneRef.current = s;
    loadAllSprites().then(() => {
      if (!containerRef.current) return;
      s.initWithContainer(containerRef.current, {
        panelists: FAKE_PANELISTS,
        onReady: () => { setScene(s); sceneStateRef.current = s; },
      });
    });
    return () => { s.destroy(); sceneRef.current = null; };
  }, []);

  useEffect(() => {
    if (!scene) return;

    if (editorMode) {
      setViewMode('roundtable');
      setHint('Drag the characters, tags, and table to place them.');
      scene.enableLayoutEditor((snapshot) => {
        setLayoutSnapshot(snapshot);
      });
      setLayoutSnapshot(scene.getLayoutSnapshot());
      return () => {
        scene.disableLayoutEditor();
      };
    }

    scene.disableLayoutEditor();
    setLayoutSnapshot(null);
  }, [scene, editorMode]);

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
    setActivePanelistId(panelist.id);

    scene.setCharacterState(panelist.id, 'talking');
    scene.showSpeechBubble(panelist.id);
    FAKE_PANELISTS.forEach((p) => {
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
    FAKE_PANELISTS.forEach((p) => scene.setCharacterState(p.id, 'idle'));
    setIsSpeaking(false);
    setActivePanelistId(null);
  }, []);

  // Add an entry to the local transcript
  const addTranscriptEntry = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => [...prev, entry]);
  }, []);

  const addFakeTokens = useCallback((text: string) => {
    const outputTokens = Math.round(text.split(' ').length * 1.3);
    const inputTokens = 500;
    setFakeTokens((prev) => ({
      input: prev.input + inputTokens,
      output: prev.output + outputTokens,
    }));
  }, []);

  // Handle moderation question — streams fake responses from all panelists
  const handleModeration = useCallback(async (question: string) => {
    const s = sceneStateRef.current;
    if (!s || isSpeakingRef.current) return;

    // Add user question to transcript
    const userEntry: TranscriptEntry = {
      id: fakeId(),
      panelistId: 'user',
      panelistName: 'You',
      content: question,
      round: 'moderation',
      timestamp: Date.now(),
    };
    addTranscriptEntry(userEntry);

    // Pick the response set (cycle through available sets)
    const responseSetIndex = moderationQuestionCount % MODERATION_RESPONSES.length;
    const responses = MODERATION_RESPONSES[responseSetIndex];
    setModerationQuestionCount((prev) => prev + 1);

    setPanelistsSpoken(0);

    // Each panelist responds in turn, with spacebar pacing
    for (let i = 0; i < FAKE_PANELISTS.length; i++) {
      const panelist = FAKE_PANELISTS[i];
      setHint(`Press SPACE to hear ${panelist.name}'s response`);
      await waitForSpace();

      setHint(`${panelist.name} is responding...`);
      await streamRoundtableText(s, panelist, responses[i]);
      addFakeTokens(responses[i]);
      addTranscriptEntry({
        id: fakeId(),
        panelistId: panelist.id,
        panelistName: panelist.name,
        content: responses[i],
        round: 'moderation',
        timestamp: Date.now(),
      });
      setPanelistsSpoken(i + 1);
    }

    setHint('Ask another question, or press Wrap Up.');
  }, [moderationQuestionCount, streamRoundtableText, addTranscriptEntry, waitForSpace, addFakeTokens]);

  // Handle wrap-up — final one-sentence takeaways
  const handleWrapUp = useCallback(async () => {
    const s = sceneStateRef.current;
    if (!s || isSpeakingRef.current) return;

    setInModeration(false);
    setCurrentRound('wrap-up');
    setPanelistsSpoken(0);

    for (let i = 0; i < FAKE_PANELISTS.length; i++) {
      const panelist = FAKE_PANELISTS[i];
      setHint(`Press SPACE for ${panelist.name}'s final takeaway`);
      await waitForSpace();

      setHint(`${panelist.name} is wrapping up...`);
      await streamRoundtableText(s, panelist, WRAPUP_RESPONSES[i]);
      addFakeTokens(WRAPUP_RESPONSES[i]);
      addTranscriptEntry({
        id: fakeId(),
        panelistId: panelist.id,
        panelistName: panelist.name,
        content: WRAPUP_RESPONSES[i],
        round: 'wrap-up',
        timestamp: Date.now(),
      });
      setPanelistsSpoken(i + 1);
    }

    setSessionComplete(true);
    setHint('Session complete! Scroll down to see the full transcript.');
  }, [streamRoundtableText, addTranscriptEntry, waitForSpace, addFakeTokens]);

  // Run a single round of cross-talk (used both for initial and "Continue Roundtable")
  const runCrosstalkRound = useCallback(async () => {
    const s = sceneStateRef.current;
    if (!s) return;

    setCurrentRound('cross-talk');
    setPanelistsSpoken(0);

    for (let i = 0; i < CROSSTALK.length; i++) {
      setHint(`Press SPACE to hear ${FAKE_PANELISTS[i].name}'s response`);
      await waitForSpace();

      setHint(`${FAKE_PANELISTS[i].name} is responding...`);
      await streamRoundtableText(s, FAKE_PANELISTS[i], CROSSTALK[i]);
      addFakeTokens(CROSSTALK[i]);
      setPanelistsSpoken(i + 1);

      // Add to transcript
      addTranscriptEntry({
        id: fakeId(),
        panelistId: FAKE_PANELISTS[i].id,
        panelistName: FAKE_PANELISTS[i].name,
        content: CROSSTALK[i],
        round: 'cross-talk',
        timestamp: Date.now(),
      });

      setHint(`${FAKE_PANELISTS[i].name} finished.`);
    }

    // Show choice instead of auto-entering moderation
    setShowRoundtableChoice(true);
    setHint('What would you like to do?');
  }, [waitForSpace, streamRoundtableText, addTranscriptEntry, addFakeTokens]);

  // Handle "Continue the Roundtable" choice
  const handleContinueRoundtable = useCallback(async () => {
    setShowRoundtableChoice(false);
    await runCrosstalkRound();
  }, [runCrosstalkRound]);

  // Handle "Ask Questions" choice — enter moderation
  const handleAskQuestions = useCallback(async () => {
    setShowRoundtableChoice(false);
    const s = sceneStateRef.current;
    if (!s) return;
    setCurrentRound('moderation');
    setPanelistsSpoken(0);
    await s.addObserver();
    setInModeration(true);
    setHint('You\'re in the fishbowl. Ask the panel a question below, or press Wrap Up.');
  }, []);

  const skipToRoundtable = searchParams.get('skip') === '1';

  const runDemo = useCallback(async () => {
    if (!skipToRoundtable) {
      // === PHASE 1: INDIVIDUAL BRIEFINGS ===
      setViewMode('briefing');
      setCurrentRound('initial-takes');

      for (let i = 0; i < FAKE_PANELISTS.length; i++) {
        if (i === 0) {
          setBriefingIndex(i);
          setBriefingText('');
          setHint(`Press SPACE to hear ${FAKE_PANELISTS[i].name}'s take`);
          await waitForSpace();
        }

        setHint(`${FAKE_PANELISTS[i].name} is sharing their initial take...`);
        await streamBriefingText(INITIAL_TAKES[i]);
        addFakeTokens(INITIAL_TAKES[i]);
        setPanelistsSpoken(i + 1);

        // Add to transcript
        addTranscriptEntry({
          id: fakeId(),
          panelistId: FAKE_PANELISTS[i].id,
          panelistName: FAKE_PANELISTS[i].name,
          content: INITIAL_TAKES[i],
          round: 'initial-takes',
          timestamp: Date.now(),
        });

        if (i < FAKE_PANELISTS.length - 1) {
          setHint(`Press SPACE for ${FAKE_PANELISTS[i + 1].name}'s take`);
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
    }

    // === PHASE 2: ROUNDTABLE ===
    setViewMode('roundtable');
    setCurrentRound('cross-talk');
    await runCrosstalkRound();
  }, [skipToRoundtable, waitForSpace, streamBriefingText, addTranscriptEntry, addFakeTokens, runCrosstalkRound]);

  const runDemoRef = useRef(runDemo);
  runDemoRef.current = runDemo;

  const isSpeakingRef = useRef(false);
  isSpeakingRef.current = isSpeaking;

  // Spacebar handler — blocks during speaking, ignores when typing in input
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't capture space when user is typing in an input or textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        // Don't advance while someone is speaking
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

  // Auto-start when ?skip=1 is set
  useEffect(() => {
    if (skipToRoundtable && !startedRef.current && sceneStateRef.current) {
      startedRef.current = true;
      runDemoRef.current();
    }
  }, [skipToRoundtable, scene]);

  const currentPanelist = briefingIndex >= 0 ? FAKE_PANELISTS[briefingIndex] : null;
  const layoutSnippet = layoutSnapshot
    ? [
        layoutSnapshot.table
          ? `table.position.set(${layoutSnapshot.table.x}, ${layoutSnapshot.table.y});`
          : null,
        ...FAKE_PANELISTS.flatMap((panelist) => {
          const item = layoutSnapshot.panelists[panelist.id];
          if (!item) return [];
          return [
            `${panelist.name}: character { x: ${item.character.x}, y: ${item.character.y}, scale: ${item.character.scale} }`,
            `${panelist.name}: tag { x: ${item.tag.x}, y: ${item.tag.y}, tagX: ${item.tag.tagX}, tagY: ${item.tag.tagY} }`,
          ];
        }),
      ].filter(Boolean).join('\n')
    : '';

  return (
    <div className="min-h-screen">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--accent-gold)] opacity-[0.06] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 py-6 relative">
        <div className="text-center mb-4">
          <div className="label-mono mb-1">Test Mode — No API Calls</div>
          <h1 className="text-2xl font-700 tracking-tight" style={{ color: 'var(--text-primary)' }}>The Fishbowl</h1>
        </div>

        {/* === BRIEFING VIEW === */}
        {viewMode === 'briefing' && (
          <div className="max-w-[800px] mx-auto">
            {briefingIndex < 0 ? (
              /* Pre-start state */
              <div className="text-center py-20">
                <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>Your panel of {FAKE_PANELISTS.length} experts is ready.</p>
                <div className="flex justify-center gap-3 mt-6">
                  {FAKE_PANELISTS.map((p) => (
                    <div key={p.id} className="flex flex-col items-center gap-1">
                      <div
                        className="relative w-12 h-12 rounded-full overflow-hidden"
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
              /* Expert briefing card — large format */
              <div className="rounded-xl overflow-hidden animate-fade-in" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex">
                  {/* Left: Expert visual */}
                  <div className="w-64 flex-shrink-0 flex flex-col items-center justify-center py-10 px-6"
                    style={{ background: currentPanelist.color + '12', borderRight: `1px solid var(--border)` }}>
                    <div
                      className="relative w-24 h-24 rounded-full overflow-hidden mb-4"
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
                      <div className="text-lg font-700" style={{ color: 'var(--text-primary)' }}>{currentPanelist.name}</div>
                      <div className="label-mono mt-1" style={{ color: currentPanelist.color }}>{currentPanelist.role}</div>
                    </div>
                    <p className="text-xs text-center mt-3 leading-relaxed px-2" style={{ color: 'var(--text-muted)' }}>
                      {currentPanelist.description}
                    </p>
                    <div className="mt-4 label-mono" style={{ fontSize: '9px' }}>
                      Panelist {briefingIndex + 1} of {FAKE_PANELISTS.length}
                    </div>
                  </div>

                  {/* Right: Their take */}
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

        {/* === TRANSITION SCREEN === */}
        {viewMode === 'transition' && (
          <TransitionOverlay
            panelists={FAKE_PANELISTS.map((p) => ({ id: p.id, name: p.name, role: p.role, color: p.color }))}
            onComplete={handleTransitionComplete}
          />
        )}

        {/* === ROUNDTABLE VIEW (canvas always in DOM, hidden until needed) === */}
        <div style={{ display: viewMode === 'roundtable' || forceSceneVisible ? 'block' : 'none' }}>
          <div
            ref={containerRef}
            className="w-full max-w-[800px] mx-auto rounded-t-xl overflow-hidden shadow-lg"
            style={{ aspectRatio: '16/9', position: 'relative' }}
          >
            {/* Hint/choice overlay inside canvas */}
            {!editorMode && <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '12px 16px',
              background: 'linear-gradient(transparent, rgba(20, 12, 8, 0.7))',
              textAlign: 'center',
              zIndex: 10,
              pointerEvents: 'none',
            }}>
              {showRoundtableChoice ? (
                <div style={{ pointerEvents: 'auto' }}>
                  <p className="text-sm mb-3" style={{ color: 'var(--accent-gold)' }}>
                    What would you like to do?
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={handleContinueRoundtable}
                      className="px-5 py-2 rounded-lg text-sm font-500 glow-gold transition-all"
                      style={{ background: 'var(--accent-gold)', color: 'var(--bg-deep)' }}
                    >
                      Continue the Roundtable
                    </button>
                    <button
                      onClick={handleAskQuestions}
                      className="px-5 py-2 rounded-lg text-sm font-500 glow-gold transition-all"
                      style={{ background: 'var(--accent-gold)', color: 'var(--bg-deep)' }}
                    >
                      Ask Questions
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className={`text-sm ${!isSpeaking ? 'animate-pulse' : ''}`}
                    style={{ color: !isSpeaking ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                    {hint}
                  </p>
                  {!isSpeaking && waitingForAdvance && (
                    <button
                      onClick={() => {
                        if (advanceResolverRef.current) {
                          const resolver = advanceResolverRef.current;
                          advanceResolverRef.current = null;
                          setWaitingForAdvance(false);
                          resolver();
                        }
                      }}
                      className="mt-2 px-5 py-2 rounded-lg text-sm font-500 glow-gold transition-all"
                      style={{ background: 'var(--accent-gold)', color: 'var(--bg-deep)', pointerEvents: 'auto' }}
                    >
                      Continue (or press Space)
                    </button>
                  )}
                </>
              )}
            </div>}
          </div>
          {!editorMode && (() => {
            const cost = (fakeTokens.input / 1_000_000) * 3.00 + (fakeTokens.output / 1_000_000) * 15.00;
            const total = fakeTokens.input + fakeTokens.output;
            return (
              <StatusBar
                round={currentRound}
                panelistsSpoken={panelistsSpoken}
                totalPanelists={FAKE_PANELISTS.length}
                onWrapUp={handleWrapUp}
                canWrapUp={inModeration && !isSpeaking}
                modelLabel="Sonnet 4.6"
                costDollars={cost}
                totalTokens={total}
              />
            );
          })()}
        </div>

        {editorMode && (
          <div className="max-w-[800px] mx-auto mt-4 rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="label-mono mb-1">Layout Editor</div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Drag the four characters, the four name tags, and the table directly in the scene. The coordinates below update live.
                </p>
              </div>
              <button
                onClick={async () => {
                  if (!layoutSnippet) return;
                  await navigator.clipboard.writeText(layoutSnippet);
                }}
                className="px-4 py-2 rounded-lg text-sm font-500 glow-gold transition-all shrink-0"
                style={{ background: 'var(--accent-gold)', color: 'var(--bg-deep)' }}
              >
                Copy Coordinates
              </button>
            </div>
            <pre
              className="text-xs overflow-x-auto whitespace-pre-wrap rounded-lg p-3"
              style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              {layoutSnippet || 'Waiting for scene...'}
            </pre>
          </div>
        )}

        {/* Hint bar (visible during briefing/transition, before roundtable starts) */}
        {viewMode !== 'roundtable' && !editorMode && (
        <div className="max-w-[800px] mx-auto mt-6 text-center">
          <p className={`text-sm ${!isSpeaking ? 'animate-pulse' : ''}`}
            style={{ color: !isSpeaking ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
            {hint}
          </p>
          {!isSpeaking && !startedRef.current && briefingIndex < 0 && (
            <button
              onClick={() => {
                if (!startedRef.current) {
                  startedRef.current = true;
                  runDemoRef.current();
                }
              }}
              className="mt-3 px-5 py-2 rounded-lg text-sm font-500 glow-gold transition-all"
              style={{ background: 'var(--accent-gold)', color: 'var(--bg-deep)' }}
            >
              Start Demo (or press Space)
            </button>
          )}
        </div>
        )}

        {/* Moderation Input */}
        {inModeration && (
          <div className="max-w-[800px] mx-auto mt-4">
            <ModerationInput onSubmit={handleModeration} disabled={isSpeaking} />
          </div>
        )}

        {/* Live Transcript */}
        {viewMode === 'roundtable' && (
          <LiveTranscript
            entries={transcript}
            panelists={FAKE_PANELISTS}
            activePanelistId={activePanelistId}
            isSpeaking={isSpeaking}
          />
        )}

      </div>

      {/* === FULL-SCREEN SESSION COMPLETE OVERLAY === */}
      {sessionComplete && (
        <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: 'var(--bg-deep)' }}>
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-[0.08] rounded-full blur-[120px] pointer-events-none"
               style={{ background: 'var(--accent-gold)' }} />

          <div className="max-w-3xl mx-auto px-6 py-16 relative animate-fade-in">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="label-mono text-[10px] mb-3" style={{ color: 'var(--text-muted)' }}>
                Session Complete
              </div>
              <h1 className="text-3xl font-700" style={{ color: 'var(--text-primary)' }}>
                Your Fishbowl Results
              </h1>
              <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                {FAKE_PANELISTS.length} panelists · {moderationQuestionCount} questions asked · Test Mode
              </p>
            </div>

            {/* Export toggle */}
            <div className="rounded-xl p-6 mb-5" style={{ background: 'var(--bg-surface)' }}>
              <div className="label-mono text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
                What do you want to export?
              </div>
              <div className="flex gap-3 mb-5">
                <button
                  onClick={() => setTestExportMode('transcript')}
                  className="flex-1 p-4 rounded-xl text-left cursor-pointer transition-colors duration-200"
                  style={{
                    background: testExportMode === 'transcript' ? 'var(--text-primary)' : 'var(--bg-deep)',
                    color: testExportMode === 'transcript' ? 'var(--bg-deep)' : 'var(--text-primary)',
                    border: testExportMode === 'transcript' ? '2px solid var(--text-primary)' : '2px solid var(--border)',
                  }}
                >
                  <div className="font-semibold text-sm mb-1">Full Transcript</div>
                  <div className="text-xs leading-relaxed" style={{ opacity: 0.7 }}>
                    Every response from every panelist, in order.
                  </div>
                </button>
                <button
                  onClick={() => setTestExportMode('summary')}
                  className="flex-1 p-4 rounded-xl text-left cursor-pointer transition-colors duration-200"
                  style={{
                    background: testExportMode === 'summary' ? 'var(--text-primary)' : 'var(--bg-deep)',
                    color: testExportMode === 'summary' ? 'var(--bg-deep)' : 'var(--text-primary)',
                    border: testExportMode === 'summary' ? '2px solid var(--text-primary)' : '2px solid var(--border)',
                  }}
                >
                  <div className="font-semibold text-sm mb-1">AI Summary</div>
                  <div className="text-xs leading-relaxed" style={{ opacity: 0.7 }}>
                    Not available in test mode.
                  </div>
                </button>
              </div>

              {/* Download buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    let md = '# Fishbowl Test Session — Full Transcript\n\n';
                    let currentRoundLabel = '';
                    for (const entry of transcript) {
                      if (entry.round !== currentRoundLabel) {
                        currentRoundLabel = entry.round;
                        md += `\n## ${currentRoundLabel.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n`;
                      }
                      md += `**${entry.panelistName}:** ${entry.content}\n\n`;
                    }
                    const blob = new Blob([md], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `fishbowl-test-transcript-${Date.now()}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-white font-semibold text-sm cursor-pointer transition-all duration-200 hover:brightness-110"
                  style={{ background: 'var(--accent-gold)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  Download Markdown
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-xl p-6 mb-5" style={{ background: 'white', border: '1px solid var(--border)' }}>
              <div className="label-mono text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
                Preview — Full Transcript
              </div>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {transcript.map((entry) => {
                  const panelist = FAKE_PANELISTS.find((p) => p.id === entry.panelistId);
                  const isUser = entry.panelistId === 'user';
                  const color = panelist?.color || (isUser ? 'var(--accent-gold)' : 'var(--text-muted)');
                  return (
                    <div key={entry.id} className="text-sm">
                      <span className="font-600" style={{ color }}>{entry.panelistName}:</span>{' '}
                      <span style={{ color: isUser ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{entry.content}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cost tally */}
            <div className="rounded-xl p-5 flex items-center justify-between mb-5" style={{ background: 'var(--bg-surface)' }}>
              <div>
                <div className="label-mono text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Session Cost (Simulated)
                </div>
                <div className="text-3xl font-700" style={{ color: 'var(--text-primary)' }}>
                  ${((fakeTokens.input / 1_000_000) * 3.00 + (fakeTokens.output / 1_000_000) * 15.00).toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="label-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Input:</span>{' '}
                  {fakeTokens.input.toLocaleString()} tokens ·{' '}
                  <span style={{ color: 'var(--text-muted)' }}>Output:</span>{' '}
                  {fakeTokens.output.toLocaleString()} tokens
                </div>
                <div className="label-mono text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Model:</span> Sonnet 4.6 (Simulated) ·{' '}
                  <span style={{ color: 'var(--text-muted)' }}>Provider:</span> Test
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="my-6" style={{ borderTop: '2px solid var(--border)' }} />

            {/* Start New CTA */}
            <div className="text-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-3 px-10 py-4 rounded-xl text-lg font-semibold text-white cursor-pointer transition-all duration-200 hover:brightness-110"
                style={{
                  background: 'var(--accent-gold)',
                  boxShadow: '0 4px 16px rgba(196, 154, 42, 0.3)',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Run Test Again
              </button>
              <p className="label-mono text-[11px] mt-3 tracking-widest" style={{ color: 'var(--text-muted)' }}>
                Test mode · No API calls made
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <TestPageContent />
    </Suspense>
  );
}
