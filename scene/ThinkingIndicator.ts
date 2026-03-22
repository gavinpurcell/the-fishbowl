import { Container, Graphics } from 'pixi.js';

/**
 * Animated "typing indicator" bubble that shows three dots bouncing
 * in a wave pattern. Displayed above a character who is about to speak.
 * Matches the pixel-art RPG dialog box aesthetic of SpeechBubble.
 */
export class ThinkingIndicator extends Container {
  private bg: Graphics;
  private borderOuter: Graphics;
  private dots: Graphics[] = [];
  private animTime = 0;

  private readonly DOT_RADIUS = 3;
  private readonly DOT_SPACING = 10;
  private readonly DOT_COLOR = 0xe8c44a;
  private readonly NUM_DOTS = 3;
  private readonly PILL_WIDTH = 50;
  private readonly PILL_HEIGHT = 26;
  private readonly BOUNCE_HEIGHT = 4;
  private readonly PHASE_OFFSET = 0.6;
  private readonly BORDER_COLOR = 0x5a4a3a;
  private readonly BG_COLOR = 0x1e150e;

  constructor() {
    super();
    this.visible = false;

    // Outer border frame
    this.borderOuter = new Graphics();
    this.borderOuter
      .roundRect(
        -this.PILL_WIDTH / 2 - 2,
        -this.PILL_HEIGHT / 2 - 2,
        this.PILL_WIDTH + 4,
        this.PILL_HEIGHT + 4,
        (this.PILL_HEIGHT + 4) / 2,
      )
      .fill({ color: this.BORDER_COLOR, alpha: 0.8 });
    this.addChild(this.borderOuter);

    // Dark pill-shaped background
    this.bg = new Graphics();
    this.bg
      .roundRect(
        -this.PILL_WIDTH / 2,
        -this.PILL_HEIGHT / 2,
        this.PILL_WIDTH,
        this.PILL_HEIGHT,
        this.PILL_HEIGHT / 2, // fully rounded ends
      )
      .fill({ color: this.BG_COLOR, alpha: 0.78 });
    this.addChild(this.bg);

    // Three dots, centered horizontally inside the pill
    const totalDotsWidth = (this.NUM_DOTS - 1) * this.DOT_SPACING;
    const startX = -totalDotsWidth / 2;

    for (let i = 0; i < this.NUM_DOTS; i++) {
      const dot = new Graphics();
      dot.circle(0, 0, this.DOT_RADIUS).fill({ color: this.DOT_COLOR });
      dot.position.set(startX + i * this.DOT_SPACING, 0);
      this.addChild(dot);
      this.dots.push(dot);
    }
  }

  show(): void {
    this.visible = true;
    this.animTime = 0;
  }

  hide(): void {
    this.visible = false;
  }

  update(delta: number): void {
    if (!this.visible) return;

    this.animTime += delta * 0.08;

    for (let i = 0; i < this.dots.length; i++) {
      const phase = this.animTime + i * this.PHASE_OFFSET;
      // Use sin to create a smooth bounce; clamp to only move upward
      const bounce = Math.sin(phase * 2.5);
      this.dots[i].y = -Math.max(0, bounce) * this.BOUNCE_HEIGHT;

      // Subtle alpha pulse on each dot
      const alpha = 0.7 + 0.3 * Math.max(0, bounce);
      this.dots[i].alpha = alpha;
    }
  }
}
