import { Container, Graphics } from 'pixi.js';

/**
 * Animated "typing indicator" bubble that shows three dots bouncing
 * in a wave pattern. Displayed above a character who is about to speak.
 */
export class ThinkingIndicator extends Container {
  private bg: Graphics;
  private dots: Graphics[] = [];
  private animTime = 0;

  private readonly DOT_RADIUS = 3;
  private readonly DOT_SPACING = 10;
  private readonly DOT_COLOR = 0xf0c866;
  private readonly NUM_DOTS = 3;
  private readonly PILL_WIDTH = 50;
  private readonly PILL_HEIGHT = 24;
  private readonly BOUNCE_HEIGHT = 4;
  private readonly PHASE_OFFSET = 0.6;

  constructor() {
    super();
    this.visible = false;

    // Pill-shaped background
    this.bg = new Graphics();
    this.bg
      .roundRect(
        -this.PILL_WIDTH / 2,
        -this.PILL_HEIGHT / 2,
        this.PILL_WIDTH,
        this.PILL_HEIGHT,
        this.PILL_HEIGHT / 2, // fully rounded ends
      )
      .fill({ color: 0x241811, alpha: 0.7 });
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
    }
  }
}
