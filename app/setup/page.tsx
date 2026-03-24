'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFishbowlStore } from '@/lib/store';
import { createPanelistFromTemplate } from '@/engine/panelist';
import type { PanelTemplate, Panelist } from '@/engine/types';
import TemplatePicker from '@/components/setup/TemplatePicker';
import PanelistBuilder from '@/components/setup/PanelistBuilder';
import IdeaInput from '@/components/setup/IdeaInput';
import ApiKeyConfig from '@/components/setup/ApiKeyConfig';
import OnboardingTour from '@/components/setup/OnboardingTour';
import { estimateSessionCost, formatCost } from '@/lib/models';

export default function SetupPage() {
  const router = useRouter();
  const store = useFishbowlStore();

  // Auto-reset stale session data when arriving at setup after a completed session
  useEffect(() => {
    if (store.status === 'completed') {
      store.resetSession();
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps
  const [step, setStep] = useState<'template' | 'configure'>('template');
  const [templateName, setTemplateName] = useState<string | null>(null);

  const handleTemplateSelect = (template: PanelTemplate) => {
    const panelists: Panelist[] = [];
    for (const p of template.panelists) {
      panelists.push(createPanelistFromTemplate(p, panelists));
    }
    store.setPanelists(panelists);
    setTemplateName(template.name);
    setStep('configure');
  };

  const handleBuildOwn = () => {
    store.setPanelists([]);
    setTemplateName(null);
    setStep('configure');
  };

  const hasPanelists = store.panelists.length >= 3;
  const hasIdea = !!(store.ideaText.trim() || store.ideaFiles.length > 0);
  // Provider is always ready — server has ANTHROPIC_API_KEY
  const hasProvider = true;
  const canStart = hasPanelists && hasIdea;

  // Progress calculation for readiness bar (2 steps now: panel + idea)
  const readinessSteps = [hasPanelists, hasIdea];
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
                    { done: hasPanelists, label: store.panelists.length === 0 ? 'Panel' : `${store.panelists.length}/3-4` },
                    { done: hasIdea, label: 'Idea' },
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
                  {templateName && (
                    <h2 className="font-pixel text-lg tracking-tight title-text mb-4">{templateName}</h2>
                  )}
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
                {store.panelists.length >= 3 && (
                  <div className="cost-badge">
                    <div className="cost-badge-icon">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path d="M8 1L10.5 6L16 7L12 11L13 16L8 13.5L3 16L4 11L0 7L5.5 6L8 1Z" fill="var(--accent-gold)" />
                      </svg>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="cost-badge-label">Estimated Cost</span>
                      {store.provider === 'claude-code' ? (
                        <span className="cost-badge-free">Free</span>
                      ) : (
                        <span className="cost-badge-value">
                          {(() => {
                            const est = estimateSessionCost(store.modelId, store.panelists.length);
                            return `${formatCost(est.low)} - ${formatCost(est.high)}`;
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* API config hidden — server uses ANTHROPIC_API_KEY */}
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
