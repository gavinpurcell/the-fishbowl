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

const PROVIDERS: { id: ProviderType; label: string }[] = [
  { id: 'claude', label: 'Claude' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'claude-code', label: 'Claude Max' },
  { id: 'ollama', label: 'Ollama' },
];

export default function ApiKeyConfig({ provider, apiKey, modelId, onProviderChange, onApiKeyChange, onModelChange }: Props) {
  useEffect(() => {
    const savedKey = localStorage.getItem(`fishbowl-apikey-${provider}`);
    if (savedKey && !apiKey) onApiKeyChange(savedKey);
  }, [provider]);

  useEffect(() => {
    if (apiKey) localStorage.setItem(`fishbowl-apikey-${provider}`, apiKey);
  }, [apiKey, provider]);

  const models = getModelsForProvider(provider);
  const hasKey = provider === 'ollama' || provider === 'claude-code' || !!apiKey.trim();

  return (
    <div>
      <div className="section-header">
        <div className="label-mono" style={{ flexShrink: 0 }}>AI Provider</div>
        {hasKey && (
          <span
            className="text-[10px] font-500 px-2 py-0.5 rounded"
            style={{
              color: 'var(--accent-gold)',
              background: 'rgba(196, 154, 42, 0.1)',
              border: '1px solid rgba(196, 154, 42, 0.2)',
              fontFamily: "'DM Mono', monospace",
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            Connected
          </span>
        )}
      </div>

      {/* Provider pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => onProviderChange(p.id)}
            className={`provider-pill ${provider === p.id ? 'active' : ''}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Provider-specific config */}
      <div className="dossier-panel">
        {provider !== 'ollama' && provider !== 'claude-code' ? (
          <>
            <div className="dossier-label">API Key</div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder={provider === 'claude' ? 'sk-ant-...' : 'sk-...'}
              className="dossier-input"
            />
            <p className="text-[10px] mt-2" style={{ color: '#5a5248', opacity: 0.8 }}>
              Stored in your browser only. Sent directly to {provider === 'claude' ? 'Anthropic' : 'OpenAI'}.
            </p>

            <div className="mt-4">
              <div className="dossier-label">Model</div>
              <select
                value={modelId}
                onChange={(e) => onModelChange(e.target.value)}
                className="dossier-select"
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
            <p className="text-xs" style={{ color: '#8a8078' }}>
              Uses your Claude Max subscription via Claude Code CLI. No API key needed.
            </p>
            <p className="text-[10px] mt-1" style={{ color: '#5a5248' }}>
              Requires <code style={{ background: 'var(--dark-surface)', padding: '1px 6px', borderRadius: '3px', color: 'var(--accent-gold-dim)', fontFamily: "'DM Mono', monospace", fontSize: '10px' }}>claude</code> CLI installed and logged in.
            </p>
            <div className="mt-4">
              <div className="dossier-label">Model</div>
              <select
                value={modelId}
                onChange={(e) => onModelChange(e.target.value)}
                className="dossier-select"
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
          <p className="text-xs" style={{ color: '#8a8078' }}>
            Make sure Ollama is running on port 11434. No key needed.
          </p>
        )}
      </div>
    </div>
  );
}
