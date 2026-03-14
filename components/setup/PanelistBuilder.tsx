'use client';

import { useState } from 'react';
import type { Panelist } from '@/engine/types';
import { createCustomPanelist, createPanelistFromTemplate } from '@/engine/panelist';
import { createProvider } from '@/providers';
import { useFishbowlStore } from '@/lib/store';

interface Props {
  panelists: Panelist[];
  onUpdate: (panelists: Panelist[]) => void;
}

const COLORS = ['#4a9a7a', '#e74c4c', '#4477ee', '#e44a9a', '#eea444', '#9a44ee', '#44aacc', '#cc7744'];

export default function PanelistBuilder({ panelists, onUpdate }: Props) {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const { provider: providerType, apiKey } = useFishbowlStore();

  const addPanelist = async () => {
    if (!newName.trim() || !newRole.trim()) return;
    if (panelists.length >= 5) return;

    let panelist: Panelist;

    if (apiKey && providerType !== 'ollama') {
      setIsExpanding(true);
      try {
        const provider = createProvider(providerType, apiKey);
        panelist = await createCustomPanelist(newName.trim(), newRole.trim(), newDesc.trim() || newRole.trim(), panelists.length, provider);
      } catch {
        panelist = createPanelistFromTemplate({ name: newName.trim(), role: newRole.trim(), description: newDesc.trim() || `Expert ${newRole.trim()}`, color: COLORS[panelists.length % COLORS.length] }, panelists.length);
      }
      setIsExpanding(false);
    } else {
      panelist = createPanelistFromTemplate({ name: newName.trim(), role: newRole.trim(), description: newDesc.trim() || `Expert ${newRole.trim()}`, color: COLORS[panelists.length % COLORS.length] }, panelists.length);
    }

    onUpdate([...panelists, panelist]);
    setNewName('');
    setNewRole('');
    setNewDesc('');
  };

  const removePanelist = (id: string) => onUpdate(panelists.filter((p) => p.id !== id));

  const startEditing = (p: Panelist) => { setEditingId(p.id); setEditPrompt(p.systemPrompt); };
  const savePrompt = () => {
    if (!editingId) return;
    onUpdate(panelists.map((p) => p.id === editingId ? { ...p, systemPrompt: editPrompt } : p));
    setEditingId(null);
  };

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
  };

  return (
    <div>
      <div className="label-mono mb-4">Your Panel</div>

      <div className="space-y-2 mb-4">
        {panelists.map((p) => (
          <div key={p.id} className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 p-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-600" style={{ backgroundColor: p.color + '25', color: p.color, border: `1px solid ${p.color}50` }}>
                {p.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-500" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                <span className="ml-2 text-sm" style={{ color: 'var(--text-muted)' }}>— {p.role}</span>
              </div>
              <button onClick={() => editingId === p.id ? setEditingId(null) : startEditing(p)} className="text-xs transition-colors" style={{ color: 'var(--accent-gold)' }}>
                {editingId === p.id ? 'Close' : 'Edit Prompt'}
              </button>
              <button onClick={() => removePanelist(p.id)} className="text-xs transition-colors" style={{ color: 'var(--text-muted)' }}>
                Remove
              </button>
            </div>
            {editingId === p.id ? (
              <div className="px-4 pb-4">
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  className="w-full h-48 rounded-lg resize-y font-mono text-xs p-3"
                  style={{ background: 'var(--bg-deep)', border: '1px solid var(--border)', color: 'var(--text-secondary)', outline: 'none' }}
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={savePrompt} className="px-3 py-1.5 rounded text-xs font-500" style={{ background: 'var(--accent-gold)', color: 'var(--bg-deep)' }}>Save</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded text-xs" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="px-4 pb-3">
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{p.description}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {panelists.length < 5 && (
        <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-light)' }}>
          <div className="label-mono mb-3">Add a panelist</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" style={inputStyle} />
            <input value={newRole} onChange={(e) => setNewRole(e.target.value)} placeholder="Role" style={inputStyle} />
          </div>
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Personality (optional — e.g., Data-driven, blunt, skeptical)" style={{ ...inputStyle, marginBottom: '12px' }} />
          <button
            onClick={addPanelist}
            disabled={!newName.trim() || !newRole.trim() || isExpanding}
            className="px-4 py-2 rounded-lg text-xs font-500 transition-all disabled:opacity-30"
            style={{ background: 'var(--accent-gold)', color: 'var(--bg-deep)' }}
          >
            {isExpanding ? 'Building persona...' : 'Add to Panel'}
          </button>
        </div>
      )}

      {panelists.length >= 5 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Maximum of 5 panelists.</p>}
      {panelists.length < 3 && panelists.length > 0 && (
        <p className="text-xs mt-2" style={{ color: 'var(--accent-warm)' }}>Add at least {3 - panelists.length} more (minimum 3).</p>
      )}
    </div>
  );
}
