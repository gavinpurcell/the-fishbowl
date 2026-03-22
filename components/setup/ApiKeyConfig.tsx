'use client';

import { useEffect } from 'react';
import type { ProviderType } from '@/engine/types';
import { getModelsForProvider } from '@/lib/models';

interface Props {
  provider: ProviderType;
  apiKey: string;
  modelId: string;
  onProviderChange: (provider: ProviderType) => void;
  onApiKeyChange: (key: string) => void;
  onModelChange: (modelId: string) => void;
}

export default function ApiKeyConfig({ provider, apiKey, modelId, onProviderChange, onApiKeyChange, onModelChange }: Props) {
  useEffect(() => {
    const savedKey = localStorage.getItem(`fishbowl-apikey-${provider}`);
    if (savedKey && !apiKey) onApiKeyChange(savedKey);
  }, [provider]);

  useEffect(() => {
    if (apiKey) localStorage.setItem(`fishbowl-apikey-${provider}`, apiKey);
  }, [apiKey, provider]);

  const models = getModelsForProvider(provider);

  return (
    <div>
      <div className="label-mono mb-4">API Key</div>

      <div className="flex flex-wrap gap-2 mb-3">
        {(['claude', 'openai', 'claude-code', 'ollama'] as ProviderType[]).map((p) => (
          <button
            key={p}
            onClick={() => onProviderChange(p)}
            className="px-3 sm:px-4 py-2 rounded-lg text-xs font-500 transition-all"
            style={{
              background: provider === p ? 'var(--accent-gold)' : 'var(--bg-surface)',
              color: provider === p ? 'var(--bg-deep)' : 'var(--text-secondary)',
              border: `1px solid ${provider === p ? 'var(--accent-gold)' : 'var(--border)'}`,
            }}
          >
            {p === 'claude' ? 'Claude' : p === 'openai' ? 'OpenAI' : p === 'claude-code' ? 'Claude Max' : 'Ollama'}
          </button>
        ))}
      </div>

      {provider !== 'ollama' && provider !== 'claude-code' ? (
        <>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={provider === 'claude' ? 'sk-ant-...' : 'sk-...'}
            className="w-full rounded-lg text-sm font-mono p-3"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Stored in your browser only. Goes directly to {provider === 'claude' ? 'Anthropic' : 'OpenAI'}.
          </p>

          <div className="mt-4">
            <div className="label-mono mb-2">Model</div>
            <select
              value={modelId}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full rounded-lg text-sm p-3"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — ${m.inputPer1M}/{m.outputPer1M} per 1M tokens
                </option>
              ))}
            </select>
          </div>
        </>
      ) : provider === 'claude-code' ? (
        <>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Uses your Claude Max subscription via Claude Code CLI. No API key needed.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Requires <code style={{ background: 'var(--bg-deep)', padding: '1px 4px', borderRadius: '3px' }}>claude</code> CLI installed and logged in. Run <code style={{ background: 'var(--bg-deep)', padding: '1px 4px', borderRadius: '3px' }}>claude /login</code> if needed.
          </p>
          <div className="mt-4">
            <div className="label-mono mb-2">Model</div>
            <select
              value={modelId}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full rounded-lg text-sm p-3"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — included with Max subscription
                </option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Make sure Ollama is running on port 11434. No key needed.
        </p>
      )}
    </div>
  );
}
