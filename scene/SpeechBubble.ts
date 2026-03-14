import { Container, Graphics, Text, TextStyle } from 'pixi.js';

/**
 * Speech bubble that appears above characters.
 * Supports streaming text (appendText) and auto-sizing.
 */
export class SpeechBubble extends Container {
  private bubble: Graphics;
  private tail: Graphics;
  private textDisplay: Text;
  private fullText = '';
  private isStreaming = false;
  private dirty = false;

  private readonly MAX_WIDTH = 260;
  private readonly PADDING = 10;
  private readonly TAIL_HEIGHT = 8;

  constructor() {
    super();
    this.visible = false;

    // Bubble background
    this.bubble = new Graphics();
    this.addChild(this.bubble);

    // Tail (drawn once, reused)
    this.tail = new Graphics();
    this.tail.moveTo(-5, 0).lineTo(0, this.TAIL_HEIGHT).lineTo(5, 0).closePath()
      .fill({ color: 0xffffff });
    this.addChild(this.tail);

    // Text
    this.textDisplay = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 11,
        fill: 0x333333,
        wordWrap: true,
        wordWrapWidth: this.MAX_WIDTH - this.PADDING * 2,
        lineHeight: 15,
      }),
    });
    this.addChild(this.textDisplay);
  }

  show(text?: string): void {
    this.visible = true;
    this.fullText = text ?? '';
    this.isStreaming = true;
    this.textDisplay.text = this.fullText || ' '; // space prevents zero-height
    this.dirty = true;
  }

  appendText(chunk: string): void {
    this.fullText += chunk;
    this.textDisplay.text = this.fullText;
    this.dirty = true;
  }

  finishStreaming(): void {
    this.isStreaming = false;
  }

  hide(): void {
    this.visible = false;
    this.fullText = '';
    this.textDisplay.text = '';
    this.isStreaming = false;
  }

  private layout(): void {
    const textW = Math.min(this.textDisplay.width + this.PADDING * 2, this.MAX_WIDTH);
    const textH = this.textDisplay.height + this.PADDING * 2;

    // Position text inside bubble
    this.textDisplay.position.set(
      -textW / 2 + this.PADDING,
      -this.TAIL_HEIGHT - textH + this.PADDING
    );

    // Draw bubble background
    this.bubble.clear();
    this.bubble.roundRect(-textW / 2, -this.TAIL_HEIGHT - textH, textW, textH, 6)
      .fill({ color: 0xffffff, alpha: 0.95 })
      .stroke({ color: 0xddd8d0, width: 1 });

    // Position tail at bottom center
    this.tail.position.set(0, -this.TAIL_HEIGHT);
  }

  update(_delta: number): void {
    if (this.dirty && this.visible) {
      this.layout();
      this.dirty = false;
    }
  }
}
