'use client';

import { PANEL_TEMPLATES } from '@/lib/templates';
import type { PanelTemplate } from '@/engine/types';

interface Props {
  onSelect: (template: PanelTemplate) => void;
}

export default function TemplatePicker({ onSelect }: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Pick a Template</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PANEL_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className="text-left p-4 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <h3 className="font-semibold text-lg">{template.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              {template.panelists.map((p) => (
                <span
                  key={p.name}
                  className="text-xs px-2 py-1 rounded-full text-white"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name} — {p.role}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
