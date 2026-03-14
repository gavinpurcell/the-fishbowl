'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FishbowlScene } from '@/scene/FishbowlScene';
import type { Panelist } from '@/engine/types';

const FAKE_PANELISTS: Panelist[] = [
  { id: 'p1', name: 'Victoria', role: 'VC', description: '', systemPrompt: '', color: '#4a9a7a', spriteIndex: 0 },
  { id: 'p2', name: 'Derek', role: 'Growth', description: '', systemPrompt: '', color: '#e74c4c', spriteIndex: 1 },
  { id: 'p3', name: 'Priya', role: 'Customer', description: '', systemPrompt: '', color: '#4477ee', spriteIndex: 2 },
  { id: 'p4', name: 'Carl', role: 'Skeptic', description: '', systemPrompt: '', color: '#e44a9a', spriteIndex: 3 },
];

const FAKE_RESPONSES = [
  "I think the positioning is actually pretty strong here. The accessible AI briefing for non-technical people is a real lane. But the revenue model concerns me — $425/month net after three years is not a business, it's a hobby.",
  "Sarah's right about the revenue but wrong about the timing. You should be pitching sponsors NOW, not waiting for 100K subs. Your 40% newsletter open rate is exceptional and sponsors know it. That's your lead card.",
  "As someone who represents the target audience — I'd actually pay for this if there was a premium tier. The content is clearly valuable. But I need to know what I'm getting that I can't get from Matt Wolfe for free.",
  "Everyone's being too nice. The real problem is you have no moat. Any AI-savvy creator can launch a competing show tomorrow. The two-host chemistry is your only defensible asset and one of them isn't fully committed. That's a structural risk.",
];

export default function TestPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<FishbowlScene | null>(null);
  const [scene, setScene] = useState<FishbowlScene | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamAbortRef = useRef(false);

  const addLog = (msg: string) => setLog((prev) => [...prev.slice(-20), msg]);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    const s = new FishbowlScene();
    sceneRef.current = s;

    s.initWithContainer(containerRef.current, {
      panelists: FAKE_PANELISTS,
      onReady: () => {
        addLog('Scene ready! Press SPACE to advance through the demo.');
        setScene(s);
      },
    });

    return () => {
      s.destroy();
      sceneRef.current = null;
    };
  }, []);

  const streamResponse = useCallback(async (scene: FishbowlScene, panelistIndex: number) => {
    const p = FAKE_PANELISTS[panelistIndex];
    const text = FAKE_RESPONSES[panelistIndex];

    setIsStreaming(true);
    streamAbortRef.current = false;
    addLog(`${p.name} is speaking...`);

    // Set speaking character to talking, others to thinking/reacting
    scene.setCharacterState(p.id, 'talking');
    scene.showSpeechBubble(p.id);
    FAKE_PANELISTS.forEach((other) => {
      if (other.id !== p.id) {
        scene.setCharacterState(other.id, Math.random() > 0.7 ? 'reacting' : 'thinking');
      }
    });

    // Stream word by word
    const words = text.split(' ');
    for (const word of words) {
      if (streamAbortRef.current) break;
      await new Promise((r) => setTimeout(r, 60));
      scene.appendToBubble(p.id, word + ' ');
    }

    // Done speaking — reset to idle
    scene.setCharacterState(p.id, 'idle');
    FAKE_PANELISTS.forEach((other) => {
      if (other.id !== p.id) scene.setCharacterState(other.id, 'idle');
    });

    setIsStreaming(false);
    addLog(`${p.name} finished.${panelistIndex < 3 ? ' Press SPACE for next.' : ' Demo complete!'}`);
  }, []);

  const advanceStep = useCallback(() => {
    if (!scene || isStreaming) return;

    if (currentStep < 4) {
      // Stream each panelist's response
      streamResponse(scene, currentStep);
      setCurrentStep((prev) => prev + 1);
    } else if (currentStep === 4) {
      // Move observer in
      scene.moveObserverIn();
      addLog('Observer stepping into the fishbowl. Press SPACE to restart.');
      setCurrentStep(5);
    } else {
      // Reset — reload the page to fully reset PixiJS state
      window.location.reload();
    }
  }, [scene, currentStep, isStreaming, streamResponse]);

  // Spacebar handler
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        advanceStep();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [advanceStep]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-2">Fishbowl Scene Test</h1>
      <p className="text-gray-500 text-sm mb-4">Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">SPACE</kbd> to advance through the demo. No API calls.</p>

      <div
        ref={containerRef}
        className="w-full max-w-[800px] mx-auto rounded-lg shadow-lg overflow-hidden bg-white"
        style={{ aspectRatio: '4/3' }}
      />

      <div className="max-w-[800px] mx-auto mt-4 flex flex-wrap gap-2">
        <button
          onClick={advanceStep}
          disabled={isStreaming}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
        >
          {currentStep === 0 ? 'Start Demo' : currentStep <= 4 ? `Next (${currentStep}/4 spoke)` : 'Restart'}
        </button>
        {isStreaming && (
          <span className="px-3 py-2 text-amber-600 text-sm animate-pulse">Speaking...</span>
        )}
      </div>

      <div className="max-w-[800px] mx-auto mt-4 p-3 bg-black text-green-400 rounded font-mono text-xs h-32 overflow-y-auto">
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}
