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

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const parsed = await parseFiles(e.dataTransfer.files);
      onFilesChange([...ideaFiles, ...parsed].slice(0, 3));
    },
    [ideaFiles, onFilesChange]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const parsed = await parseFiles(e.target.files);
      onFilesChange([...ideaFiles, ...parsed].slice(0, 3));
    },
    [ideaFiles, onFilesChange]
  );

  const removeFile = (index: number) => {
    onFilesChange(ideaFiles.filter((_, i) => i !== index));
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Your Idea</h2>

      <textarea
        value={ideaText}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Describe your idea, project, or question. The more context you give, the better the feedback..."
        className="w-full h-40 px-4 py-3 border rounded-lg resize-none text-sm"
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`mt-3 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <p className="text-sm text-gray-500">
          Drop .md or .txt files here, or{' '}
          <label className="text-blue-600 cursor-pointer hover:underline">
            browse
            <input type="file" accept=".md,.txt" multiple onChange={handleFileSelect} className="hidden" />
          </label>
        </p>
        <p className="text-xs text-gray-400 mt-1">Up to 3 files. Obsidian notes work great.</p>
      </div>

      {ideaFiles.length > 0 && (
        <div className="mt-3 space-y-2">
          {ideaFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
              <span className="flex-1 truncate">{file.name}</span>
              <span className="text-gray-400">{(file.content.length / 1000).toFixed(1)}k chars</span>
              <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-600">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
