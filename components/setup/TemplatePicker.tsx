'use client';

import { PANEL_TEMPLATES } from '@/lib/templates';
import type { PanelTemplate } from '@/engine/types';

interface Props {
  onSelect: (template: PanelTemplate) => void;
}

export default function TemplatePicker({ onSelect }: Props) {
  return (
    <div>
      <div className="label-mono mb-4">Choose a Panel</div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PANEL_TEMPLATES.map((template, i) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={`group text-left p-5 rounded-xl transition-all duration-200 animate-fade-in`}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              animationDelay: `${i * 0.08}s`,
              opacity: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent-gold)';
              e.currentTarget.style.background = 'var(--bg-elevated)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--bg-surface)';
            }}
          >
            <h3 className="font-600 text-base" style={{ color: 'var(--text-primary)' }}>
              {template.name}
            </h3>
            <p className="text-sm mt-1.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {template.description}
            </p>
            <div className="flex gap-1.5 mt-4 flex-wrap">
              {template.panelists.map((p) => (
                <span
                  key={p.name}
                  className="text-[10px] px-2 py-0.5 rounded-full font-500"
                  style={{
                    backgroundColor: p.color + '20',
                    color: p.color,
                    border: `1px solid ${p.color}40`,
                  }}
                >
                  {p.name}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
