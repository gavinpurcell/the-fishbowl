'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFishbowlStore } from '@/lib/store';
import { createPanelistFromTemplate } from '@/engine/panelist';
import type { PanelTemplate } from '@/engine/types';
import TemplatePicker from '@/components/setup/TemplatePicker';
import PanelistBuilder from '@/components/setup/PanelistBuilder';
import IdeaInput from '@/components/setup/IdeaInput';
import ApiKeyConfig from '@/components/setup/ApiKeyConfig';
import OnboardingTour from '@/components/setup/OnboardingTour';
import { estimateSessionCost, formatCost } from '@/lib/models';

export default function SetupPage() {
  const router = useRouter();
  const store = useFishbowlStore();
  const [step, setStep] = useState<'template' | 'configure'>('template');

  const handleTemplateSelect = (template: PanelTemplate) => {
    const panelists = template.panelists.map((p, i) => createPanelistFromTemplate(p, i));
    store.setPanelists(panelists);
    setStep('configure');
  };

  const handleBuildOwn = () => {
    store.setPanelists([]);
    setStep('configure');
  };

  const canStart =
    store.panelists.length >= 3 &&
    (store.ideaText.trim() || store.ideaFiles.length > 0) &&
    (store.provider === 'ollama' || store.apiKey.trim());

  const handleStart = () => {
    store.startSession();
    router.push('/session');
  };

  return (
    <div className="min-h-screen">
      <OnboardingTour setStep={setStep} />

      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[var(--accent-gold)] opacity-[0.08] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-6 py-16 relative">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="label-mono mb-4">AI Focus Group</div>
          <h1 className="text-5xl font-800 tracking-tight" style={{ color: 'var(--text-primary)' }}>
            The Fishbowl
          </h1>
          <p className="mt-3 text-lg" style={{ color: 'var(--text-secondary)' }}>
            Watch AI experts debate your ideas. Then step in and ask questions.
          </p>
        </div>

        {step === 'template' && (
          <div className="animate-fade-in" id="section-templates">
            <TemplatePicker onSelect={handleTemplateSelect} />
            <div className="text-center mt-10">
              <button
                onClick={handleBuildOwn}
                className="text-sm transition-colors"
                style={{ color: 'var(--accent-gold)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-amber)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-gold)'}
              >
                Or build your own panel from scratch
              </button>
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-10 animate-fade-in">
            <div id="section-panelists">
              <PanelistBuilder
                panelists={store.panelists}
                onUpdate={store.setPanelists}
              />
            </div>

            <div id="section-idea">
              <IdeaInput
                ideaText={store.ideaText}
                ideaFiles={store.ideaFiles}
                onTextChange={store.setIdeaText}
                onFilesChange={store.setIdeaFiles}
              />
            </div>

            <div id="section-api">
              <ApiKeyConfig
                provider={store.provider}
                apiKey={store.apiKey}
                modelId={store.modelId}
                onProviderChange={store.setProvider}
                onApiKeyChange={store.setApiKey}
                onModelChange={store.setModelId}
              />
            </div>

            {store.provider !== 'ollama' && store.panelists.length >= 3 && (
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {(() => {
                  const est = estimateSessionCost(store.modelId, store.panelists.length);
                  return `Estimated session cost: ~${formatCost(est.low)} – ${formatCost(est.high)}`;
                })()}
              </div>
            )}

            <div className="flex items-center justify-between pt-6" style={{ borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setStep('template')}
                className="text-sm transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                Back to templates
              </button>
              <button
                onClick={handleStart}
                disabled={!canStart}
                className="px-8 py-3 rounded-lg font-600 text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed glow-gold"
                style={{
                  background: canStart ? 'var(--accent-gold)' : 'var(--border)',
                  color: canStart ? 'var(--bg-deep)' : 'var(--text-muted)',
                }}
              >
                Start the Fishbowl
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
