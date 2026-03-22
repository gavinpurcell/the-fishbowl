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
            {/* Gold accent bar */}
            <div className="template-card-accent" />

            <div className="template-card-body">
              {/* Team comp label */}
              <div className="template-card-label">Team Comp</div>

              {/* Template name in Silkscreen */}
              <h3 className="template-card-name">
                {template.name}
              </h3>

              {/* Description */}
              <p className="template-card-desc">
                {template.description}
              </p>

              {/* Character portrait lineup */}
              <div className="template-portrait-row">
                {template.panelists.map((p, pi) => (
                  <div key={p.name} className="flex flex-col items-center">
                    <div
                      className="template-portrait"
                      style={{
                        borderColor: p.color + '60',
                        background: p.color + '12',
                      }}
                    >
                      <Image
                        src={`/sprites/portraits/char_${pi % 8}_portrait.png`}
                        alt={p.name}
                        width={40}
                        height={40}
                        style={{
                          imageRendering: 'pixelated',
                        }}
                      />
                    </div>
                    <span className="template-portrait-name">{p.name}</span>
                  </div>
                ))}

                {/* Expert count */}
                <div className="template-expert-count">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.5 }}>
                    <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  </svg>
                  {template.panelists.length}
                </div>
              </div>

              {/* Role badges */}
              <div className="flex gap-1.5 flex-wrap">
                {template.panelists.map((p) => (
                  <span
                    key={p.name}
                    className="role-badge"
                    style={{
                      backgroundColor: p.color + '12',
                      color: p.color,
                      border: `1px solid ${p.color}25`,
                    }}
                  >
                    {p.role}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
