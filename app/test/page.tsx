'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FishbowlScene } from '@/scene/FishbowlScene';
import type { Panelist, RoundType, TranscriptEntry } from '@/engine/types';
import StatusBar from '@/components/scene/StatusBar';
import ModerationInput from '@/components/scene/ModerationInput';
import { formatCost, formatTokens } from '@/lib/models';

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

export default function TestPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<FishbowlScene | null>(null);
  const [scene, setScene] = useState<FishbowlScene | null>(null);
  const sceneStateRef = useRef<FishbowlScene | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('briefing');
  const [currentRound, setCurrentRound] = useState<RoundType>('initial-takes');
  const [briefingIndex, setBriefingIndex] = useState(-1); // -1 = not started
  const [briefingText, setBriefingText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [panelistsSpoken, setPanelistsSpoken] = useState(0);
  const [roundtableSpeakerIndex, setRoundtableSpeakerIndex] = useState(0);
  const [hint, setHint] = useState('Press SPACE to meet your panel');

  // Moderation state
  const [inModeration, setInModeration] = useState(false);
  const [moderationQuestionCount, setModerationQuestionCount] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [fakeTokens, setFakeTokens] = useState({ input: 0, output: 0 });

  const advanceResolverRef = useRef<(() => void) | null>(null);
  const streamAbortRef = useRef(false);
  const startedRef = useRef(false);

  // Init PixiJS scene (hidden during briefing, shown during roundtable)
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;
    const s = new FishbowlScene();
    sceneRef.current = s;
    s.initWithContainer(containerRef.current, {
      panelists: FAKE_PANELISTS,
      onReady: () => { setScene(s); sceneStateRef.current = s; },
    });
    return () => { s.destroy(); sceneRef.current = null; };
  }, []);

  const waitForSpace = useCallback((): Promise<void> => {
    return new Promise((resolve) => { advanceResolverRef.current = resolve; });
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

  const runDemo = useCallback(async () => {
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
    await new Promise((r) => setTimeout(r, 2000));

    // === PHASE 2: ROUNDTABLE ===
    setViewMode('roundtable');
    setCurrentRound('cross-talk');
    setPanelistsSpoken(0);
    const s = sceneStateRef.current;
    if (!s) return;

    for (let i = 0; i < CROSSTALK.length; i++) {
      setHint(`Press SPACE to hear ${FAKE_PANELISTS[i].name}'s response`);
      await waitForSpace();

      setRoundtableSpeakerIndex(i);
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

    // === MODERATION ===
    setHint('Press SPACE to enter the fishbowl');
    await waitForSpace();
    setCurrentRound('moderation');
    setPanelistsSpoken(0);
    s.moveObserverIn();
    setInModeration(true);
    setHint('You\'re in the fishbowl. Ask the panel a question below, or press Wrap Up.');
  }, [waitForSpace, streamBriefingText, streamRoundtableText, addTranscriptEntry, addFakeTokens]);

  const runDemoRef = useRef(runDemo);
  runDemoRef.current = runDemo;

  const isSpeakingRef = useRef(false);
  // Keep ref in sync
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

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

  const currentPanelist = briefingIndex >= 0 ? FAKE_PANELISTS[briefingIndex] : null;

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
              /* Expert briefing card — large format */
              <div className="rounded-xl overflow-hidden animate-fade-in" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div className="flex">
                  {/* Left: Expert visual */}
                  <div className="w-64 flex-shrink-0 flex flex-col items-center justify-center py-10 px-6"
                    style={{ background: currentPanelist.color + '12', borderRight: `1px solid var(--border)` }}>
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
          <div className="max-w-[800px] mx-auto text-center py-24 animate-fade-in">
            <div className="label-mono mb-4" style={{ color: 'var(--accent-gold)' }}>All panelists briefed</div>
            <h2 className="text-4xl font-800 tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Start the Discussion
            </h2>
            <p className="mt-3 text-lg" style={{ color: 'var(--text-secondary)' }}>
              The panel will now debate with each other.
            </p>
            <div className="flex justify-center gap-2 mt-8">
              {FAKE_PANELISTS.map((p) => (
                <div key={p.id} className="w-3 h-3 rounded-full" style={{ background: p.color }} />
              ))}
            </div>
          </div>
        )}

        {/* === ROUNDTABLE VIEW (canvas always in DOM, hidden until needed) === */}
        <div style={{ display: viewMode === 'roundtable' ? 'block' : 'none' }}>
          <div
            ref={containerRef}
            className="w-full max-w-[800px] mx-auto rounded-t-xl overflow-hidden shadow-lg"
            style={{ aspectRatio: '4/3' }}
          />
          {(() => {
            const cost = (fakeTokens.input / 1_000_000) * 3.00 + (fakeTokens.output / 1_000_000) * 15.00;
            const total = fakeTokens.input + fakeTokens.output;
            return (
              <StatusBar
                round={currentRound}
                panelistsSpoken={panelistsSpoken}
                totalPanelists={FAKE_PANELISTS.length}
                onWrapUp={handleWrapUp}
                canWrapUp={inModeration && !isSpeaking}
                costDollars={cost}
                totalTokens={total}
              />
            );
          })()}
        </div>

        {/* Hint bar (always visible) */}
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

        {/* Moderation Input */}
        {inModeration && (
          <div className="max-w-[800px] mx-auto mt-4">
            <ModerationInput onSubmit={handleModeration} disabled={isSpeaking} />
          </div>
        )}

        {/* Live Transcript */}
        {transcript.length > 0 && viewMode === 'roundtable' && (
          <div className="max-w-[800px] mx-auto mt-6">
            <div className="label-mono mb-2">Transcript</div>
            <div className="rounded-xl p-4 max-h-64 overflow-y-auto space-y-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
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
        )}

        {/* Session complete summary */}
        {sessionComplete && (
          <div className="max-w-[800px] mx-auto mt-6 text-center">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 rounded-lg text-sm font-500 transition-all"
              style={{ background: 'var(--accent-gold)', color: 'var(--bg-deep)' }}
            >
              Run Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
