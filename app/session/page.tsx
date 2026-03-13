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
import type { RoundType } from '@/engine/types';

export default function SessionPage() {
  const router = useRouter();
  const store = useFishbowlStore();

  const sceneRef = useRef<FishbowlScene | null>(null);
  const orchestratorRef = useRef<ConversationOrchestrator | null>(null);
  const recorderRef = useRef<VideoRecorder | null>(null);

  const [currentRound, setCurrentRound] = useState<RoundType>('initial-takes');
  const [panelistsSpoken, setPanelistsSpoken] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWrappingUp, setIsWrappingUp] = useState(false);

  // Redirect to setup if no active session
  useEffect(() => {
    if (store.status !== 'running' || store.panelists.length < 3) {
      router.replace('/');
    }
  }, [store.status, store.panelists.length, router]);

  const setNonSpeakingCharacterStates = useCallback((speakingId: string) => {
    const scene = sceneRef.current;
    if (!scene) return;

    store.panelists.forEach((p) => {
      if (p.id !== speakingId) {
        // 70% thinking, 30% reacting for liveliness
        const state = Math.random() < 0.7 ? 'thinking' : 'reacting';
        scene.setCharacterState(p.id, state);
      }
    });
  }, [store.panelists]);

  const resetAllCharactersToIdle = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    store.panelists.forEach((p) => {
      scene.setCharacterState(p.id, 'idle');
    });
  }, [store.panelists]);

  const handleSceneReady = useCallback(async (scene: FishbowlScene) => {
    sceneRef.current = scene;

    // Start video recording
    const canvas = scene.getCanvas();
    if (canvas) {
      const recorder = new VideoRecorder();
      recorderRef.current = recorder;
      recorder.start(canvas);
    }

    // Create LLM provider
    const provider = createProvider(store.provider, store.apiKey);

    // Create conversation orchestrator with scene-driving callbacks
    const orchestrator = new ConversationOrchestrator(
      store.panelists,
      store.ideaText,
      store.ideaFiles,
      provider,
      {
        onRoundChange: (round: RoundType) => {
          setCurrentRound(round);
          store.setCurrentRound(round);
        },
        onPanelistActivated: (panelistId: string) => {
          setIsProcessing(true);
          setPanelistsSpoken((prev) => prev + 1);
          store.setActivePanelist(panelistId);

          // Set speaking character to talking state
          scene.setCharacterState(panelistId, 'talking');
          scene.showSpeechBubble(panelistId);

          // Make non-speaking characters look alive
          setNonSpeakingCharacterStates(panelistId);
        },
        onPanelistDeactivated: () => {
          setIsProcessing(false);
          store.setActivePanelist(null);

          // Reset all to idle briefly
          resetAllCharactersToIdle();

          // Hide all speech bubbles
          store.panelists.forEach((p) => {
            scene.hideSpeechBubble(p.id);
          });
        },
        onTranscriptEntry: (entry) => {
          store.addTranscriptEntry(entry);
        },
        onStreamChunk: (panelistId: string, chunk: string) => {
          scene.appendToBubble(panelistId, chunk);
          store.appendToLastEntry(chunk);
        },
        onError: (err: Error) => {
          setError(err.message);
          console.error('Conversation error:', err);
        },
      }
    );

    orchestratorRef.current = orchestrator;

    // Run auto rounds (initial takes + cross-talk)
    try {
      await orchestrator.runAutoRounds();

      // After auto rounds, show moderation input and move observer in
      setShowModeration(true);
      setCurrentRound('moderation');
      store.setCurrentRound('moderation');
      scene.moveObserverIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during the discussion.');
    }
  }, [store, setNonSpeakingCharacterStates, resetAllCharactersToIdle]);

  const handleModeration = useCallback(async (question: string) => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator || isProcessing) return;

    setError(null);
    try {
      await orchestrator.handleModerationQuestion(question);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing question.');
    }
  }, [isProcessing]);

  const handleWrapUp = useCallback(async () => {
    const orchestrator = orchestratorRef.current;
    if (!orchestrator || isWrappingUp) return;

    setIsWrappingUp(true);
    setShowModeration(false);
    setError(null);

    try {
      // Run wrap-up round
      await orchestrator.runWrapUp();

      // Stop video recording and save blob URL
      if (recorderRef.current?.isRecording) {
        const blob = await recorderRef.current.stop();
        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);
          sessionStorage.setItem('fishbowl-video-url', url);
        }
      }

      // Generate summary
      const summary = await orchestrator.generateSummary();
      store.setSummary(summary);

      // Save final transcript
      store.setTranscript(orchestrator.getTranscript());

      // Complete session and navigate to results
      store.completeSession();
      router.push('/results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error during wrap-up.');
      setIsWrappingUp(false);
    }
  }, [isWrappingUp, store, router]);

  // Don't render if session not running
  if (store.status !== 'running' || store.panelists.length < 3) {
    return null;
  }

  // Count only non-observer panelists for the status display
  const totalPanelists = store.panelists.length;
  const canWrapUp = showModeration && !isProcessing && !isWrappingUp;

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile fallback */}
      <div className="md:hidden flex items-center justify-center min-h-screen p-8 text-center">
        <div>
          <h2 className="text-xl font-bold mb-2">Open on desktop for the full experience</h2>
          <p className="text-gray-500 text-sm">
            The Fishbowl uses a pixel-art scene that requires a larger screen.
          </p>
          <button
            onClick={() => router.replace('/')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          >
            Go Back
          </button>
        </div>
      </div>

      {/* Desktop session view */}
      <div className="hidden md:block">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight">The Fishbowl</h1>
            <p className="text-gray-500 text-sm mt-1">Live session in progress</p>
          </div>

          {/* PixiJS Scene */}
          <FishbowlCanvas
            panelists={store.panelists}
            onSceneReady={handleSceneReady}
          />

          {/* Status Bar */}
          <StatusBar
            round={currentRound}
            panelistsSpoken={panelistsSpoken}
            totalPanelists={totalPanelists}
            onWrapUp={handleWrapUp}
            canWrapUp={canWrapUp}
          />

          {/* Error message */}
          {error && (
            <div className="max-w-[800px] mx-auto mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <strong>Error:</strong> {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-500 hover:text-red-700 underline text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Moderation Input */}
          {showModeration && (
            <ModerationInput
              onSubmit={handleModeration}
              disabled={isProcessing || isWrappingUp}
            />
          )}

          {/* Wrapping up indicator */}
          {isWrappingUp && (
            <div className="max-w-[800px] mx-auto mt-4 text-center text-gray-500 text-sm">
              <span className="animate-pulse">Wrapping up the discussion...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
