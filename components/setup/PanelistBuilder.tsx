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
  const { provider: providerType, apiKey } = useFishbowlStore();

  const addPanelist = async () => {
    if (!newName.trim() || !newRole.trim()) return;
    if (panelists.length >= 5) return;

    let panelist: Panelist;

    if (apiKey && providerType !== 'ollama') {
      setIsExpanding(true);
      try {
        const provider = createProvider(providerType, apiKey);
        panelist = await createCustomPanelist(
          newName.trim(),
          newRole.trim(),
          newDesc.trim() || newRole.trim(),
          panelists.length,
          provider
        );
      } catch {
        panelist = createPanelistFromTemplate(
          {
            name: newName.trim(),
            role: newRole.trim(),
            description: newDesc.trim() || `Expert ${newRole.trim()}`,
            color: COLORS[panelists.length % COLORS.length],
          },
          panelists.length
        );
      }
      setIsExpanding(false);
    } else {
      panelist = createPanelistFromTemplate(
        {
          name: newName.trim(),
          role: newRole.trim(),
          description: newDesc.trim() || `Expert ${newRole.trim()}`,
          color: COLORS[panelists.length % COLORS.length],
        },
        panelists.length
      );
    }

    onUpdate([...panelists, panelist]);
    setNewName('');
    setNewRole('');
    setNewDesc('');
  };

  const removePanelist = (id: string) => {
    onUpdate(panelists.filter((p) => p.id !== id));
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Your Panel</h2>

      <div className="space-y-2 mb-4">
        {panelists.map((p) => (
          <div key={p.id} className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
            <div className="flex-1 min-w-0">
              <span className="font-medium">{p.name}</span>
              <span className="text-gray-500 ml-2">— {p.role}</span>
            </div>
            <button
              onClick={() => removePanelist(p.id)}
              className="text-red-400 hover:text-red-600 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {panelists.length < 5 && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <h3 className="text-sm font-medium mb-3">Add a panelist</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g., Sarah)"
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="Role (e.g., Growth Expert)"
              className="px-3 py-2 border rounded text-sm"
            />
          </div>
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Personality (e.g., Data-driven, blunt, allergic to generic advice)"
            className="w-full px-3 py-2 border rounded text-sm mb-3"
          />
          <button
            onClick={addPanelist}
            disabled={!newName.trim() || !newRole.trim() || isExpanding}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExpanding ? 'Building persona...' : 'Add to Panel'}
          </button>
        </div>
      )}

      {panelists.length >= 5 && (
        <p className="text-sm text-gray-500">Maximum of 5 panelists reached.</p>
      )}

      {panelists.length < 3 && panelists.length > 0 && (
        <p className="text-sm text-amber-600 mt-2">Add at least {3 - panelists.length} more panelist{3 - panelists.length > 1 ? 's' : ''} (minimum 3).</p>
      )}
    </div>
  );
}
