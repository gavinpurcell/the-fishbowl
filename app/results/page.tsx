'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFishbowlStore } from '@/lib/store';
import { getModelById, formatCost, formatTokens } from '@/lib/models';
import Transcript from '@/components/results/Transcript';
import Summary from '@/components/results/Summary';
import ExportActions from '@/components/results/ExportActions';

export default function ResultsPage() {
  const router = useRouter();
  const store = useFishbowlStore();

  // Redirect if no completed session
  useEffect(() => {
    if (store.status !== 'completed' || store.transcript.length === 0) {
      router.replace('/');
    }
  }, [store.status, store.transcript.length, router]);

  const handleContinueSession = () => {
    store.continueSession();
    router.push('/');
  };

  const handleNewSession = () => {
    store.resetSession();
    router.push('/');
  };

  const handleImportSession = (
    transcript: typeof store.transcript,
    summary: string | null,
    config: ReturnType<typeof store.getSessionConfig>
  ) => {
    store.setPanelists(config.panelists);
    store.setIdeaText(config.ideaText);
    store.setIdeaFiles(config.ideaFiles);
    store.setProvider(config.provider);
    store.setTranscript(transcript);
    if (summary) {
      store.setSummary(summary);
    }
    store.completeSession();
  };

  if (store.status !== 'completed' || store.transcript.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Session Results</h1>
          <p className="text-gray-500 mt-2">
            {store.panelists.length} panelists &middot; {store.transcript.length} messages
            {(() => {
              const model = getModelById(store.modelId);
              const tokens = store.sessionCost.inputTokens + store.sessionCost.outputTokens;
              if (!model || tokens === 0) return null;
              const cost = (store.sessionCost.inputTokens / 1_000_000) * model.inputPer1M +
                (store.sessionCost.outputTokens / 1_000_000) * model.outputPer1M;
              return <> &middot; {formatCost(cost)} ({formatTokens(tokens)} tokens)</>;
            })()}
          </p>
        </div>

        {/* Export actions (top) */}
        <div className="mb-8">
          <ExportActions
            transcript={store.transcript}
            summary={store.summary}
            sessionConfig={store.getSessionConfig()}
            onContinueSession={handleContinueSession}
            onNewSession={handleNewSession}
            onImportSession={handleImportSession}
          />
        </div>

        {/* Summary */}
        {store.summary && (
          <div className="mb-10 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-lg font-bold text-blue-900 mb-4">AI Summary</h2>
            <Summary summary={store.summary} />
          </div>
        )}

        {/* Full Transcript */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Full Transcript</h2>
          <Transcript
            transcript={store.transcript}
            panelists={store.panelists}
          />
        </div>

        {/* Export actions (bottom) */}
        <div className="pt-6 border-t">
          <ExportActions
            transcript={store.transcript}
            summary={store.summary}
            sessionConfig={store.getSessionConfig()}
            onContinueSession={handleContinueSession}
            onNewSession={handleNewSession}
            onImportSession={handleImportSession}
          />
        </div>
      </div>
    </div>
  );
}
