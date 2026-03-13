'use client';

import { useEffect } from 'react';
import type { ProviderType } from '@/engine/types';

interface Props {
  provider: ProviderType;
  apiKey: string;
  onProviderChange: (provider: ProviderType) => void;
  onApiKeyChange: (key: string) => void;
}

export default function ApiKeyConfig({ provider, apiKey, onProviderChange, onApiKeyChange }: Props) {
  useEffect(() => {
    const savedKey = localStorage.getItem(`fishbowl-apikey-${provider}`);
    if (savedKey && !apiKey) {
      onApiKeyChange(savedKey);
    }
  }, [provider]);

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(`fishbowl-apikey-${provider}`, apiKey);
    }
  }, [apiKey, provider]);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">API Key</h2>

      <div className="flex gap-2 mb-3">
        {(['claude', 'openai', 'ollama'] as ProviderType[]).map((p) => (
          <button
            key={p}
            onClick={() => onProviderChange(p)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              provider === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {p === 'claude' ? 'Claude' : p === 'openai' ? 'OpenAI' : 'Ollama'}
          </button>
        ))}
      </div>

      {provider !== 'ollama' ? (
        <>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={provider === 'claude' ? 'sk-ant-...' : 'sk-...'}
            className="w-full px-3 py-2 border rounded text-sm font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">
            Stored in your browser only. Never sent to our servers — goes directly to {provider === 'claude' ? 'Anthropic' : 'OpenAI'} API.
          </p>
        </>
      ) : (
        <p className="text-sm text-gray-600">
          Make sure Ollama is running locally on port 11434.
          No API key needed.
        </p>
      )}
    </div>
  );
}
