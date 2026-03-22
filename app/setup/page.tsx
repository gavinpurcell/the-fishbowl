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

  const hasPanelists = store.panelists.length >= 3;
  const hasIdea = !!(store.ideaText.trim() || store.ideaFiles.length > 0);
  const hasProvider = store.provider === 'ollama' || store.provider === 'claude-code' || !!store.apiKey.trim();
  const canStart = hasPanelists && hasIdea && hasProvider;

  // Progress calculation for readiness bar
  const readinessSteps = [hasPanelists, hasIdea, hasProvider];
  const completedSteps = readinessSteps.filter(Boolean).length;
  const readinessPercent = (completedSteps / readinessSteps.length) * 100;

  const handleStart = () => {
    store.startSession();
    router.push('/session');
  };

  return (
    <div className="min-h-screen">
      <OnboardingTour setStep={setStep} />

      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[var(--accent-gold)] opacity-[0.08] rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 relative">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12 animate-fade-in">
          <div className="label-mono mb-3 sm:mb-4">AI Focus Group</div>
          <h1 className="font-pixel text-2xl sm:text-4xl tracking-tight title-text" style={{}}>
            THE FISHBOWL
          </h1>
          <p className="mt-2 sm:mt-3 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Assemble your panel. Brief them. Watch them debate.
          </p>
        </div>

        {step === 'template' && (
          <div className="animate-fade-in" id="section-templates">
            <TemplatePicker onSelect={handleTemplateSelect} />
            <div className="text-center mt-10">
              <button
                onClick={handleBuildOwn}
                className="text-sm transition-colors"
                style={{
                  color: 'var(--accent-gold)',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '12px',
                  letterSpacing: '0.04em',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-amber)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-gold)'}
              >
                Or build your own panel from scratch
              </button>
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className="animate-fade-in">
            {/* Readiness progress bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="label-mono">
                  {canStart ? 'Ready to go' : `${completedSteps} of ${readinessSteps.length} steps complete`}
                </span>
                <div className="flex items-center gap-3">
                  {[
                    { done: hasPanelists, label: store.panelists.length === 0 ? 'Panel' : `${store.panelists.length}/3+` },
                    { done: hasIdea, label: 'Idea' },
                    { done: hasProvider, label: 'API' },
                  ].map((item) => (
                    <span
                      key={item.label}
                      className="flex items-center gap-1 text-[10px] transition-colors duration-300"
                      style={{
                        color: item.done ? 'var(--accent-gold)' : 'var(--text-muted)',
                        fontFamily: "'DM Mono', monospace",
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}
                    >
                      <span
                        className="step-dot"
                        style={{
                          background: item.done ? 'var(--accent-gold)' : 'var(--border)',
                          boxShadow: item.done ? '0 0 6px rgba(196, 154, 42, 0.4)' : 'none',
                        }}
                      />
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="readiness-bar">
                <div
                  className="readiness-bar-fill"
                  style={{ width: `${readinessPercent}%` }}
                />
              </div>
            </div>

            {/* Two-column layout on desktop */}
            <div className="configure-grid">
              {/* Left column: Panel */}
              <div className="space-y-8">
                <div id="section-panelists">
                  <PanelistBuilder
                    panelists={store.panelists}
                    onUpdate={store.setPanelists}
                  />
                </div>
              </div>

              {/* Right column: Idea + API Provider */}
              <div className="space-y-8">
                <div id="section-idea">
                  <IdeaInput
                    ideaText={store.ideaText}
                    ideaFiles={store.ideaFiles}
                    onTextChange={store.setIdeaText}
                    onFilesChange={store.setIdeaFiles}
                  />
                </div>

                {/* Cost estimate */}
                {store.provider !== 'ollama' && store.panelists.length >= 3 && (
                  <div
                    className="rounded-lg p-3 flex items-center gap-2"
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      <path d="M8 5v4M6.5 7h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                    </svg>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {(() => {
                        const est = estimateSessionCost(store.modelId, store.panelists.length);
                        return `Est. cost: ${formatCost(est.low)} - ${formatCost(est.high)}`;
                      })()}
                    </span>
                  </div>
                )}

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
              </div>
            </div>

            {/* Bottom bar: back + start */}
            <div className="mt-10 pt-8" style={{ borderTop: '1px solid var(--border)' }}>
              {/* Start button - full width dramatic CTA */}
              <button
                onClick={handleStart}
                disabled={!canStart}
                className="start-button-dramatic"
              >
                {canStart ? 'Start the Fishbowl' : 'Complete setup to begin'}
              </button>

              <div className="text-center mt-4">
                <button
                  onClick={() => setStep('template')}
                  className="text-xs transition-colors"
                  style={{
                    color: 'var(--text-muted)',
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: '0.04em',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  Back to templates
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
