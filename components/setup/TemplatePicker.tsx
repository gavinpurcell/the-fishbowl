'use client';

import Image from 'next/image';
import { PANEL_TEMPLATES } from '@/lib/templates';
import type { PanelTemplate } from '@/engine/types';

interface Props {
  onSelect: (template: PanelTemplate) => void;
}

export default function TemplatePicker({ onSelect }: Props) {
  return (
    <div>
      <div className="section-header">
        <div className="label-mono" style={{ flexShrink: 0 }}>Choose Your Panel</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PANEL_TEMPLATES.map((template, i) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={`template-card animate-card-pop stagger-${i + 1}`}
          >
            {/* Template name */}
            <h3
              className="character-nameplate text-sm"
              style={{ color: 'var(--text-primary)' }}
            >
              {template.name}
            </h3>

            {/* Description */}
            <p
              className="text-xs mt-1.5 leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {template.description}
            </p>

            {/* Character portrait row */}
            <div className="flex items-center gap-1 mt-4">
              {template.panelists.map((p, pi) => (
                <div
                  key={p.name}
                  className="relative"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    border: `2px solid ${p.color}50`,
                    background: p.color + '15',
                  }}
                >
                  <Image
                    src={`/sprites/portraits/char_${pi % 8}_portrait.png`}
                    alt={p.name}
                    width={36}
                    height={36}
                    style={{
                      imageRendering: 'pixelated',
                    }}
                  />
                </div>
              ))}
              <div className="ml-2">
                <div className="text-[10px] font-500" style={{ color: 'var(--text-muted)' }}>
                  {template.panelists.length} experts
                </div>
              </div>
            </div>

            {/* Name tags */}
            <div className="flex gap-1 mt-2 flex-wrap">
              {template.panelists.map((p) => (
                <span
                  key={p.name}
                  className="role-badge"
                  style={{
                    backgroundColor: p.color + '15',
                    color: p.color,
                    border: `1px solid ${p.color}30`,
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
