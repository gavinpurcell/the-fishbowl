import { Container, Graphics, Text, TextStyle } from 'pixi.js';

/**
 * Speech bubble that appears above characters.
 * Supports streaming text (appendText) and auto-sizing.
 */
export class SpeechBubble extends Container {
  private bubble: Graphics;
  private textDisplay: Text;
  private fullText = '';
  private isStreaming = false;

  private readonly MAX_WIDTH = 280;
  private readonly PADDING = 12;
  private readonly TAIL_HEIGHT = 10;
  private readonly MIN_HEIGHT = 36;
  private readonly BORDER_RADIUS = 8;

  constructor() {
    super();

    // Start hidden
    this.visible = false;

    // Background bubble graphic
    this.bubble = new Graphics();
    this.addChild(this.bubble);

    // Text content
    this.textDisplay = new Text({
      text: '',
      style: new TextStyle({
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 12,
        fill: 0x333333,
        wordWrap: true,
        wordWrapWidth: this.MAX_WIDTH - this.PADDING * 2,
        lineHeight: 16,
      }),
    });
    this.textDisplay.anchor.set(0.5, 1);
    this.addChild(this.textDisplay);

    // Set pivot so position coordinates point to where tail meets character
    this.pivot.set(0, 0);
  }

  /** Show the bubble, optionally with initial text */
  show(text?: string): void {
    this.visible = true;
    this.fullText = text ?? '';
    this.isStreaming = !text; // if no text provided, assume streaming will follow
    this.textDisplay.text = this.fullText;
    this.redrawBubble();
  }

  /** Append a chunk of text (for streaming) */
  appendText(chunk: string): void {
    this.isStreaming = true;
    this.fullText += chunk;
    this.textDisplay.text = this.fullText;
    this.redrawBubble();
  }

  /** Mark streaming as complete */
  finishStreaming(): void {
    this.isStreaming = false;
  }

  /** Hide the bubble and clear text */
  hide(): void {
    this.visible = false;
    this.fullText = '';
    this.textDisplay.text = '';
    this.isStreaming = false;
  }

  private redrawBubble(): void {
    this.bubble.clear();
    this.bubble.removeChildren();

    if (!this.fullText) return;

    // Measure the text to size the bubble
    const textBounds = this.textDisplay.getBounds();
    const bubbleWidth = Math.min(
      Math.max(textBounds.width + this.PADDING * 2, 60),
      this.MAX_WIDTH
    );
    const bubbleHeight = Math.max(
      textBounds.height + this.PADDING * 2,
      this.MIN_HEIGHT
    );

    // Position text centered in bubble, above the tail
    this.textDisplay.position.set(0, -this.TAIL_HEIGHT - this.PADDING);

    // Draw bubble body (centered horizontally, above the tail point)
    const bx = -bubbleWidth / 2;
    const by = -this.TAIL_HEIGHT - bubbleHeight;

    // Shadow
    this.bubble.roundRect(bx + 2, by + 2, bubbleWidth, bubbleHeight, this.BORDER_RADIUS)
      .fill({ color: 0x000000, alpha: 0.08 });

    // Main bubble
    this.bubble.roundRect(bx, by, bubbleWidth, bubbleHeight, this.BORDER_RADIUS)
      .fill({ color: 0xffffff, alpha: 0.95 });

    // Border
    this.bubble.roundRect(bx, by, bubbleWidth, bubbleHeight, this.BORDER_RADIUS)
      .stroke({ color: 0xe0d8c8, width: 1.5 });

    // Tail — pointing down to character
    const tail = new Graphics();
    tail.moveTo(-6, -this.TAIL_HEIGHT)
      .lineTo(0, 0)
      .lineTo(6, -this.TAIL_HEIGHT)
      .closePath()
      .fill({ color: 0xffffff, alpha: 0.95 });
    // Tail border lines
    tail.moveTo(-6, -this.TAIL_HEIGHT)
      .lineTo(0, 0)
      .stroke({ color: 0xe0d8c8, width: 1.5 });
    tail.moveTo(0, 0)
      .lineTo(6, -this.TAIL_HEIGHT)
      .stroke({ color: 0xe0d8c8, width: 1.5 });
    this.bubble.addChild(tail);

    // Streaming indicator (blinking cursor)
    if (this.isStreaming) {
      const cursorAlpha = Math.sin(Date.now() * 0.005) > 0 ? 0.6 : 0;
      const cursor = new Graphics();
      cursor.rect(
        this.textDisplay.x + textBounds.width / 2 + 2,
        -this.TAIL_HEIGHT - this.PADDING - 2,
        2,
        12
      ).fill({ color: 0x666666, alpha: cursorAlpha });
      this.bubble.addChild(cursor);
    }
  }

  /** Call each frame to update streaming cursor animation */
  update(_delta: number): void {
    if (this.isStreaming && this.visible) {
      this.redrawBubble();
    }
  }
}
