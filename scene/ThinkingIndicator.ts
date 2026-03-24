import { Container, Graphics } from 'pixi.js';

/**
 * Animated "typing indicator" bubble that shows three dots bouncing
 * in a wave pattern. Displayed above a character who is about to speak.
 * Matches the pixel-art RPG dialog box aesthetic of SpeechBubble.
 */
export class ThinkingIndicator extends Container {
  private bg: Graphics;
  private borderOuter: Graphics;
  private dotsGraphics: Graphics;
  private animTime = 0;

  private readonly DOT_RADIUS = 3;
  private readonly DOT_SPACING = 10;
  private readonly DOT_COLOR = 0xe8c44a;
  private readonly NUM_DOTS = 3;
  private readonly PILL_WIDTH = 50;
  private readonly PILL_HEIGHT = 26;
  private readonly BOUNCE_HEIGHT = 8;
  private readonly PHASE_OFFSET = 0.8;
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

    // Single Graphics object for all dots — redrawn each frame for animation
    this.dotsGraphics = new Graphics();
    this.addChild(this.dotsGraphics);
    this.drawDots();
  }

  show(): void {
    this.visible = true;
    this.animTime = 0;
  }

  hide(): void {
    this.visible = false;
  }

  /** Redraw the 3 dots at their current animated positions */
  private drawDots(): void {
    // Remove old dots and create fresh Graphics to force PixiJS v8 re-render
    this.removeChild(this.dotsGraphics);
    this.dotsGraphics.destroy();
    this.dotsGraphics = new Graphics();
    this.addChild(this.dotsGraphics);

    const totalDotsWidth = (this.NUM_DOTS - 1) * this.DOT_SPACING;
    const startX = -totalDotsWidth / 2;

    for (let i = 0; i < this.NUM_DOTS; i++) {
      const phase = this.animTime + i * this.PHASE_OFFSET;
      const bounce = Math.sin(phase * 3);
      const clampedBounce = Math.max(0, bounce);
      const x = startX + i * this.DOT_SPACING;
      const y = -clampedBounce * this.BOUNCE_HEIGHT;
      const alpha = 0.3 + 0.7 * clampedBounce;

      this.dotsGraphics.circle(x, y, this.DOT_RADIUS)
        .fill({ color: this.DOT_COLOR, alpha });
    }
  }

  update(delta: number): void {
    if (!this.visible) return;

    this.animTime += delta * 0.08;

    // Pulse the entire pill container — guaranteed visible in PixiJS v8
    // since Container.scale transforms always trigger re-render
    const pulse = 0.92 + Math.sin(this.animTime * 3.5) * 0.08;
    this.scale.set(pulse);

    this.drawDots();
  }
}
