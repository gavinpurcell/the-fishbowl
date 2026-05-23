'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Panelist } from '@/engine/types';
import { createCustomPanelist, createCustomPanelistLocal, createPanelistFromTemplate } from '@/engine/panelist';
import { createProvider } from '@/providers';
import { useFishbowlStore } from '@/lib/store';
import { PANEL_TEMPLATES } from '@/lib/templates';

// Flat roster of all pre-built panelists, deduplicated by name
const ROSTER = PANEL_TEMPLATES.flatMap((t) => t.panelists).filter(
  (p, i, arr) => arr.findIndex((q) => q.name === p.name) === i
);

interface Props {
  panelists: Panelist[];
  onUpdate: (panelists: Panelist[]) => void;
}

export default function PanelistBuilder({ panelists, onUpdate }: Props) {
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const { provider: providerType, apiKey } = useFishbowlStore();

  const addPanelist = async () => {
    if (!newName.trim() || !newRole.trim()) return;
    if (panelists.length >= 4) return;

    let panelist: Panelist;

    if (apiKey) {
      setIsExpanding(true);
      try {
        const provider = createProvider(providerType, apiKey);
        panelist = await createCustomPanelist(newName.trim(), newRole.trim(), newDesc.trim() || newRole.trim(), panelists, provider);
      } catch {
        panelist = createCustomPanelistLocal({ name: newName.trim(), role: newRole.trim(), description: newDesc.trim() || `Expert ${newRole.trim()}`, color: '' }, panelists);
      }
      setIsExpanding(false);
    } else {
      panelist = createCustomPanelistLocal({ name: newName.trim(), role: newRole.trim(), description: newDesc.trim() || `Expert ${newRole.trim()}`, color: '' }, panelists);
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

  const addFromRoster = (rosterPanelist: typeof ROSTER[number]) => {
    if (panelists.length >= 4) return;
    const newP = createPanelistFromTemplate(
      { name: rosterPanelist.name, role: rosterPanelist.role, description: rosterPanelist.description, color: rosterPanelist.color },
      panelists
    );
    onUpdate([...panelists, newP]);
    setShowCustomForm(false);
  };

  // Available roster panelists (not already on the panel)
  const availableRoster = ROSTER.filter(
    (r) => !panelists.some((p) => p.name === r.name)
  );

  // Empty slots to show available seats (max 4)
  const emptySlots = Math.max(0, 4 - panelists.length);

  return (
    <div>
      <div className="section-header">
        <div className="label-mono" style={{ flexShrink: 0 }}>Your Panel</div>
        <span className="text-xs" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          {panelists.length}/4 seats
        </span>
      </div>

      {/* Character cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {panelists.map((p, i) => (
          <div
            key={p.id}
            className={`specimen-card specimen-hover animate-card-pop stagger-${i + 1}`}
            style={{ ['--brass-accent' as string]: p.color }}
          >
            {/* Brass plate header */}
            <div className="brass-plate">
              <div className="brass-screw" />
              <span className="brass-label">SPECIMEN · {String(i + 1).padStart(2, '0')} / 04</span>
              <span className="brass-marker">{p.name.charAt(0).toUpperCase()}</span>
              <div className="brass-screw" />
            </div>

            {/* Card body */}
            <div className="p-3">
              <div className="flex items-start gap-3">
                {/* Pixel-frame portrait */}
                <div className="pixel-frame">
                  <Image
                    src={`/sprites/portraits/char_${p.spriteIndex}_portrait.png`}
                    alt={`${p.name} portrait`}
                    width={56}
                    height={56}
                    style={{ imageRendering: 'pixelated', display: 'block' }}
                  />
                </div>

                {/* Name and role */}
                <div className="flex-1 min-w-0">
                  <div className="character-nameplate" style={{ color: 'var(--text-primary)' }}>
                    {p.name}
                  </div>
                  <div
                    className="mt-1"
                    style={{
                      color: p.color,
                      fontFamily: "'DM Mono', monospace",
                      fontSize: '9px',
                      letterSpacing: '0.16em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Genus: {p.role}
                  </div>
                </div>
              </div>

              {/* Description */}
              <p
                className="text-xs mt-2 leading-relaxed"
                style={{
                  color: 'var(--text-muted)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {p.description}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-2 dashed-divider">
                <button
                  onClick={() => editingId === p.id ? setEditingId(null) : startEditing(p)}
                  className="text-[10px] font-500 px-2 py-1 rounded transition-colors"
                  style={{
                    color: 'var(--accent-gold)',
                    background: editingId === p.id ? 'rgba(196, 154, 42, 0.1)' : 'transparent',
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                >
                  {editingId === p.id ? 'Close' : '▸ Annotate'}
                </button>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => removePanelist(p.id)}
                  className="text-[10px] px-2 py-1 rounded transition-colors"
                  style={{
                    color: 'var(--text-muted)',
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  Release
                </button>
              </div>
            </div>

            {/* Edit prompt panel — character backstory editor */}
            {editingId === p.id && (
              <div className="animate-slide-down" style={{ borderTop: `1px solid var(--border)` }}>
                <div className="prompt-editor-panel">
                  {/* Header label */}
                  <div className="prompt-editor-header">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      <line x1="5" y1="5.5" x2="11" y2="5.5" stroke="currentColor" strokeWidth="1" />
                      <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1" />
                      <line x1="5" y1="10.5" x2="8" y2="10.5" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    <span>System Prompt</span>
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="prompt-editor-textarea"
                  />

                  {/* Footer with actions */}
                  <div className="prompt-editor-footer">
                    <span className="prompt-editor-charcount">
                      {editPrompt.length.toLocaleString()} chars
                    </span>
                    <div style={{ flex: 1 }} />
                    <button
                      onClick={() => setEditingId(null)}
                      className="prompt-editor-btn-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={savePrompt}
                      className="prompt-editor-btn-save"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Empty slots showing minimum requirement */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="empty-slot">
            <div className="text-center">
              <div style={{ fontSize: '20px', color: 'var(--border)', marginBottom: '4px' }}>+</div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Seat {panelists.length + i + 1}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add panelist — roster picker + custom option */}
      {panelists.length < 4 && (
        <div className="add-panelist-card p-4">
          <div className="label-mono mb-3">Add a panelist</div>

          {/* Roster grid */}
          {!showCustomForm && availableRoster.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              {availableRoster.map((r) => (
                <button
                  key={r.name}
                  onClick={() => addFromRoster(r)}
                  className="text-left rounded-lg p-2.5 transition-all"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = r.color;
                    e.currentTarget.style.background = r.color + '08';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--bg-elevated)';
                  }}
                >
                  <div className="text-xs font-medium" style={{ color: 'var(--text-primary)', fontFamily: "'Silkscreen', monospace", fontSize: '10px' }}>
                    {r.name}
                  </div>
                  <div
                    className="text-[9px] mt-0.5"
                    style={{ color: r.color, fontFamily: "'DM Mono', monospace", letterSpacing: '0.04em', textTransform: 'uppercase' }}
                  >
                    {r.role}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Toggle to custom form */}
          {!showCustomForm ? (
            <button
              onClick={() => setShowCustomForm(true)}
              className="text-[11px] transition-colors"
              style={{ color: 'var(--accent-gold)', fontFamily: "'DM Mono', monospace" }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-amber)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--accent-gold)'}
            >
              + Create custom panelist
            </button>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name"
                  className="rounded-lg text-sm p-2.5"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    width: '100%',
                  }}
                />
                <input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="Role (e.g. UX Designer)"
                  className="rounded-lg text-sm p-2.5"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    width: '100%',
                  }}
                />
              </div>
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Personality (optional — e.g., Data-driven, blunt, skeptical)"
                className="rounded-lg text-sm p-2.5 mb-3"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  width: '100%',
                }}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={addPanelist}
                  disabled={!newName.trim() || !newRole.trim() || isExpanding}
                  className="px-4 py-2.5 rounded-lg text-xs font-500 transition-all disabled:opacity-30"
                  style={{
                    background: 'var(--accent-gold)',
                    color: 'var(--bg-deep)',
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {isExpanding ? 'Building persona...' : 'Add to Panel'}
                </button>
                <button
                  onClick={() => setShowCustomForm(false)}
                  className="text-[11px] transition-colors"
                  style={{ color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}
                >
                  Back to roster
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {panelists.length >= 4 && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Panel is full (4/4 seats).
        </p>
      )}
      {panelists.length < 3 && panelists.length > 0 && (
        <p className="text-xs mt-2" style={{ color: 'var(--accent-warm)' }}>
          Add at least {3 - panelists.length} more (minimum 3 for a panel).
        </p>
      )}
    </div>
  );
}
