import { Container, Graphics, Text, TextStyle } from 'pixi.js';

type TagAlign = 'left' | 'right' | 'center';

interface TagOptions {
  name: string;
  role: string;
  align?: TagAlign;
  accentColor?: string;
}

function parseColor(color: string): number {
  if (color.startsWith('#')) return parseInt(color.slice(1), 16);
  if (color.startsWith('0x')) return parseInt(color.slice(2), 16);
  return 0xc49a2a;
}

export class PanelistTag extends Container {
  private bg: Graphics;
  private accent: Graphics;
  private borderGraphics: Graphics;
  private nameText: Text;
  private roleText: Text;
  private align: TagAlign;

  constructor({ name, role, align = 'left', accentColor = '#c49a2a' }: TagOptions) {
    super();
    this.align = align;

    // Border drawn behind bg
    this.borderGraphics = new Graphics();
    this.addChild(this.borderGraphics);

    this.bg = new Graphics();
    this.addChild(this.bg);

    this.accent = new Graphics();
    this.addChild(this.accent);

    this.nameText = new Text({
      text: name.toUpperCase(),
      style: new TextStyle({
        fontFamily: "'Silkscreen', 'Courier New', monospace",
        fontSize: 11,
        fontWeight: '700',
        fill: 0xfff8e8,
        letterSpacing: 1.0,
      }),
    });
    this.addChild(this.nameText);

    this.roleText = new Text({
      text: role,
      style: new TextStyle({
        fontFamily: '"DM Mono", monospace',
        fontSize: 9,
        fill: 0xc8b898,
        letterSpacing: 1.0,
      }),
    });
    this.addChild(this.roleText);

    this.render(parseColor(accentColor));
  }

  private render(accentColor: number): void {
    const paddingX = 14;
    const paddingTop = 7;
    const gap = 3;
    const accentWidth = 3;
    const roleY = paddingTop + this.nameText.height + gap;
    const measuredWidth = Math.max(this.nameText.width, this.roleText.width);
    // Ensure tag is wide enough for longer names — Silkscreen at 11px with
    // letter-spacing 1 is roughly 9px per character.  Use a per-character
    // estimate as a floor so names are never truncated even if PixiJS measures
    // the text before the web font has fully loaded.
    const nameChars = this.nameText.text.length;
    const estimatedNameWidth = nameChars * 9;
    const contentWidth = Math.max(measuredWidth, estimatedNameWidth);
    const width = contentWidth + paddingX * 2 + accentWidth;
    const height = roleY + this.roleText.height + 7;
    const left = this.align === 'right' ? -width : this.align === 'center' ? -width / 2 : 0;

    // Outer border (1px darker frame)
    this.borderGraphics.clear();
    this.borderGraphics.roundRect(left - 1, -1, width + 2, height + 2, 4)
      .fill({ color: 0x000000, alpha: 0.35 });

    // Background panel
    this.bg.clear();
    this.bg.roundRect(left, 0, width, height, 3)
      .fill({ color: 0x1e150e, alpha: 0.82 });

    // Accent stripe — clean left edge, no rounding
    this.accent.clear();
    this.accent.rect(left, 0, accentWidth, height)
      .fill({ color: accentColor, alpha: 0.95 });
    // Tiny highlight on top half of stripe
    this.accent.rect(left, 0, accentWidth, height / 2)
      .fill({ color: 0xffffff, alpha: 0.12 });

    const textLeft = left + accentWidth + paddingX;
    this.nameText.position.set(textLeft, paddingTop);
    this.roleText.position.set(textLeft, roleY);
  }
}
