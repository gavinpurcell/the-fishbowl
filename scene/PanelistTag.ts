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
  private nameText: Text;
  private roleText: Text;
  private align: TagAlign;

  constructor({ name, role, align = 'left', accentColor = '#c49a2a' }: TagOptions) {
    super();
    this.align = align;

    this.bg = new Graphics();
    this.addChild(this.bg);

    this.accent = new Graphics();
    this.addChild(this.accent);

    this.nameText = new Text({
      text: name,
      style: new TextStyle({
        fontFamily: 'Outfit, system-ui, sans-serif',
        fontSize: 15,
        fontWeight: '700',
        fill: 0xffffff,
        letterSpacing: 0.3,
      }),
    });
    this.addChild(this.nameText);

    this.roleText = new Text({
      text: role,
      style: new TextStyle({
        fontFamily: '"DM Mono", monospace',
        fontSize: 9,
        fill: 0xe9dcc4,
        letterSpacing: 1.2,
      }),
    });
    this.addChild(this.roleText);

    this.render(parseColor(accentColor));
  }

  private render(accentColor: number): void {
    const paddingX = 12;
    const paddingTop = 8;
    const gap = 4;
    const roleY = paddingTop + this.nameText.height + gap;
    const width = Math.max(this.nameText.width, this.roleText.width) + paddingX * 2;
    const height = roleY + this.roleText.height + 8;
    const left = this.align === 'right' ? -width : this.align === 'center' ? -width / 2 : 0;

    this.bg.clear();
    this.bg.roundRect(left, 0, width, height, 12)
      .fill({ color: 0x241811, alpha: 0.74 })
      .stroke({ color: 0xf5ddaf, alpha: 0.18, width: 1 });

    this.accent.clear();
    this.accent.roundRect(left, 0, 4, height, 12)
      .fill({ color: accentColor, alpha: 0.95 });

    this.nameText.position.set(left + paddingX + 4, paddingTop);
    this.roleText.position.set(left + paddingX + 4, roleY);
  }
}
