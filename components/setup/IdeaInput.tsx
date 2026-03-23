'use client';

import { useState, useCallback } from 'react';
import type { FileContent } from '@/engine/types';
import { parseFiles } from '@/lib/fileParser';

interface Props {
  ideaText: string;
  ideaFiles: FileContent[];
  onTextChange: (text: string) => void;
  onFilesChange: (files: FileContent[]) => void;
}

export default function IdeaInput({ ideaText, ideaFiles, onTextChange, onFilesChange }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFilesWithFeedback = useCallback(async (files: FileList | File[]) => {
    setFileError(null);
    const fileArray = Array.from(files);
    const unsupported = fileArray.filter((f) => { const ext = f.name.split('.').pop()?.toLowerCase(); return ext !== 'md' && ext !== 'txt'; });
    if (unsupported.length > 0) {
      setFileError(`Unsupported: ${unsupported.map((f) => f.name).join(', ')}. Only .md and .txt for now.`);
    }
    const parsed = await parseFiles(fileArray);
    if (parsed.length > 0) onFilesChange([...ideaFiles, ...parsed].slice(0, 3));
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
    <div>
      <div className="section-header">
        <div className="label-mono" style={{ flexShrink: 0 }}>Mission Briefing</div>
        {hasContent && (
          <span
            className="text-[10px] font-500 px-2 py-0.5 rounded stamp-approved"
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
            Briefed
          </span>
        )}
      </div>

      {/* Mission briefing document — entire card is a drop target */}
      <div
        className="mission-briefing"
        style={{ position: 'relative' }}
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
            <span>Drop files here</span>
          </div>
        )}

        {/* Gold header bar with label */}
        <div
          className="px-4 py-2 flex items-center gap-2 relative z-[2]"
          style={{
            background: 'linear-gradient(180deg, var(--accent-gold) 0%, var(--accent-gold-dim) 100%)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <rect x="2" y="1" width="12" height="14" rx="1" stroke="#1a1714" strokeWidth="1.5" fill="none" />
            <line x1="5" y1="5" x2="11" y2="5" stroke="#1a1714" strokeWidth="1" />
            <line x1="5" y1="7.5" x2="11" y2="7.5" stroke="#1a1714" strokeWidth="1" />
            <line x1="5" y1="10" x2="9" y2="10" stroke="#1a1714" strokeWidth="1" />
          </svg>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--dark-surface)',
            }}
          >
            Your Idea
          </span>
          <div style={{ flex: 1 }} />
          {/* Character count */}
          {charCount > 0 && (
            <span
              className="mission-briefing-charcount"
              style={{
                color: isNearLimit ? 'var(--accent-warm)' : 'rgba(26, 23, 20, 0.45)',
              }}
            >
              {charCount.toLocaleString()}/{MAX_DISPLAY.toLocaleString()}
            </span>
          )}
        </div>

        {/* Textarea area */}
        <div className="p-4" style={{ background: 'var(--bg-card)' }}>
          <textarea
            value={ideaText}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="What do you want the panel to evaluate? Describe your startup idea, product feature, marketing campaign, creative concept... The more detail you give, the sharper the feedback."
            className="w-full h-36 resize-none text-sm leading-relaxed mission-briefing-textarea"
            maxLength={MAX_DISPLAY}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              outline: 'none',
              fontFamily: "'Outfit', system-ui, sans-serif",
            }}
          />
        </div>

        {/* File attachment area */}
        <div
          className="mission-briefing-files"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-surface)',
          }}
        >
          <div className="px-4 py-3">
            <div className="flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Drop .md or .txt files, or{' '}
                <label className="cursor-pointer" style={{ color: 'var(--accent-gold)' }}>
                  browse
                  <input type="file" accept=".md,.txt" multiple onChange={handleFileSelect} className="hidden" />
                </label>
              </p>
              <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                Up to 3 files
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
                  className="flex items-center gap-2 text-xs p-2 rounded-lg"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
