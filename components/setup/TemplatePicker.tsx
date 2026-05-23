'use client';

import Image from 'next/image';
import { PANEL_TEMPLATES } from '@/lib/templates';
import type { PanelTemplate } from '@/engine/types';

// Fallback palette for inhabitant borders — cycled by index
// (template panelists carry p.color, so this is used as a tint modifier only)
const INHABITANT_COLORS = ['#e85a9a', '#5ab8c4', '#9b6ee0', '#e85a4a'];

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
            className={`specimen-card specimen-hover animate-card-pop stagger-${i + 1} text-left w-full`}
            style={{ ['--brass-accent' as string]: 'var(--accent-gold)', cursor: 'pointer', padding: 0 }}
          >
            <div className="brass-plate">
              <div className="brass-screw" />
              <span className="brass-label">EXHIBIT · {String(i + 1).padStart(2, '0')}</span>
              <div className="brass-screw" />
            </div>

            <div className="p-4">
              <div
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: "'Silkscreen', monospace",
                  fontSize: '14px',
                  letterSpacing: '0.04em',
                }}
              >
                {template.name}
              </div>
              <div
                style={{
                  marginTop: '4px',
                  color: 'var(--text-muted)',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '9px',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                {template.panelists.length} specimens · curated panel
              </div>
              <p
                className="text-xs mt-2 leading-relaxed"
                style={{ color: 'var(--text-muted)' }}
              >
                {template.description}
              </p>

              {/* Inhabitant row — 4 mini portraits with color borders */}
              <div className="flex gap-1.5 mt-3">
                {template.panelists.slice(0, 4).map((p, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '28px',
                      height: '28px',
                      border: `2px solid ${p.color || INHABITANT_COLORS[idx % INHABITANT_COLORS.length]}`,
                      lineHeight: 0,
                    }}
                  >
                    <Image
                      src={`/sprites/portraits/char_${idx}_portrait.png`}
                      alt=""
                      width={24}
                      height={24}
                      style={{ imageRendering: 'pixelated', display: 'block', width: '100%', height: '100%' }}
                    />
                  </div>
                ))}
              </div>

              <div className="dashed-divider mt-3 pt-2 flex justify-between">
                <span
                  style={{
                    color: 'var(--accent-gold)',
                    fontFamily: "'Silkscreen', monospace",
                    fontSize: '9px',
                    letterSpacing: '0.06em',
                  }}
                >
                  ▸ ASSEMBLE PANEL
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
