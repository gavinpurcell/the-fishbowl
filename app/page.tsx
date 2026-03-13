'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFishbowlStore } from '@/lib/store';
import { createPanelistFromTemplate } from '@/engine/panelist';
import type { PanelTemplate, Panelist } from '@/engine/types';
import TemplatePicker from '@/components/setup/TemplatePicker';
import PanelistBuilder from '@/components/setup/PanelistBuilder';
import IdeaInput from '@/components/setup/IdeaInput';
import ApiKeyConfig from '@/components/setup/ApiKeyConfig';

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
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight">The Fishbowl</h1>
          <p className="text-gray-500 mt-2 text-lg">
            Watch AI experts debate your ideas. Then step in and ask questions.
          </p>
        </div>

        {step === 'template' && (
          <div>
            <TemplatePicker onSelect={handleTemplateSelect} />
            <div className="text-center mt-8">
              <button
                onClick={handleBuildOwn}
                className="text-blue-600 hover:underline text-sm"
              >
                Or build your own panel from scratch
              </button>
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-8">
            <PanelistBuilder
              panelists={store.panelists}
              onUpdate={store.setPanelists}
            />

            <IdeaInput
              ideaText={store.ideaText}
              ideaFiles={store.ideaFiles}
              onTextChange={store.setIdeaText}
              onFilesChange={store.setIdeaFiles}
            />

            <ApiKeyConfig
              provider={store.provider}
              apiKey={store.apiKey}
              onProviderChange={store.setProvider}
              onApiKeyChange={store.setApiKey}
            />

            <div className="flex items-center justify-between pt-4 border-t">
              <button
                onClick={() => setStep('template')}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Back to templates
              </button>
              <button
                onClick={handleStart}
                disabled={!canStart}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
