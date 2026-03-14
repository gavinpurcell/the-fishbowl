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

  return (
    <div>
      <div className="label-mono mb-4">Your Idea</div>

      <textarea
        value={ideaText}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Describe your idea, project, or question. The more context, the better the feedback..."
        className="w-full h-40 rounded-xl resize-none text-sm p-4"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          outline: 'none',
        }}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className="mt-3 rounded-xl p-6 text-center transition-all duration-200"
        style={{
          border: `2px dashed ${isDragging ? 'var(--accent-gold)' : 'var(--border)'}`,
          background: isDragging ? 'var(--bg-elevated)' : 'transparent',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Drop .md or .txt files here, or{' '}
          <label className="cursor-pointer" style={{ color: 'var(--accent-gold)' }}>
            browse
            <input type="file" accept=".md,.txt" multiple onChange={handleFileSelect} className="hidden" />
          </label>
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>Up to 3 files. Obsidian notes work great.</p>
      </div>

      {fileError && <p className="text-xs mt-2" style={{ color: '#e74c4c' }}>{fileError}</p>}

      {ideaFiles.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {ideaFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-2 text-xs p-2.5 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{file.name}</span>
              <span style={{ color: 'var(--text-muted)' }}>{(file.content.length / 1000).toFixed(1)}k</span>
              <button onClick={() => onFilesChange(ideaFiles.filter((_, j) => j !== i))} style={{ color: 'var(--text-muted)' }}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
