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
      <div
        className="rounded-xl p-4"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
        }}
      >
        {provider !== 'ollama' && provider !== 'claude-code' ? (
          <>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder={provider === 'claude' ? 'sk-ant-...' : 'sk-...'}
              className="w-full rounded-lg text-sm font-mono p-3"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
              Stored in your browser only. Sent directly to {provider === 'claude' ? 'Anthropic' : 'OpenAI'}.
            </p>

            <div className="mt-3">
              <div className="label-mono mb-2">Model</div>
              <select
                value={modelId}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full rounded-lg text-sm p-3"
                style={{
                  background: 'var(--bg-elevated)',
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
              Requires <code style={{ background: 'var(--bg-deep)', padding: '1px 4px', borderRadius: '3px' }}>claude</code> CLI installed and logged in.
            </p>
            <div className="mt-3">
              <div className="label-mono mb-2">Model</div>
              <select
                value={modelId}
                onChange={(e) => onModelChange(e.target.value)}
                className="w-full rounded-lg text-sm p-3"
                style={{
                  background: 'var(--bg-elevated)',
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
    </div>
  );
}
