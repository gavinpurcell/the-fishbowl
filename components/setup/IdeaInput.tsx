'use client';

import { useState, useCallback } from 'react';
import type { FileContent } from '@/engine/types';
import { parseFiles } from '@/lib/fileParser';
import { useFishbowlStore } from '@/lib/store';
import { HOSTED_MODEL_ID } from '@/lib/hostedSession';

interface Props {
  ideaText: string;
  ideaFiles: FileContent[];
  onTextChange: (text: string) => void;
  onFilesChange: (files: FileContent[]) => void;
}

const SUGGEST_PROMPT = `Read the document(s) below and extract a single short topic line — the kind of one-sentence pitch a person would put in a "what should the panel evaluate?" box.

Rules:
- Output ONE sentence, max ~15 words.
- No preamble, no quotes around it, no "Topic:" prefix. Just the sentence.
- Use plain language. No marketing fluff.
- Examples of good output:
    "Pre-seed AI dog walker for urban professionals"
    "Series B SaaS pricing redesign for mid-market customers"
    "Should I send this resignation email tomorrow"

Documents:`;

export default function IdeaInput({ ideaText, ideaFiles, onTextChange, onFilesChange }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [flashingFiles, setFlashingFiles] = useState<Set<string>>(new Set());
  const [isSuggesting, setIsSuggesting] = useState(false);

  const apiKey = useFishbowlStore((s) => s.apiKey);
  const provider = useFishbowlStore((s) => s.provider);
  const hostedSessionToken = useFishbowlStore((s) => s.hostedSessionToken);
  const sessionId = useFishbowlStore((s) => s.sessionId);
  const isHosted = process.env.NEXT_PUBLIC_HOSTED_MODE === 'true';

  const handleSuggestTopic = useCallback(async () => {
    if (ideaFiles.length === 0 || isSuggesting) return;
    setIsSuggesting(true);
    setFileError(null);

    const documentBlock = ideaFiles
      .map((f) => `=== ${f.name} ===\n${f.content.slice(0, 12000)}`)
      .join('\n\n');

    try {
      const body: Record<string, unknown> = {
        messages: [
          { role: 'user', content: `${SUGGEST_PROMPT}\n\n${documentBlock}` },
        ],
        provider: 'claude',
        // Hosted mode only allows Sonnet; BYOK can use Haiku for speed/cost.
        modelId: isHosted ? HOSTED_MODEL_ID : 'claude-haiku-4-5-20251001',
        stream: false,
      };
      if (isHosted) {
        body.sessionId = sessionId;
        body.hostedSessionToken = hostedSessionToken;
      } else {
        body.apiKey = apiKey;
      }

      const res = await fetch('/api/llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Suggestion failed.' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      // Non-streaming Claude API response shape:
      // { content: [{ type: 'text', text: '...' }, ...], usage: {...}, ... }
      const data = await res.json();
      const textBlock = Array.isArray(data?.content)
        ? data.content.find((b: { type?: string }) => b?.type === 'text')
        : null;
      const text = (textBlock?.text || '').toString().trim();
      if (text) {
        onTextChange(text.replace(/^["']|["']$/g, '').replace(/\.$/, ''));
      } else {
        setFileError("Couldn't extract a topic from the evidence.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Suggestion failed.';
      setFileError(`Suggest topic: ${message}`);
    } finally {
      setIsSuggesting(false);
    }
  }, [ideaFiles, isSuggesting, isHosted, sessionId, hostedSessionToken, apiKey, onTextChange]);

  // Suppress unused-var warning for provider — kept in case future expansion routes to other providers.
  void provider;

  const handleFilesWithFeedback = useCallback(async (files: FileList | File[]) => {
    setFileError(null);
    const fileArray = Array.from(files);
    const supported = new Set(['md', 'txt', 'pdf']);
    const unsupported = fileArray.filter((f) => { const ext = f.name.split('.').pop()?.toLowerCase(); return !ext || !supported.has(ext); });

    const messages: string[] = [];
    if (unsupported.length > 0) {
      messages.push(`Unsupported: ${unsupported.map((f) => f.name).join(', ')}. Supported: .pdf, .md, .txt`);
    }

    const { files: parsed, errors } = await parseFiles(fileArray);
    if (errors.length > 0) {
      messages.push(...errors.map((e) => `Couldn't read ${e.name}: ${e.message}`));
    }
    if (messages.length > 0) setFileError(messages.join(' • '));

    if (parsed.length > 0) {
      onFilesChange([...ideaFiles, ...parsed].slice(0, 3));
      const newNames = parsed.map((f) => f.name);
      setFlashingFiles((prev) => new Set([...prev, ...newNames]));
      setTimeout(() => {
        setFlashingFiles((prev) => {
          const next = new Set(prev);
          newNames.forEach((n) => next.delete(n));
          return next;
        });
      }, 1500);
    }
  }, [ideaFiles, onFilesChange]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    await handleFilesWithFeedback(e.dataTransfer.files);
  }, [handleFilesWithFeedback]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    await handleFilesWithFeedback(e.target.files);
  }, [handleFilesWithFeedback]);

  const hasContent = !!(ideaText.trim() || ideaFiles.length > 0);
  const WARN_THRESHOLD = 1800;
  const MAX_DISPLAY = 2000;
  const charCount = ideaText.length;
  const isNearLimit = charCount >= WARN_THRESHOLD;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only set false if we're leaving the card entirely (not entering a child)
    const relatedTarget = e.relatedTarget as Node | null;
    const currentTarget = e.currentTarget as Node;
    if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  return (
    <div
      className="specimen-card"
      style={{
        position: 'relative',
        ['--brass-accent' as string]: 'var(--accent-gold)',
      }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Full-card drag overlay */}
      {isDragging && (
        <div className="mission-briefing-drag-overlay">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ marginBottom: '8px' }}>
            <path d="M12 3v14M5 10l7 7 7-7" stroke="var(--accent-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Drop evidence here</span>
        </div>
      )}

      {/* Brass plate header */}
      <div className="brass-plate" style={{ position: 'relative', zIndex: 2 }}>
        <div className="brass-screw" />
        <span className="brass-label">OBSERVATION REQUEST · 01</span>
        <span className="brass-marker-sm">{hasContent ? 'READY' : 'DRAFT'}</span>
        <div className="brass-screw" />
      </div>

      {/* Subject section */}
      <div className="p-4" style={{ background: 'var(--bg-card)' }}>
        <div
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '9px',
            color: 'var(--accent-gold)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          ▸ The subject
        </div>
        <textarea
          value={ideaText}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="What do you want the panel to evaluate? Describe your startup idea, product feature, marketing campaign, creative concept..."
          className="w-full h-36 resize-none text-sm leading-relaxed mission-briefing-textarea"
          aria-label="Your topic or pitch"
          maxLength={MAX_DISPLAY}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            outline: 'none',
            fontFamily: "'Outfit', system-ui, sans-serif",
          }}
        />
        {/* Char count */}
        {charCount > 0 && (
          <div
            className="mission-briefing-charcount text-right"
            style={{
              color: isNearLimit ? 'var(--accent-warm)' : 'var(--text-muted)',
              fontFamily: "'DM Mono', monospace",
              fontSize: '9px',
              letterSpacing: '0.06em',
            }}
          >
            {charCount.toLocaleString()}/{MAX_DISPLAY.toLocaleString()}
          </div>
        )}
      </div>

      {/* Evidence section */}
      <div className="dashed-divider" style={{ background: 'var(--bg-surface)' }}>
        <div className="px-4 py-3">
          <div
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '9px',
              color: 'var(--accent-gold)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            ▸ Evidence (optional)
          </div>
          <div className="flex items-center gap-2">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Submit .pdf, .md, or .txt — or{' '}
              <label className="cursor-pointer" style={{ color: 'var(--accent-gold)' }}>
                browse
                <input type="file" accept=".pdf,.md,.txt" multiple onChange={handleFileSelect} className="hidden" />
              </label>
            </p>
            <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              Up to 3 specimens
            </span>
          </div>
        </div>

        {fileError && (
          <p className="text-xs px-4 pb-2" style={{ color: 'var(--accent-red)' }}>{fileError}</p>
        )}

        {ideaFiles.length > 0 && (
          <div className="px-4 pb-3 space-y-1.5">
            {ideaFiles.map((file, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-xs p-2 rounded-lg ${flashingFiles.has(file.name) ? 'file-row-flash' : ''}`}
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                  <rect x="3" y="2" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1" fill="none" />
                  <line x1="5" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="0.75" />
                  <line x1="5" y1="8" x2="9" y2="8" stroke="currentColor" strokeWidth="0.75" />
                </svg>
                <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{(file.content.length / 1000).toFixed(1)}k</span>
                <button
                  onClick={() => onFilesChange(ideaFiles.filter((_, j) => j !== i))}
                  className="text-[10px] transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  Remove
                </button>
              </div>
            ))}

            {/* Suggest topic from evidence — only shown when files are present */}
            <button
              onClick={handleSuggestTopic}
              disabled={isSuggesting}
              className="w-full text-xs p-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              style={{
                background: 'transparent',
                border: '1px dashed rgba(196, 154, 42, 0.4)',
                color: isSuggesting ? 'var(--text-muted)' : 'var(--accent-gold)',
                cursor: isSuggesting ? 'wait' : 'pointer',
                fontFamily: "'DM Mono', monospace",
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontSize: '10px',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M8 1.5l1.5 4 4 1.5-4 1.5L8 12.5l-1.5-4-4-1.5 4-1.5L8 1.5z" fill="currentColor" opacity="0.85" />
              </svg>
              {isSuggesting ? 'Reading evidence…' : ideaText.trim()
                ? 'Replace subject with evidence summary'
                : 'Suggest topic from evidence'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
